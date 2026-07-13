<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Especialidad } from "@/types/catalogo";
import type { Paciente } from "@/types/catalogo";
import type { EstadoPresupuesto, Presupuesto } from "@/types/finanzas";

const auth = useAuthStore();
const { rol, clinicaId, pacienteId: miPacienteId } = storeToRefs(auth);

const puedeGestionar = computed(() => rol.value === "admin" || rol.value === "secretaria");

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

const estadoBadge: Record<EstadoPresupuesto, string> = {
  pendiente: "badge--warning",
  aceptado: "badge--good",
  rechazado: "badge--critical",
};
const estadoLabel: Record<EstadoPresupuesto, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

const DIAS_PARA_VENCIDO = 30;
function estaVencido(p: Presupuesto) {
  if (p.estado !== "pendiente") return false;
  const dias = (Date.now() - p.emision.toDate().getTime()) / 86400000;
  return dias > DIAS_PARA_VENCIDO;
}

const presupuestos = ref<Presupuesto[]>([]);
const pacientes = ref<Paciente[]>([]);
const especialidades = ref<Especialidad[]>([]);
let unsubs: Array<() => void> = [];

onMounted(() => {
  const cid = clinicaId.value;
  if (!cid) return;

  const restriccionesPresupuestos = [where("clinicaId", "==", cid)];
  if (rol.value === "paciente" && miPacienteId.value) {
    restriccionesPresupuestos.push(where("pacienteId", "==", miPacienteId.value));
  }

  unsubs.push(
    onSnapshot(query(collection(db, "presupuestos"), ...restriccionesPresupuestos), (snap) => {
      presupuestos.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Presupuesto, "id">) }))
        .sort((a, b) => b.emision.toMillis() - a.emision.toMillis());
    })
  );

  if (puedeGestionar.value) {
    unsubs.push(
      onSnapshot(query(collection(db, "pacientes"), where("clinicaId", "==", cid)), (snap) => {
        pacientes.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Paciente, "id">) }));
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "especialidades"), where("clinicaId", "==", cid)), (snap) => {
        especialidades.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Especialidad, "id">) }));
      })
    );
  }
});

onUnmounted(() => unsubs.forEach((u) => u()));

function nombrePaciente(id: string) {
  return pacientes.value.find((p) => p.id === id)?.nombre ?? id;
}

// --- Formulario de nuevo/editado presupuesto ---
const editandoId = ref<string | null>(null);
const rutPaciente = ref("");
const especialidadId = ref("");
const tratamiento = ref("");
const monto = ref<number | null>(null);
const guardando = ref(false);
const error = ref("");

const pacienteEncontrado = computed(() => pacientes.value.find((p) => p.id === rutPaciente.value.trim()));

function limpiarFormulario() {
  editandoId.value = null;
  rutPaciente.value = "";
  especialidadId.value = "";
  tratamiento.value = "";
  monto.value = null;
  error.value = "";
}

function editarPresupuesto(presupuesto: Presupuesto) {
  editandoId.value = presupuesto.id;
  rutPaciente.value = presupuesto.pacienteId;
  especialidadId.value = presupuesto.especialidadId ?? "";
  tratamiento.value = presupuesto.tratamiento;
  monto.value = presupuesto.monto;
  error.value = "";
}

