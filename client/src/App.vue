<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";

const route = useRoute();
const isBlank = computed(() => !!route.meta.blank);
</script>

<template>
  <AppLayout v-if="!isBlank">
    <router-view />
  </AppLayout>
  <router-view v-else />
</template>
