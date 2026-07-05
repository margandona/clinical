<script setup lang="ts">
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";

onMounted(() => {
  useAuthStore().init();
});
</script>

<template>
  <router-view />
</template>
