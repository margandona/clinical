<script setup lang="ts"></script>

<template>
  <main class="not-found">
    <h1>404</h1>
    <p>La página que buscás no existe.</p>
    <router-link to="/dashboard" class="btn btn-primary">Ir al inicio</router-link>
  </main>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 1.5rem;
}

.not-found h1 {
  font-size: 3rem;
  color: var(--brand-purple);
}
</style>
