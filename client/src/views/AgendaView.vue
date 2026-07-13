<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Box, Especialidad, Profesional } from "@/types/catalogo";
import type { Paciente } from "@/types/catalogo";
import { BUFFER_BOX_MINUTOS, type Cita, type EstadoCita } from "@/types/agenda";

const auth = useAuthStore();
const { rol, clinicaId, profesionalId: miProfesionalId, pacienteId: miPacienteId } = storeToRefs(auth);

const puedeGestionar = computed(() => rol.value === "admin" || rol.value === "secretaria");

const titulo = computed(() => {
  if (rol.value === "dentista") return "Mi agenda";
  if (rol.value === "paciente") return "Mis citas";
  return "Agenda";
});

const estadoBadge: Record<EstadoCita, string> = {
  reservada: "badge--warning",
  confirmada: "badge--good",
  cancelada: "badge--critical",
  inasistencia: "badge--critical",
  atendida: "badge--good",
};

const estadoLabel: Record<EstadoCita, string> = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  inasistencia: "Inasistencia",
  atendida: "Atendida",
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fecha = ref(hoyISO());

function cambiarDia(delta: number) {
  const [y, m, d] = fecha.value.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  fecha.value = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// --- Catálogo de apoyo (especialidades, profesionales, boxes, pacientes) ---
const especialidades = ref<Especialidad[]>([]);
const profesionales = ref<Profesional[]>([]);
const boxes = ref<Box[]>([]);
const pacientes = ref<Paciente[]>([]);

let unsubs: Array<() => void> = [];

onMounted(() => {
  const cid = clinicaId.value;
  if (!cid) return;

  if (puedeGestionar.value) {
    unsubs.push(
      onSnapshot(query(collection(db, "especialidades"), where("clinicaId", "==", cid)), (snap) => {
        especialidades.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Especialidad, "id">) }));
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "profesionales"), where("clinicaId", "==", cid)), (snap) => {
        profesionales.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Profesional, "id">) }));
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "boxes"), where("clinicaId", "==", cid)), (snap) => {
        boxes.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Box, "id">) }));
      })
    );
    unsubs.push(
      onSnapshot(query(collection(db, "pacientes"), where("clinicaId", "==", cid)), (snap) => {
        pacientes.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Paciente, "id">) }));
      })
    );
  }
});

onUnmounted(() => {
  unsubs.forEach((u) => u());
  unsubCitas?.();
});

// --- Citas del día seleccionado ---
const citas = ref<Cita[]>([]);
let unsubCitas: (() => void) | undefined;

function suscribirCitasDelDia() {
  unsubCitas?.();
  const cid = clinicaId.value;
  if (!cid) return;

  const [y, m, d] = fecha.value.split("-").map(Number);
  const inicioDia = Timestamp.fromDate(new Date(y, m - 1, d, 0, 0, 0));
  const finDia = Timestamp.fromDate(new Date(y, m - 1, d + 1, 0, 0, 0));

  const restricciones = [where("clinicaId", "==", cid), where("inicio", ">=", inicioDia), where("inicio", "<", finDia)];

  if (rol.value === "dentista" && miProfesionalId.value) {
    restricciones.push(where("profesionalId", "==", miProfesionalId.value));
  } else if (rol.value === "paciente" && miPacienteId.value) {
    restricciones.push(where("pacienteId", "==", miPacienteId.value));
  }

  unsubCitas = onSnapshot(
    query(collection(db, "citas"), ...restricciones, orderBy("inicio", "asc")),
    (snap) => {
      citas.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Cita, "id">) }));
    }
  );
}

watch([fecha, clinicaId], suscribirCitasDelDia, { immediate: true });

