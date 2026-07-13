<script setup lang="ts">
import AppHeader from "@/components/AppHeader.vue";
import AppSidebar from "@/components/AppSidebar.vue";
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-content">
      <AppHeader />
      <main class="app-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
}

.app-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  padding: 2rem;
  overflow: auto;
}

@media (max-width: 900px) {
  .app-shell {
    flex-direction: column;
  }

  .app-main {
    padding: 1.5rem;
  }
}
</style>
