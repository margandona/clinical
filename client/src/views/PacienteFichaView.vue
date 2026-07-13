<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Paciente, Profesional } from "@/types/catalogo";
import type { ItemReceta, NotaClinica, Receta } from "@/types/clinico";

const route = useRoute();
const pacienteId = computed(() => String(route.params.id));

const auth = useAuthStore();
const { rol, clinicaId, profesionalId: miProfesionalId } = storeToRefs(auth);

const puedeVerNotas = computed(() => rol.value === "admin" || rol.value === "dentista");

const paciente = ref<Paciente | null>(null);
const cargandoPaciente = ref(true);

async function cargarPaciente() {
  cargandoPaciente.value = true;
  const snap = await getDoc(doc(db, "pacientes", pacienteId.value));
  paciente.value = snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Paciente, "id">) }) : null;
  cargandoPaciente.value = false;
}

const profesionales = ref<Profesional[]>([]);
const notas = ref<NotaClinica[]>([]);
const recetas = ref<Receta[]>([]);
let unsubs: Array<() => void> = [];

onMounted(() => {
  cargarPaciente();

  const cid = clinicaId.value;
  if (!cid) return;

  if (puedeVerNotas.value) {
    unsubs.push(
      onSnapshot(
        query(
          collection(db, "notasClinicas"),
          where("clinicaId", "==", cid),
          where("pacienteId", "==", pacienteId.value),
          orderBy("fecha", "desc")
        ),
        (snap) => {
          notas.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotaClinica, "id">) }));
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(db, "recetas"),
          where("clinicaId", "==", cid),
          where("pacienteId", "==", pacienteId.value),
          orderBy("fecha", "desc")
        ),
        (snap) => {
          recetas.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Receta, "id">) }));
        }
      )
    );

    if (rol.value === "admin") {
      unsubs.push(
        onSnapshot(query(collection(db, "profesionales"), where("clinicaId", "==", cid)), (snap) => {
          profesionales.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Profesional, "id">) }));
        })
      );
    }
  }
});

onUnmounted(() => unsubs.forEach((u) => u()));

function nombreProfesional(id: string) {
  if (rol.value === "dentista" && id === miProfesionalId.value) return "Tú";
  return profesionales.value.find((p) => p.id === id)?.nombre ?? id;
}

// --- Nueva nota clínica (admin y dentista) ---
const profesionalIdForm = ref("");
const motivo = ref("");
const notaTexto = ref("");
const guardando = ref(false);
const error = ref("");

function limpiarFormulario() {
  profesionalIdForm.value = "";
  motivo.value = "";
  notaTexto.value = "";
  error.value = "";
}

