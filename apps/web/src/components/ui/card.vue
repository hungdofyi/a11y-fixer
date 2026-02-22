<script setup lang="ts">
// shadcn-vue Card root component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div :class="cn('rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm', props.class)">
    <slot />
  </div>
</template>