async function guardarPresupuesto() {
  error.value = "";
  const cid = clinicaId.value;
  const rut = rutPaciente.value.trim();
  const tratamientoLimpio = tratamiento.value.trim();

  if (!cid) return;
  if (!rut || !pacienteEncontrado.value) {
    error.value = "Ingresa el RUT de un paciente ya registrado (créalo primero en Pacientes o Agenda).";
    return;
  }
  if (!tratamientoLimpio) {
    error.value = "Describe el tratamiento o plan.";
    return;
  }
  if (!monto.value || monto.value <= 0) {
    error.value = "El monto debe ser mayor a 0.";
    return;
  }

  guardando.value = true;
  try {
    if (editandoId.value) {
      const actual = presupuestos.value.find((p) => p.id === editandoId.value);
      if (!actual) return;
      await updateDoc(doc(db, "presupuestos", editandoId.value), {
        clinicaId: cid,
        pacienteId: rut,
        ...(especialidadId.value ? { especialidadId: especialidadId.value } : {}),
        tratamiento: tratamientoLimpio,
        monto: monto.value,
        estado: actual.estado,
        emision: actual.emision,
      });
    } else {
      await addDoc(collection(db, "presupuestos"), {
        clinicaId: cid,
        pacienteId: rut,
        ...(especialidadId.value ? { especialidadId: especialidadId.value } : {}),
        tratamiento: tratamientoLimpio,
        monto: monto.value,
        estado: "pendiente",
        emision: Timestamp.now(),
      });
    }
    limpiarFormulario();
  } catch (e) {
    error.value = "No se pudo guardar el presupuesto. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}

async function cambiarEstado(presupuesto: Presupuesto, estado: EstadoPresupuesto) {
  await updateDoc(doc(db, "presupuestos", presupuesto.id), {
    clinicaId: presupuesto.clinicaId,
    pacienteId: presupuesto.pacienteId,
    ...(presupuesto.especialidadId ? { especialidadId: presupuesto.especialidadId } : {}),
    tratamiento: presupuesto.tratamiento,
    monto: presupuesto.monto,
    estado,
    emision: presupuesto.emision,
  });
}
</script>

<template>
  <main>
    <h1>Presupuestos</h1>

    <div v-if="puedeGestionar" class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoId ? "Editar presupuesto" : "Nuevo presupuesto" }}</h2>
      </div>

      <form @submit.prevent="guardarPresupuesto">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="max-width: 200px">
            <label for="presupuesto-rut">RUT del paciente</label>
            <input id="presupuesto-rut" v-model="rutPaciente" type="text" placeholder="Ej: 12345678-9" required />
          </div>
          <p v-if="rutPaciente.trim() && !pacienteEncontrado" class="mock-note" style="align-self: flex-end">
            No existe ese paciente todavía.
          </p>
          <p v-else-if="pacienteEncontrado" class="mock-note" style="align-self: flex-end">
            Paciente: {{ pacienteEncontrado.nombre }}
          </p>

          <div class="field" style="min-width: 200px">
            <label for="presupuesto-especialidad">Especialidad (opcional)</label>
            <select id="presupuesto-especialidad" v-model="especialidadId">
              <option value="">Sin asignar</option>
              <option v-for="e in especialidades" :key="e.id" :value="e.id">{{ e.nombre }}</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="presupuesto-tratamiento">Tratamiento / plan</label>
          <input
            id="presupuesto-tratamiento"
            v-model="tratamiento"
            type="text"
            placeholder="Ej: Endodoncia, Ortodoncia (plan anual)..."
            required
          />
        </div>

        <div class="field" style="max-width: 220px">
          <label for="presupuesto-monto">Monto (CLP)</label>
          <input id="presupuesto-monto" v-model.number="monto" type="number" min="1" step="1000" required />
        </div>

        <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardando">
            {{ editandoId ? "Guardar cambios" : "Crear presupuesto" }}
          </button>
          <button v-if="editandoId" type="button" class="btn btn-secondary" @click="limpiarFormulario">
            Cancelar
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Presupuestos emitidos</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th v-if="puedeGestionar">Paciente</th>
              <th>Tratamiento</th>
              <th>Monto</th>
              <th>Emisión</th>
              <th>Estado</th>
              <th v-if="puedeGestionar">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in presupuestos" :key="p.id">
              <td v-if="puedeGestionar">{{ nombrePaciente(p.pacienteId) }}</td>
              <td>{{ p.tratamiento }}</td>
              <td>{{ formatoCLP.format(p.monto) }}</td>
              <td>{{ p.emision.toDate().toLocaleDateString("es-CL") }}</td>
              <td>
                <span v-if="estaVencido(p)" class="badge badge--serious">Vencido</span>
                <span v-else class="badge" :class="estadoBadge[p.estado]">{{ estadoLabel[p.estado] }}</span>
              </td>
              <td v-if="puedeGestionar" style="display: flex; gap: 0.4rem; flex-wrap: wrap">
                <button type="button" class="btn btn-secondary" @click="editarPresupuesto(p)">Editar</button>
                <button
                  v-if="p.estado !== 'aceptado'"
                  type="button"
                  class="btn btn-secondary"
                  @click="cambiarEstado(p, 'aceptado')"
                >
                  Aceptar
                </button>
                <button
                  v-if="p.estado !== 'rechazado'"
                  type="button"
                  class="btn btn-secondary"
                  @click="cambiarEstado(p, 'rechazado')"
                >
                  Rechazar
                </button>
              </td>
            </tr>
            <tr v-if="presupuestos.length === 0">
              <td :colspan="puedeGestionar ? 6 : 4">Aún no hay presupuestos.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
