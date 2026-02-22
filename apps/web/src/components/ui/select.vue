<script setup lang="ts">
// shadcn-vue Select component — native select for simplicity without radix-vue complexity
import { cn } from '@/lib/utils.js';

const props = defineProps<{
  class?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}>();

const model = defineModel<string>();
</script>

<template>
  <select
    v-bind="$attrs"
    v-model="model"
    :id="id"
    :disabled="disabled"
    :required="required"
    :class="cn(
      'flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
  >
    <slot />
  </select>
</template>
