<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase/client";
import logo from "@/assets/logo.png";

const router = useRouter();
const modo = ref<"email" | "rut">("email");

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

async function handleSubmit() {
  error.value = null;
  loading.value = true;
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push("/dashboard");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Error al iniciar sesion";
  } finally {
    loading.value = false;
  }
}

// --- Acceso por RUT (simulación interna de Clave Única) ---
const rut = ref("");
const clave = ref("");
const errorRut = ref<string | null>(null);
const loadingRut = ref(false);
const iniciarSesionConRutFn = httpsCallable<{ rut: string; clave: string }, { customToken: string }>(
  functions,
  "iniciarSesionConRut"
);

async function handleSubmitRut() {
  errorRut.value = null;
  loadingRut.value = true;
  try {
    const { data } = await iniciarSesionConRutFn({ rut: rut.value, clave: clave.value });
    await signInWithCustomToken(auth, data.customToken);
    router.push("/dashboard");
  } catch {
    errorRut.value = "RUT o clave incorrectos.";
  } finally {
    loadingRut.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-card card">
      <img :src="logo" alt="Maxilus Dental" class="login-logo" />
      <h1>Iniciar sesión</h1>
      <p class="login-subtitle">Sistema de gestión Maxilus Dental</p>

      <div class="login-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="login-tab"
          :class="{ 'login-tab--active': modo === 'email' }"
          @click="modo = 'email'"
        >
          Email y contraseña
        </button>
        <button
          type="button"
          role="tab"
          class="login-tab"
          :class="{ 'login-tab--active': modo === 'rut' }"
          @click="modo = 'rut'"
        >
          RUT
        </button>
      </div>

      <form v-if="modo === 'email'" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" role="alert" class="login-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary login-submit" :disabled="loading">
          {{ loading ? "Ingresando..." : "Ingresar" }}
        </button>
      </form>

      <form v-else @submit.prevent="handleSubmitRut">
        <div class="field">
          <label for="rut">RUT</label>
          <input id="rut" v-model="rut" type="text" placeholder="Ej: 12345678-9" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="clave">Clave</label>
          <input id="clave" v-model="clave" type="password" autocomplete="current-password" required />
        </div>

        <p class="login-rut-note">Acceso por RUT — modo de prueba interno, en preparación para Clave Única.</p>

        <p v-if="errorRut" role="alert" class="login-error">{{ errorRut }}</p>

        <button type="submit" class="btn btn-primary login-submit" :disabled="loadingRut">
          {{ loadingRut ? "Ingresando..." : "Ingresar con RUT" }}
        </button>
      </form>

      <router-link to="/" class="login-back">← Volver al inicio</router-link>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: radial-gradient(120% 100% at 50% 0%, var(--brand-purple-light) 0%, var(--page) 55%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: center;
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(32, 16, 41, 0.05), 0 20px 48px rgba(32, 16, 41, 0.1);
  padding: 2.25rem 2rem;
}

.login-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  align-self: center;
  margin-bottom: 0.75rem;
}

.login-card h1 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.25rem;
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.login-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  background: var(--page);
  border-radius: var(--radius);
  padding: 0.25rem;
}

.login-tab {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius) - 4px);
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.login-tab--active {
  background: var(--surface);
  color: var(--brand-purple);
  box-shadow: var(--shadow);
}

.login-rut-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: left;
  margin-bottom: 1rem;
}

.login-error {
  color: var(--critical-text);
  font-size: 0.88rem;
  text-align: left;
  margin-bottom: 1rem;
}

.login-submit {
  width: 100%;
  margin-top: 0.25rem;
}

.login-back {
  margin-top: 0.875rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
}

.login-back:hover {
  color: var(--brand-purple);
}
</style>
