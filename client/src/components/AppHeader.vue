<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { user, rol } = storeToRefs(authStore);

const rolLabels: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  dentista: "Dentista",
  paciente: "Paciente",
};

const pageTitle = computed(() => route.meta.title ?? "Maxilus Dental");

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}
</script>

<template>
  <header class="app-header">
    <h1 class="page-title">{{ pageTitle }}</h1>

    <div class="account">
      <div class="account-info">
        <span class="account-email">{{ user?.email }}</span>
        <span class="account-role">{{ rol ? rolLabels[rol] ?? rol : "Sin rol" }}</span>
      </div>
      <button type="button" class="btn btn-secondary" @click="handleLogout">Cerrar sesión</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 2rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.page-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  margin: 0;
}

.account {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.account-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
}

.account-email {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.account-role {
  font-size: 0.75rem;
  color: var(--brand-pink);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

@media (max-width: 640px) {
  .app-header {
    padding: 0 1.25rem;
  }

  .account-info {
    display: none;
  }
}
</style>
