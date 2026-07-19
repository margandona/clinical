<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { Timestamp, addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Paciente } from "@/types/catalogo";
import type { MetodoPago, MovimientoCaja, Presupuesto, TipoMovimientoCaja } from "@/types/finanzas";

const auth = useAuthStore();
const { clinicaId } = storeToRefs(auth);

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

const movimientos = ref<MovimientoCaja[]>([]);
const pacientes = ref<Paciente[]>([]);
const presupuestos = ref<Presupuesto[]>([]);
let unsubs: Array<() => void> = [];

onMounted(() => {
  const cid = clinicaId.value;
  if (!cid) return;

  unsubs.push(
    onSnapshot(query(collection(db, "caja"), where("clinicaId", "==", cid)), (snap) => {
      movimientos.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<MovimientoCaja, "id">) }))
        .sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "pacientes"), where("clinicaId", "==", cid)), (snap) => {
      pacientes.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Paciente, "id">) }));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "presupuestos"), where("clinicaId", "==", cid), where("estado", "==", "aceptado")), (snap) => {
      presupuestos.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Presupuesto, "id">) }));
    })
  );
});

onUnmounted(() => unsubs.forEach((u) => u()));

function esHoy(fecha: Timestamp) {
  const d = fecha.toDate();
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString();
}

const totalIngresosHoy = computed(() =>
  movimientos.value.filter((m) => m.tipo === "ingreso" && esHoy(m.fecha)).reduce((s, m) => s + m.monto, 0)
);
const totalEgresosHoy = computed(() =>
  movimientos.value.filter((m) => m.tipo === "egreso" && esHoy(m.fecha)).reduce((s, m) => s + m.monto, 0)
);
const saldoTotal = computed(() =>
  movimientos.value.reduce((s, m) => s + (m.tipo === "ingreso" ? m.monto : -m.monto), 0)
);

function nombrePaciente(id?: string) {
  if (!id) return "—";
  return pacientes.value.find((p) => p.id === id)?.nombre ?? id;
}

function saldoPendiente(presupuesto: Presupuesto) {
  const pagado = movimientos.value
    .filter((m) => m.presupuestoId === presupuesto.id && m.tipo === "ingreso")
    .reduce((s, m) => s + m.monto, 0);
  return presupuesto.monto - pagado;
}

const presupuestosConSaldo = computed(() => presupuestos.value.filter((p) => saldoPendiente(p) > 0));

// --- Formulario de nuevo movimiento ---
const tipo = ref<TipoMovimientoCaja>("ingreso");
const concepto = ref("");
const monto = ref<number | null>(null);
const metodo = ref<MetodoPago>("Efectivo");
const rutPaciente = ref("");
const presupuestoId = ref("");
const guardando = ref(false);
const error = ref("");

const pacienteEncontrado = computed(() => pacientes.value.find((p) => p.id === rutPaciente.value.trim()));
const presupuestosDelPaciente = computed(() =>
  pacienteEncontrado.value
    ? presupuestosConSaldo.value.filter((p) => p.pacienteId === pacienteEncontrado.value!.id)
    : []
);

watch(rutPaciente, () => {
  presupuestoId.value = "";
});

function limpiarFormulario() {
  concepto.value = "";
  monto.value = null;
  rutPaciente.value = "";
  presupuestoId.value = "";
  error.value = "";
}

