<script setup lang="ts">
// Summary card showing violation count for a given severity level
const props = defineProps<{
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  count: number;
}>();

const colorMap = {
  critical: 'bg-red-50 border-red-600 text-red-700',
  serious: 'bg-orange-50 border-orange-500 text-orange-800',
  moderate: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  minor: 'bg-blue-50 border-blue-400 text-blue-800',
} as const;
</script>

<template>
  <div
    :class="['flex flex-col items-center px-6 py-5 rounded-lg border-2 min-w-[100px]', colorMap[severity]]"
    role="region"
    :aria-label="`${severity} violations: ${count}`"
  >
    <span class="text-4xl font-bold leading-none">{{ count }}</span>
    <span class="text-xs font-semibold uppercase tracking-wide mt-1.5">{{ severity }}</span>
  </div>
</template>
