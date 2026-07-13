<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Paciente } from "@/types/catalogo";

const auth = useAuthStore();
const { rol } = storeToRefs(auth);

const puedeEditar = computed(() => rol.value === "admin" || rol.value === "secretaria");

const pacientes = ref<Paciente[]>([]);
const busqueda = ref("");
let unsubPacientes: (() => void) | undefined;

onMounted(() => {
  const clinicaId = auth.clinicaId;
  if (!clinicaId) return;

  unsubPacientes = onSnapshot(
    query(collection(db, "pacientes"), where("clinicaId", "==", clinicaId)),
    (snap) => {
      pacientes.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Paciente, "id">) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  );
});

onUnmounted(() => {
  unsubPacientes?.();
});

const pacientesFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return pacientes.value;
  return pacientes.value.filter(
    (p) => p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
  );
});

const editandoId = ref<string | null>(null);
const rut = ref("");
const nombre = ref("");
const telefono = ref("");
const guardando = ref(false);
const error = ref("");

function limpiarFormulario() {
  editandoId.value = null;
  rut.value = "";
  nombre.value = "";
  telefono.value = "";
  error.value = "";
}

function editarPaciente(paciente: Paciente) {
  editandoId.value = paciente.id;
  rut.value = paciente.id;
  nombre.value = paciente.nombre;
  telefono.value = paciente.telefono ?? "";
  error.value = "";
}

async function guardarPaciente() {
  const clinicaId = auth.clinicaId;
  const rutLimpio = rut.value.trim();
  const nombreLimpio = nombre.value.trim();
  const telefonoLimpio = telefono.value.trim();
  error.value = "";

  if (!clinicaId) return;
  if (!rutLimpio) {
    error.value = "El RUT es obligatorio.";
    return;
  }
  if (!nombreLimpio) {
    error.value = "El nombre es obligatorio.";
    return;
  }

  guardando.value = true;
  try {
    const ref = doc(db, "pacientes", rutLimpio);

    if (editandoId.value) {
      await updateDoc(ref, {
        clinicaId,
        nombre: nombreLimpio,
        telefono: telefonoLimpio || null,
      });
    } else {
      const existente = await getDoc(ref);
      if (existente.exists()) {
        error.value = `Ya existe un paciente registrado con el RUT ${rutLimpio}.`;
        return;
      }
      await setDoc(ref, {
        clinicaId,
        nombre: nombreLimpio,
        telefono: telefonoLimpio || null,
        bloqueado: false,
      });
    }
    limpiarFormulario();
  } catch (e) {
    error.value = "No se pudo guardar el paciente. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}

async function toggleBloqueado(paciente: Paciente) {
  await updateDoc(doc(db, "pacientes", paciente.id), {
    clinicaId: paciente.clinicaId,
    nombre: paciente.nombre,
    telefono: paciente.telefono ?? null,
    bloqueado: !paciente.bloqueado,
  });
}
</script>

<template>
  <main>
    <h1>Pacientes</h1>

    <div v-if="puedeEditar" class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoId ? "Editar paciente" : "Nuevo paciente" }}</h2>
      </div>

      <form @submit.prevent="guardarPaciente">
        <div class="field" style="max-width: 220px">
          <label for="paciente-rut">RUT</label>
          <input
            id="paciente-rut"
            v-model="rut"
            type="text"
            placeholder="Ej: 12345678-9"
            :disabled="!!editandoId"
            required
          />
        </div>

        <div class="field">
          <label for="paciente-nombre">Nombre completo</label>
          <input id="paciente-nombre" v-model="nombre" type="text" placeholder="Ej: Josefina Rojas" required />
        </div>

        <div class="field" style="max-width: 260px">
          <label for="paciente-telefono">Teléfono</label>
          <input id="paciente-telefono" v-model="telefono" type="tel" placeholder="Ej: +56 9 1234 5678" />
        </div>

        <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardando">
            {{ editandoId ? "Guardar cambios" : "Registrar paciente" }}
          </button>
          <button v-if="editandoId" type="button" class="btn btn-secondary" @click="limpiarFormulario">
            Cancelar
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Listado de pacientes</h2>
        <div class="field" style="margin-bottom: 0; min-width: 220px">
          <input v-model="busqueda" type="search" placeholder="Buscar por nombre o RUT..." aria-label="Buscar paciente" />
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Ficha</th>
              <th v-if="puedeEditar">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pacientesFiltrados" :key="p.id">
              <td>{{ p.id }}</td>
              <td>{{ p.nombre }}</td>
              <td>{{ p.telefono || "—" }}</td>
              <td>
                <span class="badge" :class="p.bloqueado ? 'badge--critical' : 'badge--good'">
                  {{ p.bloqueado ? "Bloqueado" : "Activo" }}
                </span>
              </td>
              <td>
                <router-link :to="`/pacientes/${p.id}`" class="btn btn-secondary">Ver ficha</router-link>
              </td>
              <td v-if="puedeEditar" style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarPaciente(p)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="toggleBloqueado(p)">
                  {{ p.bloqueado ? "Desbloquear" : "Bloquear" }}
                </button>
              </td>
            </tr>
            <tr v-if="pacientesFiltrados.length === 0">
              <td :colspan="puedeEditar ? 6 : 5">No se encontraron pacientes con "{{ busqueda }}".</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
