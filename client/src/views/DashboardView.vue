<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import { navItems } from "@/router/nav";

const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

const auth = useAuthStore();
const { user, rol, clinicaId, profesionalId } = storeToRefs(auth);

const rolLabels: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  dentista: "Dentista",
  paciente: "Paciente",
};

const accesos = computed(() =>
  navItems.filter((item) => item.to !== "/dashboard" && rol.value && item.roles.includes(rol.value)),
);

// Solo para dentista: cuántas citas de hoy ya atendió.
const atendidasHoy = ref(0);
let unsubAtendidasHoy: (() => void) | undefined;

onMounted(() => {
  if (rol.value !== "dentista" || !clinicaId.value || !profesionalId.value) return;

  const hoy = new Date();
  const inicioDia = Timestamp.fromDate(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0));
  const finDia = Timestamp.fromDate(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 0, 0, 0));

  unsubAtendidasHoy = onSnapshot(
    query(
      collection(db, "citas"),
      where("clinicaId", "==", clinicaId.value),
      where("profesionalId", "==", profesionalId.value),
      where("estado", "==", "atendida"),
      where("inicio", ">=", inicioDia),
      where("inicio", "<", finDia)
    ),
    (snap) => {
      atendidasHoy.value = snap.size;
    }
  );
});

onUnmounted(() => unsubAtendidasHoy?.());

// Solo para dentista: comisión sobre lo efectivamente cobrado en caja de
// sus tratamientos. El día/mes se calculan con la hora local del
// navegador (igual que "atendidas hoy" arriba); la Cloud Function solo
// filtra y devuelve los montos crudos para evitar desajustes de huso
// horario con el runtime (que corre en UTC).
function claveDia(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const comisionPorcentaje = ref(0);
const comisionHoy = ref(0);
const comisionMes = ref(0);
const detalleComisionPorDia = ref<{ fecha: string; ingresos: number; comision: number }[]>([]);
const mostrarDetalleComision = ref(false);
const cargandoComision = ref(false);

const obtenerComisionDentistaFn = httpsCallable<
  { inicioMesMillis: number; finMesMillis: number },
  { comisionPorcentaje: number; movimientos: { fechaMillis: number; monto: number }[] }
>(functions, "obtenerComisionDentista");

async function cargarComision() {
  if (rol.value !== "dentista") return;

  cargandoComision.value = true;
  try {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1, 0, 0, 0);

    const { data } = await obtenerComisionDentistaFn({
      inicioMesMillis: inicioMes.getTime(),
      finMesMillis: finMes.getTime(),
    });

    comisionPorcentaje.value = data.comisionPorcentaje;
    const factor = data.comisionPorcentaje / 100;

    const porDia = new Map<string, { fecha: Date; ingresos: number }>();
    for (const m of data.movimientos) {
      const fecha = new Date(m.fechaMillis);
      const clave = claveDia(fecha);
      const actual = porDia.get(clave) ?? { fecha, ingresos: 0 };
      actual.ingresos += m.monto;
      porDia.set(clave, actual);
    }

    detalleComisionPorDia.value = [...porDia.entries()]
      .sort(([claveA], [claveB]) => (claveA < claveB ? 1 : -1))
      .map(([, { fecha, ingresos }]) => ({
        fecha: fecha.toLocaleDateString("es-CL"),
        ingresos,
        comision: ingresos * factor,
      }));

    comisionMes.value = detalleComisionPorDia.value.reduce((s, d) => s + d.comision, 0);
    comisionHoy.value = porDia.get(claveDia(hoy))?.ingresos ? porDia.get(claveDia(hoy))!.ingresos * factor : 0;
  } finally {
    cargandoComision.value = false;
  }
}

onMounted(cargarComision);
</script>

<template>
  <main>
    <h1>Hola, {{ user?.email }}</h1>
    <p>
      Rol: <strong>{{ rol ? rolLabels[rol] ?? rol : "(sin rol asignado)" }}</strong>
      · Clínica: <strong>{{ clinicaId ?? "(sin clínica asignada)" }}</strong>
    </p>

    <section v-if="rol === 'dentista'" class="stat-grid">
      <div class="stat-tile">
        <div class="stat-label">Pacientes atendidos hoy</div>
        <div class="stat-value">{{ atendidasHoy }}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Comisión de hoy ({{ comisionPorcentaje }}%)</div>
        <div class="stat-value">{{ formatoCLP.format(comisionHoy) }}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Comisión del mes</div>
        <div class="stat-value">{{ formatoCLP.format(comisionMes) }}</div>
      </div>
    </section>

    <section v-if="rol === 'dentista'" class="card" style="margin-top: 1rem">
      <div class="card-header">
        <h2>Detalle de comisión por día</h2>
        <button type="button" class="btn btn-secondary" @click="mostrarDetalleComision = !mostrarDetalleComision">
          {{ mostrarDetalleComision ? "Ocultar" : "Ver detalle" }}
        </button>
      </div>
      <div v-if="mostrarDetalleComision" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ingresos vinculados</th>
              <th>Comisión</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detalleComisionPorDia" :key="d.fecha">
              <td>{{ d.fecha }}</td>
              <td>{{ formatoCLP.format(d.ingresos) }}</td>
              <td>{{ formatoCLP.format(d.comision) }}</td>
            </tr>
            <tr v-if="!cargandoComision && detalleComisionPorDia.length === 0">
              <td colspan="3">Sin ingresos vinculados a tus tratamientos este mes.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="access-grid">
      <router-link v-for="item in accesos" :key="item.to" :to="item.to" class="access-card card">
        <h2>{{ item.label }}</h2>
        <span class="access-cta">Ver más →</span>
      </router-link>
    </section>
  </main>
</template>

<style scoped>
.access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.access-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.access-card:hover {
  border-color: var(--brand-purple);
  transform: translateY(-2px);
}

.access-card h2 {
  font-size: 1.05rem;
  color: var(--brand-purple);
}

.access-cta {
  font-size: 0.85rem;
  color: var(--brand-pink);
  font-weight: 600;
}
</style>