function nombreProfesional(id: string) {
  return profesionales.value.find((p) => p.id === id)?.nombre ?? id;
}
function nombreBox(id: string) {
  return boxes.value.find((b) => b.id === id)?.nombre ?? id;
}
function nombrePaciente(id: string) {
  return pacientes.value.find((p) => p.id === id)?.nombre ?? id;
}
function nombreEspecialidad(id: string) {
  return especialidades.value.find((e) => e.id === id)?.nombre ?? id;
}
function horaDe(cita: Cita) {
  return cita.inicio.toDate().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

// --- Formulario de nueva cita (solo admin/secretaria) ---
const hora = ref("09:00");
const especialidadId = ref("");
const profesionalIdForm = ref("");
const boxId = ref("");
const duracionMinutos = ref(30);
const rutPaciente = ref("");
const nombreNuevoPaciente = ref("");
const telefonoNuevoPaciente = ref("");
const esSobrecupo = ref(false);
const guardando = ref(false);
const error = ref("");
const avisoConflicto = ref("");

const profesionalesFiltrados = computed(() =>
  especialidadId.value
    ? profesionales.value.filter((p) => p.especialidadIds.includes(especialidadId.value))
    : profesionales.value
);

watch(especialidadId, (id) => {
  const especialidad = especialidades.value.find((e) => e.id === id);
  if (especialidad) duracionMinutos.value = especialidad.duracionMinutosDefault;
  if (!profesionalesFiltrados.value.some((p) => p.id === profesionalIdForm.value)) {
    profesionalIdForm.value = "";
  }
});

const pacienteEncontrado = computed(() => pacientes.value.find((p) => p.id === rutPaciente.value.trim()));

function limpiarFormulario() {
  hora.value = "09:00";
  especialidadId.value = "";
  profesionalIdForm.value = "";
  boxId.value = "";
  duracionMinutos.value = 30;
  rutPaciente.value = "";
  nombreNuevoPaciente.value = "";
  telefonoNuevoPaciente.value = "";
  esSobrecupo.value = false;
  error.value = "";
  avisoConflicto.value = "";
}

function calcularRango(inicio: Date, minutos: number) {
  return { inicio, fin: new Date(inicio.getTime() + minutos * 60000) };
}

function detectarConflictos(inicio: Date, fin: Date) {
  const activas = citas.value.filter((c) => c.estado !== "cancelada");

  const conflictoProfesional = activas.some((c) => {
    if (c.profesionalId !== profesionalIdForm.value) return false;
    const cInicio = c.inicio.toDate();
    const cFin = new Date(cInicio.getTime() + c.duracionMinutos * 60000);
    return cInicio < fin && cFin > inicio;
  });

  const conflictoBox = activas.some((c) => {
    if (c.boxId !== boxId.value) return false;
    const cInicio = c.inicio.toDate();
    const cFinConBuffer = new Date(cInicio.getTime() + (c.duracionMinutos + BUFFER_BOX_MINUTOS) * 60000);
    return cInicio < fin && cFinConBuffer > inicio;
  });

  return { conflictoProfesional, conflictoBox };
}

async function crearCita() {
  error.value = "";
  avisoConflicto.value = "";

  const cid = clinicaId.value;
  const rut = rutPaciente.value.trim();
  if (!cid) return;
  if (!especialidadId.value || !profesionalIdForm.value || !boxId.value) {
    error.value = "Especialidad, profesional y box son obligatorios.";
    return;
  }
  if (!rut) {
    error.value = "El RUT del paciente es obligatorio.";
    return;
  }
  if (!pacienteEncontrado.value && !nombreNuevoPaciente.value.trim()) {
    error.value = "No existe un paciente con ese RUT; ingresa su nombre para registrarlo.";
    return;
  }
  if (!Number.isFinite(duracionMinutos.value) || duracionMinutos.value <= 0) {
    error.value = "La duración debe ser mayor a 0 minutos.";
    return;
  }

  const [y, m, d] = fecha.value.split("-").map(Number);
  const [hh, mm] = hora.value.split(":").map(Number);
  const { inicio, fin } = calcularRango(new Date(y, m - 1, d, hh, mm), duracionMinutos.value);

  const { conflictoProfesional, conflictoBox } = detectarConflictos(inicio, fin);
  if ((conflictoProfesional || conflictoBox) && !esSobrecupo.value) {
    avisoConflicto.value = conflictoProfesional
      ? "El profesional ya tiene una cita en ese horario. Marca \"Crear como sobrecupo\" si igual quieres agendarla."
      : "El box no está disponible en ese horario (incluye tiempo de limpieza). Marca \"Crear como sobrecupo\" si igual quieres agendarla.";
    return;
  }

  guardando.value = true;
  try {
    const batch = writeBatch(db);
    let pacienteId = rut;

    if (!pacienteEncontrado.value) {
      batch.set(doc(db, "pacientes", rut), {
        clinicaId: cid,
        nombre: nombreNuevoPaciente.value.trim(),
        telefono: telefonoNuevoPaciente.value.trim() || null,
        bloqueado: false,
      });
    }

    const citaRef = doc(collection(db, "citas"));
    batch.set(citaRef, {
      clinicaId: cid,
      pacienteId,
      profesionalId: profesionalIdForm.value,
      boxId: boxId.value,
      especialidadId: especialidadId.value,
      inicio: Timestamp.fromDate(inicio),
      duracionMinutos: duracionMinutos.value,
      estado: "reservada",
      esSobrecupo: esSobrecupo.value && (conflictoProfesional || conflictoBox),
    });

    await batch.commit();
    limpiarFormulario();
  } catch (e) {
    error.value = "No se pudo crear la cita. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}

async function cambiarEstado(cita: Cita, estado: EstadoCita) {
  await updateDoc(doc(db, "citas", cita.id), { estado });
}
</script>

<template>
  <main>
    <h1>{{ titulo }}</h1>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header" style="gap: 0.6rem">
        <button type="button" class="btn btn-secondary" @click="cambiarDia(-1)">← Día anterior</button>
        <input v-model="fecha" type="date" aria-label="Fecha" />
        <button type="button" class="btn btn-secondary" @click="cambiarDia(1)">Día siguiente →</button>
      </div>
    </div>

    <div v-if="puedeGestionar" class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>Nueva cita</h2>
      </div>

      <form @submit.prevent="crearCita">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="max-width: 140px">
            <label for="cita-hora">Hora</label>
            <input id="cita-hora" v-model="hora" type="time" required />
          </div>

          <div class="field" style="min-width: 200px">
            <label for="cita-especialidad">Especialidad</label>
            <select id="cita-especialidad" v-model="especialidadId" required>
              <option value="" disabled>Selecciona una especialidad</option>
              <option v-for="e in especialidades" :key="e.id" :value="e.id">{{ e.nombre }}</option>
            </select>
          </div>

          <div class="field" style="min-width: 200px">
            <label for="cita-profesional">Profesional</label>
            <select id="cita-profesional" v-model="profesionalIdForm" required>
              <option value="" disabled>Selecciona un profesional</option>
              <option v-for="p in profesionalesFiltrados" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div class="field" style="min-width: 160px">
            <label for="cita-box">Box</label>
            <select id="cita-box" v-model="boxId" required>
              <option value="" disabled>Selecciona un box</option>
              <option v-for="b in boxes" :key="b.id" :value="b.id">{{ b.nombre }}</option>
            </select>
          </div>

          <div class="field" style="max-width: 140px">
            <label for="cita-duracion">Duración (min)</label>
            <input id="cita-duracion" v-model.number="duracionMinutos" type="number" min="5" step="5" required />
          </div>
        </div>

        <div style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="max-width: 200px">
            <label for="cita-rut">RUT del paciente</label>
            <input id="cita-rut" v-model="rutPaciente" type="text" placeholder="Ej: 12345678-9" required />
          </div>

          <template v-if="rutPaciente.trim() && !pacienteEncontrado">
            <div class="field" style="min-width: 200px">
              <label for="cita-paciente-nombre">Nombre (paciente nuevo)</label>
              <input id="cita-paciente-nombre" v-model="nombreNuevoPaciente" type="text" placeholder="Nombre completo" />
            </div>
            <div class="field" style="max-width: 220px">
              <label for="cita-paciente-telefono">Teléfono</label>
              <input id="cita-paciente-telefono" v-model="telefonoNuevoPaciente" type="tel" placeholder="Opcional" />
            </div>
          </template>
          <p v-else-if="pacienteEncontrado" class="mock-note" style="align-self: flex-end">
            Paciente: {{ pacienteEncontrado.nombre }}
          </p>
        </div>

        <label style="display: flex; align-items: center; gap: 0.4rem; font-weight: 400; margin-bottom: 1rem">
          <input v-model="esSobrecupo" type="checkbox" />
          Crear como sobrecupo (por sobre la disponibilidad normal)
        </label>

        <p v-if="avisoConflicto" class="badge badge--warning" style="margin-bottom: 1rem">{{ avisoConflicto }}</p>
        <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

        <button type="submit" class="btn btn-primary" :disabled="guardando">Crear cita</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Citas del {{ fecha }}</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Paciente</th>
              <th>Profesional</th>
              <th>Especialidad</th>
              <th>Box</th>
              <th>Estado</th>
              <th v-if="puedeGestionar || rol === 'dentista'">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cita in citas" :key="cita.id">
              <td>{{ horaDe(cita) }}</td>
              <td>{{ nombrePaciente(cita.pacienteId) }}</td>
              <td>{{ nombreProfesional(cita.profesionalId) }}</td>
              <td>{{ nombreEspecialidad(cita.especialidadId) }}</td>
              <td>{{ nombreBox(cita.boxId) }} <span v-if="cita.esSobrecupo" class="badge badge--warning">Sobrecupo</span></td>
              <td><span class="badge" :class="estadoBadge[cita.estado]">{{ estadoLabel[cita.estado] }}</span></td>
              <td v-if="puedeGestionar || rol === 'dentista'" style="display: flex; gap: 0.4rem; flex-wrap: wrap">
                <button type="button" class="btn btn-secondary" @click="cambiarEstado(cita, 'confirmada')">Confirmar</button>
                <button type="button" class="btn btn-secondary" @click="cambiarEstado(cita, 'atendida')">Atendida</button>
                <button type="button" class="btn btn-secondary" @click="cambiarEstado(cita, 'inasistencia')">Inasistencia</button>
                <button v-if="puedeGestionar" type="button" class="btn btn-secondary" @click="cambiarEstado(cita, 'cancelada')">
                  Cancelar
                </button>
              </td>
            </tr>
            <tr v-if="citas.length === 0">
              <td colspan="7">No hay citas para este día.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