async function guardarNota() {
  error.value = "";
  const cid = clinicaId.value;
  const motivoLimpio = motivo.value.trim();
  const notaLimpia = notaTexto.value.trim();
  const autorId = rol.value === "dentista" ? miProfesionalId.value : profesionalIdForm.value;

  if (!cid || !autorId) {
    error.value = rol.value === "admin" ? "Selecciona el profesional que atiende." : "No se pudo identificar al profesional.";
    return;
  }
  if (!motivoLimpio) {
    error.value = "El motivo de la atención es obligatorio.";
    return;
  }
  if (!notaLimpia) {
    error.value = "La nota clínica no puede estar vacía.";
    return;
  }

  guardando.value = true;
  try {
    await addDoc(collection(db, "notasClinicas"), {
      clinicaId: cid,
      pacienteId: pacienteId.value,
      profesionalId: autorId,
      fecha: Timestamp.now(),
      motivo: motivoLimpio,
      notas: notaLimpia,
    });
    limpiarFormulario();
  } catch (e) {
    error.value = "No se pudo guardar la nota clínica. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}

// --- Nueva receta (admin y dentista) ---
function itemVacio(): ItemReceta {
  return { medicamento: "", indicaciones: "" };
}

const profesionalIdRecetaForm = ref("");
const itemsForm = ref<ItemReceta[]>([itemVacio()]);
const observacionesForm = ref("");
const guardandoReceta = ref(false);
const errorReceta = ref("");

function agregarItem() {
  itemsForm.value.push(itemVacio());
}

function quitarItem(index: number) {
  itemsForm.value.splice(index, 1);
}

function limpiarFormularioReceta() {
  profesionalIdRecetaForm.value = "";
  itemsForm.value = [itemVacio()];
  observacionesForm.value = "";
  errorReceta.value = "";
}

async function guardarReceta() {
  errorReceta.value = "";
  const cid = clinicaId.value;
  const autorId = rol.value === "dentista" ? miProfesionalId.value : profesionalIdRecetaForm.value;
  const items = itemsForm.value
    .map((item) => ({ medicamento: item.medicamento.trim(), indicaciones: item.indicaciones.trim() }))
    .filter((item) => item.medicamento);

  if (!cid || !autorId) {
    errorReceta.value = rol.value === "admin" ? "Selecciona el profesional que emite la receta." : "No se pudo identificar al profesional.";
    return;
  }
  if (items.length === 0) {
    errorReceta.value = "Agrega al menos un medicamento.";
    return;
  }

  guardandoReceta.value = true;
  try {
    await addDoc(collection(db, "recetas"), {
      clinicaId: cid,
      pacienteId: pacienteId.value,
      profesionalId: autorId,
      fecha: Timestamp.now(),
      items,
      ...(observacionesForm.value.trim() ? { observaciones: observacionesForm.value.trim() } : {}),
    });
    limpiarFormularioReceta();
  } catch (e) {
    errorReceta.value = "No se pudo guardar la receta. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardandoReceta.value = false;
  }
}

function imprimirReceta(receta: Receta) {
  const ventana = window.open("", "_blank", "width=680,height=800");
  if (!ventana) return;

  const filasItems = receta.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 4px;border-bottom:1px solid #e7e3ea;">${item.medicamento}</td><td style="padding:8px 4px;border-bottom:1px solid #e7e3ea;">${item.indicaciones}</td></tr>`
    )
    .join("");

  ventana.document.write(`
    <html>
      <head>
        <title>Receta - ${paciente.value?.nombre ?? pacienteId.value}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui, sans-serif; color: #1f1229; padding: 32px; }
          h1 { color: #641480; font-size: 18px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { text-align: left; padding: 8px 4px; border-bottom: 2px solid #641480; font-size: 12px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>Maxilus Dental</h1>
        <p>José Alejandro Bernales 1610, Villa El Portal, Ovalle</p>
        <hr />
        <p><strong>Paciente:</strong> ${paciente.value?.nombre ?? ""} (RUT ${pacienteId.value})</p>
        <p><strong>Profesional:</strong> ${nombreProfesional(receta.profesionalId)}</p>
        <p><strong>Fecha:</strong> ${receta.fecha.toDate().toLocaleDateString("es-CL")}</p>
        <table>
          <thead><tr><th>Medicamento</th><th>Indicaciones</th></tr></thead>
          <tbody>${filasItems}</tbody>
        </table>
        ${receta.observaciones ? `<p><strong>Observaciones:</strong> ${receta.observaciones}</p>` : ""}
      </body>
    </html>
  `);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}
</script>

<template>
  <main>
    <router-link to="/pacientes" class="btn btn-secondary" style="margin-bottom: 1.25rem; display: inline-flex">
      ← Volver a pacientes
    </router-link>

    <div v-if="cargandoPaciente">Cargando ficha...</div>
    <div v-else-if="!paciente">
      <h1>Paciente no encontrado</h1>
      <p>No existe un paciente registrado con RUT {{ pacienteId }}.</p>
    </div>
    <template v-else>
      <div class="card" style="margin-bottom: 1.5rem">
        <div class="card-header">
          <h2>{{ paciente.nombre }}</h2>
          <span class="badge" :class="paciente.bloqueado ? 'badge--critical' : 'badge--good'">
            {{ paciente.bloqueado ? "Bloqueado" : "Activo" }}
          </span>
        </div>
        <p>RUT: <strong>{{ paciente.id }}</strong> · Teléfono: {{ paciente.telefono || "—" }}</p>
      </div>

      <div v-if="!puedeVerNotas" class="card">
        <p class="mock-note">La ficha clínica (notas de atención) es visible solo para dentistas y administración.</p>
      </div>

      <template v-else>
        <div class="card" style="margin-bottom: 1.5rem">
          <div class="card-header">
            <h2>Nueva nota clínica</h2>
          </div>

          <form @submit.prevent="guardarNota">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap">
              <div v-if="rol === 'admin'" class="field" style="min-width: 200px">
                <label for="nota-profesional">Profesional que atiende</label>
                <select id="nota-profesional" v-model="profesionalIdForm" required>
                  <option value="" disabled>Selecciona un profesional</option>
                  <option v-for="p in profesionales" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>

              <div class="field" style="min-width: 220px">
                <label for="nota-motivo">Motivo de la atención</label>
                <input
                  id="nota-motivo"
                  v-model="motivo"
                  type="text"
                  placeholder="Ej: Control, urgencia, endodoncia sesión 1..."
                  required
                />
              </div>
            </div>

            <div class="field">
              <label for="nota-texto">Nota clínica</label>
              <textarea
                id="nota-texto"
                v-model="notaTexto"
                rows="4"
                placeholder="Diagnóstico, procedimiento realizado, indicaciones..."
                style="border: 1px solid var(--border); border-radius: var(--radius); padding: 0.55rem 0.7rem; font-size: 1rem; font-family: inherit; resize: vertical"
                required
              />
            </div>

            <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

            <button type="submit" class="btn btn-primary" :disabled="guardando">Guardar nota</button>
          </form>
        </div>

        <div class="card" style="margin-bottom: 1.5rem">
          <div class="card-header">
            <h2>Historial clínico</h2>
          </div>
          <div v-if="notas.length === 0" class="mock-note">Aún no hay notas clínicas registradas.</div>
          <div v-else style="display: flex; flex-direction: column; gap: 1rem">
            <div v-for="nota in notas" :key="nota.id" style="border-bottom: 1px solid var(--gridline); padding-bottom: 1rem">
              <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.35rem">
                <strong>{{ nota.motivo }}</strong>
                <span style="color: var(--text-muted); font-size: 0.85rem">
                  {{ nota.fecha.toDate().toLocaleString("es-CL") }} · {{ nombreProfesional(nota.profesionalId) }}
                </span>
              </div>
              <p style="white-space: pre-wrap; margin: 0">{{ nota.notas }}</p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 1.5rem">
          <div class="card-header">
            <h2>Nueva receta</h2>
          </div>

          <form @submit.prevent="guardarReceta">
            <div v-if="rol === 'admin'" class="field" style="min-width: 200px; max-width: 280px">
              <label for="receta-profesional">Profesional que emite</label>
              <select id="receta-profesional" v-model="profesionalIdRecetaForm" required>
                <option value="" disabled>Selecciona un profesional</option>
                <option v-for="p in profesionales" :key="p.id" :value="p.id">{{ p.nombre }}</option>
              </select>
            </div>

            <div
              v-for="(item, index) in itemsForm"
              :key="index"
              style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end"
            >
              <div class="field" style="min-width: 200px; flex: 1">
                <label :for="`receta-medicamento-${index}`">Medicamento</label>
                <input
                  :id="`receta-medicamento-${index}`"
                  v-model="item.medicamento"
                  type="text"
                  placeholder="Ej: Amoxicilina 500mg"
                />
              </div>
              <div class="field" style="min-width: 240px; flex: 2">
                <label :for="`receta-indicaciones-${index}`">Indicaciones</label>
                <input
                  :id="`receta-indicaciones-${index}`"
                  v-model="item.indicaciones"
                  type="text"
                  placeholder="Ej: 1 comprimido cada 8 horas por 7 días"
                />
              </div>
              <button
                v-if="itemsForm.length > 1"
                type="button"
                class="btn btn-secondary"
                style="margin-bottom: 1rem"
                @click="quitarItem(index)"
              >
                Quitar
              </button>
            </div>

            <button type="button" class="btn btn-secondary" style="margin-bottom: 1rem" @click="agregarItem">
              + Agregar medicamento
            </button>

            <div class="field">
              <label for="receta-observaciones">Observaciones (opcional)</label>
              <input id="receta-observaciones" v-model="observacionesForm" type="text" placeholder="Ej: Control en 7 días" />
            </div>

            <p v-if="errorReceta" class="badge badge--critical" style="margin-bottom: 1rem">{{ errorReceta }}</p>

            <button type="submit" class="btn btn-primary" :disabled="guardandoReceta">Guardar receta</button>
          </form>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Recetas emitidas</h2>
          </div>
          <div v-if="recetas.length === 0" class="mock-note">Aún no hay recetas emitidas.</div>
          <div v-else style="display: flex; flex-direction: column; gap: 1rem">
            <div v-for="receta in recetas" :key="receta.id" style="border-bottom: 1px solid var(--gridline); padding-bottom: 1rem">
              <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 0.5rem">
                <span style="color: var(--text-muted); font-size: 0.85rem">
                  {{ receta.fecha.toDate().toLocaleDateString("es-CL") }} · {{ nombreProfesional(receta.profesionalId) }}
                </span>
                <button type="button" class="btn btn-secondary" @click="imprimirReceta(receta)">Imprimir</button>
              </div>
              <ul style="margin: 0 0 0.5rem; padding-left: 1.1rem">
                <li v-for="(item, i) in receta.items" :key="i">
                  <strong>{{ item.medicamento }}</strong>
                  <span v-if="item.indicaciones"> — {{ item.indicaciones }}</span>
                </li>
              </ul>
              <p v-if="receta.observaciones" style="margin: 0; color: var(--text-secondary)">{{ receta.observaciones }}</p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </main>
</template>
