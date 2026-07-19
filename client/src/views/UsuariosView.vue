<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { httpsCallable } from "firebase/functions";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, functions } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth";
import type { Rol, UsuarioRol } from "@/types/auth";
import type { Paciente, Profesional } from "@/types/catalogo";

const auth = useAuthStore();
const { clinicaId } = storeToRefs(auth);

const rolLabels: Record<Rol, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  dentista: "Dentista",
  paciente: "Paciente",
};

const usuarios = ref<UsuarioRol[]>([]);
const profesionales = ref<Profesional[]>([]);
const pacientes = ref<Paciente[]>([]);
let unsubs: Array<() => void> = [];

onMounted(() => {
  const cid = clinicaId.value;
  if (!cid) return;

  unsubs.push(
    onSnapshot(query(collection(db, "usuarios"), where("clinicaId", "==", cid)), (snap) => {
      usuarios.value = snap.docs
        .map((d) => d.data() as UsuarioRol)
        .sort((a, b) => a.email.localeCompare(b.email));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "profesionales"), where("clinicaId", "==", cid)), (snap) => {
      profesionales.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Profesional, "id">) }));
    })
  );
  unsubs.push(
    onSnapshot(query(collection(db, "pacientes"), where("clinicaId", "==", cid)), (snap) => {
      pacientes.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Paciente, "id">) }));
    })
  );
});

onUnmounted(() => unsubs.forEach((u) => u()));

function nombreProfesional(id?: string) {
  if (!id) return "—";
  return profesionales.value.find((p) => p.id === id)?.nombre ?? id;
}
function nombrePaciente(id?: string) {
  if (!id) return "—";
  return pacientes.value.find((p) => p.id === id)?.nombre ?? id;
}

// --- Nuevo usuario / reasignar rol ---
const editandoUid = ref<string | null>(null);
const email = ref("");
const password = ref("");
const rol = ref<Rol>("secretaria");
const rut = ref("");
const profesionalId = ref("");
const pacienteId = ref("");
const guardando = ref(false);
const error = ref("");

function limpiarFormulario() {
  editandoUid.value = null;
  email.value = "";
  password.value = "";
  rol.value = "secretaria";
  rut.value = "";
  profesionalId.value = "";
  pacienteId.value = "";
  error.value = "";
}

function editarUsuario(usuario: UsuarioRol) {
  editandoUid.value = usuario.uid;
  email.value = usuario.email;
  password.value = "";
  rol.value = usuario.rol;
  rut.value = usuario.rut ?? "";
  profesionalId.value = usuario.profesionalId ?? "";
  pacienteId.value = usuario.pacienteId ?? "";
  error.value = "";
}

const setUserRoleFn = httpsCallable(functions, "setUserRole");

