<script setup lang="ts">
// shadcn-vue CardTitle component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <h3 :class="cn('text-lg font-semibold leading-none tracking-tight', props.class)">
    <slot />
  </h3>
</template>
