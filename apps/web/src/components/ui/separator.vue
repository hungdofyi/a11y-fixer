<script setup lang="ts">
// shadcn-vue Separator component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string; orientation?: 'horizontal' | 'vertical' }>();
</script>

<template>
  <div
    role="separator"
    :aria-orientation="orientation ?? 'horizontal'"
    :class="cn(
      'shrink-0 bg-slate-200',
      (orientation ?? 'horizontal') === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      props.class
    )"
  />
</template>
