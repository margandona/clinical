<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Especialidad, Profesional } from "@/types/catalogo";

const auth = useAuthStore();

const especialidades = ref<Especialidad[]>([]);
const profesionales = ref<Profesional[]>([]);

let unsubEspecialidades: (() => void) | undefined;
let unsubProfesionales: (() => void) | undefined;

onMounted(() => {
  const clinicaId = auth.clinicaId;
  if (!clinicaId) return;

  unsubEspecialidades = onSnapshot(
    query(collection(db, "especialidades"), where("clinicaId", "==", clinicaId)),
    (snap) => {
      especialidades.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Especialidad, "id">) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  );

  unsubProfesionales = onSnapshot(
    query(collection(db, "profesionales"), where("clinicaId", "==", clinicaId)),
    (snap) => {
      profesionales.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Profesional, "id">) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  );
});

onUnmounted(() => {
  unsubEspecialidades?.();
  unsubProfesionales?.();
});

// --- Profesionales (doctores): alta, edición de nombre y baja ---
const editandoProfesionalId = ref<string | null>(null);
const nuevoProfesionalNombre = ref("");
const guardandoProfesional = ref(false);

function editarProfesional(profesional: Profesional) {
  editandoProfesionalId.value = profesional.id;
  nuevoProfesionalNombre.value = profesional.nombre;
}

function cancelarEdicionProfesional() {
  editandoProfesionalId.value = null;
  nuevoProfesionalNombre.value = "";
}

async function guardarProfesional() {
  const clinicaId = auth.clinicaId;
  const nombre = nuevoProfesionalNombre.value.trim();
  if (!clinicaId || !nombre) return;

  guardandoProfesional.value = true;
  try {
    if (editandoProfesionalId.value) {
      const actual = profesionales.value.find((p) => p.id === editandoProfesionalId.value);
      await updateDoc(doc(db, "profesionales", editandoProfesionalId.value), {
        clinicaId,
        nombre,
        especialidadIds: actual?.especialidadIds ?? [],
      });
    } else {
      await addDoc(collection(db, "profesionales"), {
        clinicaId,
        nombre,
        especialidadIds: [],
      });
    }
    cancelarEdicionProfesional();
  } finally {
    guardandoProfesional.value = false;
  }
}

async function eliminarProfesional(profesional: Profesional) {
  if (!confirm(`¿Eliminar al profesional "${profesional.nombre}"?`)) return;
  await deleteDoc(doc(db, "profesionales", profesional.id));
  if (editandoProfesionalId.value === profesional.id) cancelarEdicionProfesional();
}

// --- Servicios (especialidades) ---
const editandoId = ref<string | null>(null);
const nombre = ref("");
const duracion = ref(30);
const doctoresSeleccionados = ref<Set<string>>(new Set());
const guardandoServicio = ref(false);
const errorServicio = ref("");

function limpiarFormulario() {
  editandoId.value = null;
  nombre.value = "";
  duracion.value = 30;
  doctoresSeleccionados.value = new Set();
  errorServicio.value = "";
}

function editarServicio(especialidad: Especialidad) {
  editandoId.value = especialidad.id;
  nombre.value = especialidad.nombre;
  duracion.value = especialidad.duracionMinutosDefault;
  doctoresSeleccionados.value = new Set(
    profesionales.value.filter((p) => p.especialidadIds.includes(especialidad.id)).map((p) => p.id)
  );
  errorServicio.value = "";
}

function toggleDoctor(profesionalId: string) {
  const next = new Set(doctoresSeleccionados.value);
  if (next.has(profesionalId)) next.delete(profesionalId);
  else next.add(profesionalId);
  doctoresSeleccionados.value = next;
}

function doctoresDe(especialidad: Especialidad) {
  return profesionales.value.filter((p) => p.especialidadIds.includes(especialidad.id));
}

async function guardarServicio() {
  const clinicaId = auth.clinicaId;
  const nombreLimpio = nombre.value.trim();
  errorServicio.value = "";

  if (!clinicaId) return;
  if (!nombreLimpio) {
    errorServicio.value = "El nombre del servicio es obligatorio.";
    return;
  }
  if (!Number.isFinite(duracion.value) || duracion.value <= 0) {
    errorServicio.value = "La duración debe ser mayor a 0 minutos.";
    return;
  }

  guardandoServicio.value = true;
  try {
    const batch = writeBatch(db);
    let especialidadId = editandoId.value;

    if (especialidadId) {
      batch.update(doc(db, "especialidades", especialidadId), {
        clinicaId,
        nombre: nombreLimpio,
        duracionMinutosDefault: duracion.value,
      });
    } else {
      const nuevoRef = doc(collection(db, "especialidades"));
      especialidadId = nuevoRef.id;
      batch.set(nuevoRef, {
        clinicaId,
        nombre: nombreLimpio,
        duracionMinutosDefault: duracion.value,
      });
    }

    for (const profesional of profesionales.value) {
      const teniaAntes = profesional.especialidadIds.includes(especialidadId);
      const marcadoAhora = doctoresSeleccionados.value.has(profesional.id);
      if (marcadoAhora && !teniaAntes) {
        batch.update(doc(db, "profesionales", profesional.id), {
          clinicaId,
          nombre: profesional.nombre,
          especialidadIds: arrayUnion(especialidadId),
        });
      } else if (!marcadoAhora && teniaAntes) {
        batch.update(doc(db, "profesionales", profesional.id), {
          clinicaId,
          nombre: profesional.nombre,
          especialidadIds: arrayRemove(especialidadId),
        });
      }
    }

    await batch.commit();
    limpiarFormulario();
  } catch (e) {
    errorServicio.value = "No se pudo guardar el servicio. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardandoServicio.value = false;
  }
}

