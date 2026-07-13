<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { navItems } from "@/router/nav";

const { user, rol, clinicaId } = storeToRefs(useAuthStore());

const rolLabels: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  dentista: "Dentista",
  paciente: "Paciente",
};

const accesos = computed(() =>
  navItems.filter((item) => item.to !== "/dashboard" && rol.value && item.roles.includes(rol.value)),
);
</script>

<template>
  <main>
    <h1>Hola, {{ user?.email }}</h1>
    <p>
      Rol: <strong>{{ rol ? rolLabels[rol] ?? rol : "(sin rol asignado)" }}</strong>
      · Clínica: <strong>{{ clinicaId ?? "(sin clínica asignada)" }}</strong>
    </p>

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