async function registrarMovimiento() {
  error.value = "";
  const cid = clinicaId.value;
  const conceptoLimpio = concepto.value.trim();

  if (!cid) return;
  if (!conceptoLimpio) {
    error.value = "Describe el concepto del movimiento.";
    return;
  }
  if (!monto.value || monto.value <= 0) {
    error.value = "El monto debe ser mayor a 0.";
    return;
  }
  const rut = rutPaciente.value.trim();
  if (rut && !pacienteEncontrado.value) {
    error.value = "No existe un paciente con ese RUT.";
    return;
  }

  guardando.value = true;
  try {
    const presupuestoVinculado = presupuestos.value.find((p) => p.id === presupuestoId.value);
    await addDoc(collection(db, "caja"), {
      clinicaId: cid,
      fecha: Timestamp.now(),
      concepto: conceptoLimpio,
      tipo: tipo.value,
      monto: monto.value,
      metodo: metodo.value,
      ...(pacienteEncontrado.value ? { pacienteId: pacienteEncontrado.value.id } : {}),
      ...(presupuestoId.value ? { presupuestoId: presupuestoId.value } : {}),
      ...(presupuestoVinculado ? { profesionalId: presupuestoVinculado.profesionalId } : {}),
    });
    limpiarFormulario();
  } catch (e) {
    error.value = "No se pudo registrar el movimiento. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <main>
    <h1>Caja</h1>

    <section class="stat-grid">
      <div class="stat-tile">
        <div class="stat-label">Ingresos de hoy</div>
        <div class="stat-value">{{ formatoCLP.format(totalIngresosHoy) }}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Egresos de hoy</div>
        <div class="stat-value">{{ formatoCLP.format(totalEgresosHoy) }}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Saldo total registrado</div>
        <div class="stat-value">{{ formatoCLP.format(saldoTotal) }}</div>
      </div>
    </section>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>Registrar movimiento</h2>
      </div>

      <form @submit.prevent="registrarMovimiento">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="max-width: 160px">
            <label for="mov-tipo">Tipo</label>
            <select id="mov-tipo" v-model="tipo">
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>

          <div class="field" style="flex: 1; min-width: 220px">
            <label for="mov-concepto">Concepto</label>
            <input id="mov-concepto" v-model="concepto" type="text" placeholder="Ej: Abono endodoncia — Josefina Rojas" required />
          </div>

          <div class="field" style="max-width: 180px">
            <label for="mov-monto">Monto (CLP)</label>
            <input id="mov-monto" v-model.number="monto" type="number" min="1" step="1000" required />
          </div>

          <div class="field" style="max-width: 180px">
            <label for="mov-metodo">Método</label>
            <select id="mov-metodo" v-model="metodo">
              <option value="Efectivo">Efectivo</option>
              <option value="Débito">Débito</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>
        </div>

        <div v-if="tipo === 'ingreso'" style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="max-width: 200px">
            <label for="mov-rut">RUT del paciente (opcional)</label>
            <input id="mov-rut" v-model="rutPaciente" type="text" placeholder="Ej: 12345678-9" />
          </div>

          <div v-if="pacienteEncontrado" class="field" style="min-width: 240px">
            <label for="mov-presupuesto">Abono a presupuesto (opcional)</label>
            <select id="mov-presupuesto" v-model="presupuestoId">
              <option value="">Sin vincular</option>
              <option v-for="p in presupuestosDelPaciente" :key="p.id" :value="p.id">
                {{ p.tratamiento }} — saldo {{ formatoCLP.format(saldoPendiente(p)) }}
              </option>
            </select>
            <p class="mock-note" style="margin: 0.4rem 0 0">
              💡 Vincular el pago a un presupuesto es lo que permite calcular la comisión del doctor.
            </p>
          </div>
          <p v-else-if="rutPaciente.trim()" class="mock-note" style="align-self: flex-end">
            No existe un paciente con ese RUT.
          </p>
        </div>

        <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

        <button type="submit" class="btn btn-primary" :disabled="guardando">Registrar movimiento</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Movimientos</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Paciente</th>
              <th>Método</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movimientos" :key="m.id">
              <td>{{ m.fecha.toDate().toLocaleDateString("es-CL") }}</td>
              <td>{{ m.concepto }}</td>
              <td>{{ nombrePaciente(m.pacienteId) }}</td>
              <td>{{ m.metodo }}</td>
              <td :class="m.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-egreso'">
                {{ m.tipo === "ingreso" ? "+" : "−" }}{{ formatoCLP.format(m.monto) }}
              </td>
            </tr>
            <tr v-if="movimientos.length === 0">
              <td colspan="5">Aún no hay movimientos registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<style scoped>
.monto-ingreso {
  color: var(--success-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.monto-egreso {
  color: var(--critical-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
