<script setup lang="ts">
// shadcn-vue TableCell (td) component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <td :class="cn('px-3 py-2.5 align-top [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', props.class)">
    <slot />
  </td>
</template>
