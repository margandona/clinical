<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Box, Especialidad } from "@/types/catalogo";
import type { Cita } from "@/types/agenda";
import type { MovimientoCaja, Presupuesto } from "@/types/finanzas";

// Métricas calculadas en el cliente a partir de los datos reales ya
// sembrados/creados (citas, presupuestos, caja). Para volúmenes grandes,
// esto debería moverse a documentos de agregados actualizados por Cloud
// Functions (ver Contexto/04-plan-desarrollo.md, nota de diseño Firestore);
// a esta escala, calcularlo al vuelo es suficiente y evita construir esa
// infraestructura antes de tiempo.

const auth = useAuthStore();
const { clinicaId } = storeToRefs(auth);

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", notation: "compact", maximumFractionDigits: 1 });

const citas = ref<Cita[]>([]);
const boxes = ref<Box[]>([]);
const especialidades = ref<Especialidad[]>([]);
const presupuestos = ref<Presupuesto[]>([]);
const caja = ref<MovimientoCaja[]>([]);
let unsubs: Array<() => void> = [];

onMounted(() => {
  const cid = clinicaId.value;
  if (!cid) return;

  unsubs.push(
    onSnapshot(query(collection(db, "citas"), where("clinicaId", "==", cid)), (snap) => {
      citas.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Cita, "id">) }));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "boxes"), where("clinicaId", "==", cid)), (snap) => {
      boxes.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Box, "id">) }));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "especialidades"), where("clinicaId", "==", cid)), (snap) => {
      especialidades.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Especialidad, "id">) }));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "presupuestos"), where("clinicaId", "==", cid)), (snap) => {
      presupuestos.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Presupuesto, "id">) }));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "caja"), where("clinicaId", "==", cid)), (snap) => {
      caja.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MovimientoCaja, "id">) }));
    })
  );
});

onUnmounted(() => unsubs.forEach((u) => u()));

function esHoy(fecha: { toDate: () => Date }) {
  return fecha.toDate().toDateString() === new Date().toDateString();
}

// Ventana móvil de 30 días en vez de mes calendario: un corte por mes
// calendario haría que la métrica se vea vacía los primeros días de cada
// mes (poco útil para una clínica chica con volumen bajo).
const TREINTA_DIAS_MS = 30 * 86400000;
function enUltimos30Dias(fecha: { toDate: () => Date }) {
  return Date.now() - fecha.toDate().getTime() <= TREINTA_DIAS_MS;
}

const citasHoyPorBox = computed(() => {
  const citasHoy = citas.value.filter((c) => esHoy(c.inicio) && c.estado !== "cancelada");
  return boxes.value
    .map((b) => ({ nombre: `${b.nombre} (${b.tipo === "dental" ? "dental" : "médico"})`, cantidad: citasHoy.filter((c) => c.boxId === b.id).length }))
    .sort((a, b) => b.cantidad - a.cantidad);
});
const maxCitasBox = computed(() => Math.max(1, ...citasHoyPorBox.value.map((b) => b.cantidad)));

const presupuestosRecientes = computed(() => presupuestos.value.filter((p) => enUltimos30Dias(p.emision)));
const pctPresupuestosAceptados = computed(() => {
  const total = presupuestosRecientes.value.length;
  if (total === 0) return 0;
  const aceptados = presupuestosRecientes.value.filter((p) => p.estado === "aceptado").length;
  return Math.round((aceptados / total) * 100);
});

const pctInasistencias = computed(() => {
  const consideradas = citas.value.filter((c) => c.estado === "atendida" || c.estado === "inasistencia");
  if (consideradas.length === 0) return 0;
  const inasistencias = consideradas.filter((c) => c.estado === "inasistencia").length;
  return Math.round((inasistencias / consideradas.length) * 100);
});

const ingresosRecientes = computed(() =>
  caja.value.filter((m) => m.tipo === "ingreso" && enUltimos30Dias(m.fecha)).reduce((s, m) => s + m.monto, 0)
);

const ingresosPorEspecialidad = computed(() => {
  const porId = new Map<string, number>();
  for (const p of presupuestos.value) {
    if (p.estado !== "aceptado" || !p.especialidadId) continue;
    porId.set(p.especialidadId, (porId.get(p.especialidadId) ?? 0) + p.monto);
  }
  return especialidades.value
    .map((e) => ({ nombre: e.nombre, monto: porId.get(e.id) ?? 0 }))
    .filter((e) => e.monto > 0)
    .sort((a, b) => b.monto - a.monto);
});
const maxIngresoEspecialidad = computed(() => Math.max(1, ...ingresosPorEspecialidad.value.map((e) => e.monto)));
</script>

<template>
  <main>
    <h1>Panel administrativo</h1>

    <section class="stat-grid">
      <div class="stat-tile">
        <div class="stat-label">Presupuestos aceptados (últimos 30 días)</div>
        <div class="stat-value">{{ pctPresupuestosAceptados }}%</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Inasistencias (histórico)</div>
        <div class="stat-value">{{ pctInasistencias }}%</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Ingresos (últimos 30 días)</div>
        <div class="stat-value">{{ formatoCLP.format(ingresosRecientes) }}</div>
      </div>
    </section>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>Citas de hoy por box</h2>
      </div>
      <p class="mock-note">📊 Muestra volumen de citas, no % de ocupación real (falta modelar horarios/capacidad por box).</p>
      <div class="bar-row" v-for="b in citasHoyPorBox" :key="b.nombre">
        <span class="bar-label">{{ b.nombre }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: (b.cantidad / maxCitasBox) * 100 + '%' }" />
        </div>
        <span class="bar-value">{{ b.cantidad }}</span>
      </div>
      <p v-if="citasHoyPorBox.length === 0" class="mock-note">Aún no hay boxes creados.</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Ingresos por especialidad (presupuestos aceptados)</h2>
      </div>
      <div class="bar-row" v-for="e in ingresosPorEspecialidad" :key="e.nombre">
        <span class="bar-label">{{ e.nombre }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: (e.monto / maxIngresoEspecialidad) * 100 + '%' }" />
        </div>
        <span class="bar-value">{{ formatoCLP.format(e.monto) }}</span>
      </div>
      <p v-if="ingresosPorEspecialidad.length === 0" class="mock-note">
        Aún no hay presupuestos aceptados con especialidad asignada.
      </p>
    </div>
  </main>
</template>
