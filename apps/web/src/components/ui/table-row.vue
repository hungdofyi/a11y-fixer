<script setup lang="ts">
// shadcn-vue TableRow component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <tr :class="cn('border-b border-slate-200 transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate-100', props.class)">
    <slot />
  </tr>
</template>
