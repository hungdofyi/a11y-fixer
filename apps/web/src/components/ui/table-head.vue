<script setup lang="ts">
// shadcn-vue TableHead (th) component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string; scope?: string }>();
</script>

<template>
  <th
    :scope="scope ?? 'col'"
    :class="cn('h-10 px-3 text-left align-middle font-semibold text-xs uppercase tracking-wide text-slate-500 bg-slate-50 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', props.class)"
  >
    <slot />
  </th>
</template>
