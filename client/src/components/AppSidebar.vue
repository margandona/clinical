<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { navItems, type NavIcon } from "@/router/nav";
import logo from "@/assets/logo.png";

const { rol } = storeToRefs(useAuthStore());

const items = computed(() => navItems.filter((item) => rol.value && item.roles.includes(rol.value)));

const rolLabels: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  dentista: "Dentista",
  paciente: "Paciente",
};

const iconPaths: Record<NavIcon, string> = {
  dashboard: '<path d="M4 11.5 12 4 20 11.5"/><path d="M6 10 V20 H18 V10"/><path d="M10 20 V14 H14 V20"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10 H20"/><path d="M8 3 V7"/><path d="M16 3 V7"/>',
  pacientes:
    '<circle cx="9" cy="8" r="3"/><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15 20c0-2.3 1-4 3.2-4.6"/>',
  presupuestos: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h6"/><path d="M9.5 15.5h6"/>',
  caja: '<rect x="3" y="7" width="18" height="12" rx="3"/><path d="M3 10.5H21"/><circle cx="16.5" cy="14" r="1.4"/>',
  servicios: '<path d="M3 12 12 3h6a3 3 0 0 1 3 3v6l-9 9z"/><circle cx="15.5" cy="8.5" r="1.6"/>',
  boxes:
    '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  metricas: '<path d="M4 20V11"/><path d="M11 20V4"/><path d="M18 20v-8"/><path d="M3 20h18"/>',
  usuarios:
    '<circle cx="9" cy="7" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.6 5.5-5.6s5.5 2.3 5.5 5.6"/><path d="M16 4.5c1.4.4 2.4 1.7 2.4 3.2s-1 2.8-2.4 3.2"/><path d="M18.5 14.6c1.8.6 3 2.4 3 4.4"/>',
};
</script>

<template>
  <aside class="app-sidebar">
    <router-link to="/dashboard" class="sidebar-brand">
      <img :src="logo" alt="Maxilus Dental" class="sidebar-logo" />
      <span class="sidebar-brand-name">Maxilus Dental</span>
    </router-link>

    <span v-if="rol" class="sidebar-role-badge">{{ rolLabels[rol] ?? rol }}</span>

    <nav class="sidebar-nav" aria-label="Navegación principal">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="sidebar-nav-link"
        active-class="sidebar-nav-link--active"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          v-html="iconPaths[item.icon]"
        />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 264px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1.375rem 1rem;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.5rem;
  margin-bottom: 0.375rem;
  text-decoration: none;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 50%;
}

.sidebar-brand-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.94rem;
  color: var(--brand-purple);
}

.sidebar-role-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--brand-pink);
  background: var(--brand-pink-light);
  padding: 0.25rem 0.65rem;
  margin: 0 0.5rem 1.25rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sidebar-nav-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 500;
}

.sidebar-nav-link:hover {
  background: var(--brand-purple-light);
  color: var(--brand-purple);
}

.sidebar-nav-link--active {
  background: var(--brand-purple);
  color: #fff;
}

@media (max-width: 900px) {
  .app-sidebar {
    width: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .sidebar-nav-link span {
    display: none;
  }
}
</style>
