<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Box } from "@/types/catalogo";

const auth = useAuthStore();

const boxes = ref<Box[]>([]);
let unsubBoxes: (() => void) | undefined;

onMounted(() => {
  const clinicaId = auth.clinicaId;
  if (!clinicaId) return;

  unsubBoxes = onSnapshot(
    query(collection(db, "boxes"), where("clinicaId", "==", clinicaId)),
    (snap) => {
      boxes.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Box, "id">) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  );
});

onUnmounted(() => {
  unsubBoxes?.();
});

const editandoId = ref<string | null>(null);
const nombre = ref("");
const tipo = ref<Box["tipo"]>("dental");
const guardando = ref(false);
const error = ref("");

function limpiarFormulario() {
  editandoId.value = null;
  nombre.value = "";
  tipo.value = "dental";
  error.value = "";
}

function editarBox(box: Box) {
  editandoId.value = box.id;
  nombre.value = box.nombre;
  tipo.value = box.tipo;
  error.value = "";
}

async function guardarBox() {
  const clinicaId = auth.clinicaId;
  const nombreLimpio = nombre.value.trim();
  error.value = "";

  if (!clinicaId) return;
  if (!nombreLimpio) {
    error.value = "El nombre del box es obligatorio.";
    return;
  }

  guardando.value = true;
  try {
    if (editandoId.value) {
      await updateDoc(doc(db, "boxes", editandoId.value), {
        clinicaId,
        nombre: nombreLimpio,
        tipo: tipo.value,
      });
    } else {
      await addDoc(collection(db, "boxes"), {
        clinicaId,
        nombre: nombreLimpio,
        tipo: tipo.value,
      });
    }
    limpiarFormulario();
  } catch (e) {
    error.value = "No se pudo guardar el box. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}

async function eliminarBox(box: Box) {
  if (!confirm(`¿Eliminar el box "${box.nombre}"?`)) return;
  await deleteDoc(doc(db, "boxes", box.id));
  if (editandoId.value === box.id) limpiarFormulario();
}
</script>

<template>
  <main>
    <h1>Boxes</h1>
    <p class="mock-note">🏥 Cada box tiene un tipo (dental o médico) que determina qué citas puede recibir.</p>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoId ? "Editar box" : "Nuevo box" }}</h2>
      </div>

      <form @submit.prevent="guardarBox">
        <div class="field">
          <label for="box-nombre">Nombre del box</label>
          <input id="box-nombre" v-model="nombre" type="text" placeholder="Ej: Box 1" required />
        </div>

        <div class="field" style="max-width: 220px">
          <label for="box-tipo">Tipo</label>
          <select id="box-tipo" v-model="tipo">
            <option value="dental">Dental</option>
            <option value="medico">Médico</option>
          </select>
        </div>

        <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardando">
            {{ editandoId ? "Guardar cambios" : "Crear box" }}
          </button>
          <button v-if="editandoId" type="button" class="btn btn-secondary" @click="limpiarFormulario">
            Cancelar
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Boxes existentes</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in boxes" :key="b.id">
              <td>{{ b.nombre }}</td>
              <td>{{ b.tipo === "dental" ? "Dental" : "Médico" }}</td>
              <td style="display: flex; gap: 0.5rem">
                <button type="button" class="btn btn-secondary" @click="editarBox(b)">Editar</button>
                <button type="button" class="btn btn-secondary" @click="eliminarBox(b)">Eliminar</button>
              </td>
            </tr>
            <tr v-if="boxes.length === 0">
              <td colspan="3">Aún no hay boxes creados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
