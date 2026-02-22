<script setup lang="ts">
// Displays element screenshot with loading fallback
import { ref } from 'vue';

defineProps<{ screenshotUrl?: string; alt?: string }>();

const imgError = ref(false);
</script>

<template>
  <div v-if="screenshotUrl && !imgError" class="rounded-lg border border-slate-200 overflow-hidden">
    <img
      :src="screenshotUrl"
      :alt="alt ?? 'Element screenshot showing the violating element highlighted on the page'"
      class="w-full h-auto"
      loading="lazy"
      @error="imgError = true"
    />
  </div>
</template>
