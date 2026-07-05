<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";

const { user, rol, clinicaId, loading } = storeToRefs(useAuthStore());
</script>

<template>
  <main v-if="loading">
    <p>Cargando...</p>
  </main>
  <main v-else-if="!user">
    <p>
      No has iniciado sesion. <router-link to="/login">Ir a login</router-link>
    </p>
  </main>
  <main v-else>
    <h1>Dashboard</h1>
    <p>Email: {{ user.email }}</p>
    <p>Rol: {{ rol ?? "(sin rol asignado)" }}</p>
    <p>Clinica: {{ clinicaId ?? "(sin clinica asignada)" }}</p>
  </main>
</template>
