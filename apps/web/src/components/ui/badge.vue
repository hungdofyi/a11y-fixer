<script setup lang="ts">
// shadcn-vue Badge component with CVA variants including severity levels
import { computed } from 'vue';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600 text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'border-slate-200 text-slate-900',
        critical: 'border-red-600 bg-red-50 text-red-700',
        serious: 'border-orange-500 bg-orange-50 text-orange-800',
        moderate: 'border-yellow-500 bg-yellow-50 text-yellow-800',
        minor: 'border-blue-400 bg-blue-50 text-blue-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

const props = defineProps<{
  variant?: BadgeVariants['variant'];
  class?: string;
}>();

const classes = computed(() => cn(badgeVariants({ variant: props.variant }), props.class));
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
