<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const router = useRouter();
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
</script>

<template>
  <main>
    <h1>Iniciar sesion</h1>
    <form @submit.prevent="handleSubmit">
      <div>
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" required />
      </div>
      <div>
        <label for="password">Contrasena</label>
        <input id="password" v-model="password" type="password" required />
      </div>
      <p v-if="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? "Ingresando..." : "Ingresar" }}
      </button>
    </form>
  </main>
</template>