async function guardarUsuario() {
  error.value = "";
  const cid = clinicaId.value;
  if (!cid) return;

  if (rol.value === "dentista" && !profesionalId.value) {
    error.value = "Selecciona a qué profesional corresponde este usuario dentista.";
    return;
  }
  if (rol.value === "paciente" && !pacienteId.value) {
    error.value = "Selecciona a qué paciente corresponde este usuario paciente.";
    return;
  }
  if (rol.value !== "paciente" && !rut.value.trim()) {
    error.value = "El RUT es obligatorio para admin, secretaria y dentista.";
    return;
  }
  if (!editandoUid.value && (!email.value.trim() || password.value.length < 6)) {
    error.value = "Email y una contraseña de al menos 6 caracteres son obligatorios para un usuario nuevo.";
    return;
  }

  guardando.value = true;
  try {
    await setUserRoleFn({
      ...(editandoUid.value ? { uid: editandoUid.value } : { email: email.value.trim(), password: password.value }),
      rol: rol.value,
      clinicaId: cid,
      ...(rol.value !== "paciente" ? { rut: rut.value.trim() } : {}),
      ...(rol.value === "dentista" ? { profesionalId: profesionalId.value } : {}),
      ...(rol.value === "paciente" ? { pacienteId: pacienteId.value } : {}),
    });
    limpiarFormulario();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "No se pudo guardar el usuario. Intenta nuevamente.";
    console.error(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <main>
    <h1>Usuarios</h1>
    <p class="mock-note">🔐 Los usuarios inician sesión con el email y contraseña que definas aquí; el rol controla qué ven en la app.</p>

    <div class="card" style="margin-bottom: 1.5rem">
      <div class="card-header">
        <h2>{{ editandoUid ? `Editar rol de ${email}` : "Nuevo usuario" }}</h2>
      </div>

      <form @submit.prevent="guardarUsuario">
        <div v-if="!editandoUid" style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="min-width: 220px">
            <label for="usuario-email">Email</label>
            <input id="usuario-email" v-model="email" type="email" placeholder="Ej: secretaria@maxilus.cl" required />
          </div>
          <div class="field" style="max-width: 220px">
            <label for="usuario-password">Contraseña inicial</label>
            <input id="usuario-password" v-model="password" type="text" placeholder="Mínimo 6 caracteres" required />
          </div>
        </div>

        <div style="display: flex; gap: 1rem; flex-wrap: wrap">
          <div class="field" style="max-width: 220px">
            <label for="usuario-rol">Rol</label>
            <select id="usuario-rol" v-model="rol">
              <option value="admin">Administrador</option>
              <option value="secretaria">Secretaría</option>
              <option value="dentista">Dentista</option>
              <option value="paciente">Paciente</option>
            </select>
          </div>

          <div v-if="rol !== 'paciente'" class="field" style="max-width: 220px">
            <label for="usuario-rut">RUT</label>
            <input id="usuario-rut" v-model="rut" type="text" placeholder="Ej: 12345678-9" required />
          </div>

          <div v-if="rol === 'dentista'" class="field" style="min-width: 220px">
            <label for="usuario-profesional">Profesional vinculado</label>
            <select id="usuario-profesional" v-model="profesionalId" required>
              <option value="" disabled>Selecciona un profesional</option>
              <option v-for="p in profesionales" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>

          <div v-if="rol === 'paciente'" class="field" style="min-width: 220px">
            <label for="usuario-paciente">Paciente vinculado</label>
            <select id="usuario-paciente" v-model="pacienteId" required>
              <option value="" disabled>Selecciona un paciente</option>
              <option v-for="p in pacientes" :key="p.id" :value="p.id">{{ p.nombre }} ({{ p.id }})</option>
            </select>
          </div>
        </div>

        <p v-if="error" class="badge badge--critical" style="margin-bottom: 1rem">{{ error }}</p>

        <div style="display: flex; gap: 0.6rem">
          <button type="submit" class="btn btn-primary" :disabled="guardando">
            {{ editandoUid ? "Guardar rol" : "Crear usuario" }}
          </button>
          <button v-if="editandoUid" type="button" class="btn btn-secondary" @click="limpiarFormulario">
            Cancelar
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Usuarios de la clínica</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>RUT</th>
              <th>Rol</th>
              <th>Vinculado a</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.uid">
              <td>{{ u.email }}</td>
              <td>{{ u.rut ?? "—" }}</td>
              <td><span class="badge badge--good">{{ rolLabels[u.rol] }}</span></td>
              <td>
                <span v-if="u.rol === 'dentista'">{{ nombreProfesional(u.profesionalId) }}</span>
                <span v-else-if="u.rol === 'paciente'">{{ nombrePaciente(u.pacienteId) }}</span>
                <span v-else>—</span>
              </td>
              <td>
                <button type="button" class="btn btn-secondary" @click="editarUsuario(u)">Cambiar rol</button>
              </td>
            </tr>
            <tr v-if="usuarios.length === 0">
              <td colspan="5">Aún no hay usuarios registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
