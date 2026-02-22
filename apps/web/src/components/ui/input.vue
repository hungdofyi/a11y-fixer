<script setup lang="ts">
// shadcn-vue Input component
import { cn } from '@/lib/utils.js';

const props = defineProps<{
  class?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}>();

const model = defineModel<string>();
</script>

<template>
  <input
    v-bind="$attrs"
    v-model="model"
    :id="id"
    :type="type ?? 'text'"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :class="cn(
      'flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
      'placeholder:text-slate-400',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
  />
</template>