async function eliminarServicio(especialidad: Especialidad) {
  if (!confirm(`¿Eliminar el servicio "${especialidad.nombre}"?`)) return;

  const clinicaId = auth.clinicaId;
  const batch = writeBatch(db);
  batch.delete(doc(db, "especialidades", especialidad.id));
  for (const profesional of doctoresDe(especialidad)) {
    batch.update(doc(db, "profesionales", profesional.id), {
      clinicaId,
      nombre: profesional.nombre,
      especialidadIds: arrayRemove(especialidad.id),
    });
  }
  await batch.commit();

  if (editandoId.value === especialidad.id) limpiarFormulario();
}
</script>

<template>
  <main>
    <h1>Servicios</h1>
    <p class="mock-note">🦷 Cada servicio hereda su duración por defecto a las citas; se asignan los profesionales que pueden realizarlo.</p>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoId ? "Editar servicio" : "Nuevo servicio" }}</h2>
      </div>

      <form @submit.prevent="guardarServicio">
        <div class="field">
          <label for="servicio-nombre">Nombre del servicio</label>
          <input id="servicio-nombre" v-model="nombre" type="text" placeholder="Ej: Ortodoncia" required />
        </div>

        <div class="field" style="max-width: 220px">
          <label for="servicio-duracion">Duración por defecto (minutos)</label>
          <input id="servicio-duracion" v-model.number="duracion" type="number" min="5" step="5" required />
        </div>

        <div class="field">
          <label>Profesionales que realizan este servicio</label>
          <p v-if="profesionales.length === 0" class="mock-note">
            No hay profesionales registrados todavía. Agrega uno más abajo para poder asignarlo.
          </p>
          <div v-else class="doctor-checklist">
            <label v-for="p in profesionales" :key="p.id" class="doctor-check">
              <input
                type="checkbox"
                :checked="doctoresSeleccionados.has(p.id)"
                @change="toggleDoctor(p.id)"
              />
              {{ p.nombre }}
            </label>
          </div>
        </div>

        <p v-if="errorServicio" class="badge badge--critical" style="margin-bottom: 1rem">{{ errorServicio }}</p>

        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardandoServicio">
            {{ editandoId ? "Guardar cambios" : "Crear servicio" }}
          </button>
          <button v-if="editandoId" type="button" class="btn btn-secondary" @click="limpiarFormulario">
            Cancelar
          </button>
        </div>
      </form>
    </div>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>Servicios existentes</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Duración</th>
              <th>Profesionales asignados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in especialidades" :key="e.id">
              <td>{{ e.nombre }}</td>
              <td>{{ e.duracionMinutosDefault }} min</td>
              <td>
                <span v-if="doctoresDe(e).length === 0" class="mock-note" style="margin: 0">Sin asignar</span>
                <span v-else>{{ doctoresDe(e).map((p) => p.nombre).join(", ") }}</span>
              </td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarServicio(e)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarServicio(e)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="especialidades.length === 0">
              <td colspan="4">Aún no hay servicios creados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>{{ editandoProfesionalId ? "Editar profesional" : "Profesionales" }}</h2>
      </div>
      <form class="field" style="flex-direction: row; align-items: flex-end; gap: 0.6rem" @submit.prevent="guardarProfesional">
        <div class="field" style="flex: 1; margin-bottom: 0">
          <label for="profesional-nombre">Nombre del profesional</label>
          <input id="profesional-nombre" v-model="nuevoProfesionalNombre" type="text" placeholder="Ej: Dra. Soto" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="guardandoProfesional || !nuevoProfesionalNombre.trim()">
          {{ editandoProfesionalId ? "Guardar cambios" : "Agregar" }}
        </button>
        <button v-if="editandoProfesionalId" type="button" class="btn btn-secondary" @click="cancelarEdicionProfesional">
          Cancelar
        </button>
      </form>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Servicios asignados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in profesionales" :key="p.id">
              <td>{{ p.nombre }}</td>
              <td>
                {{
                  especialidades
                    .filter((e) => p.especialidadIds.includes(e.id))
                    .map((e) => e.nombre)
                    .join(", ") || "—"
                }}
              </td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarProfesional(p)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarProfesional(p)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="profesionales.length === 0">
              <td colspan="3">Aún no hay profesionales registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<style scoped>
.doctor-checklist {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.doctor-check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  font-weight: 400;
  color: var(--text-primary);
}
</style>
