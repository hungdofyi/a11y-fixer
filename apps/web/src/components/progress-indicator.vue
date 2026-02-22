<script setup lang="ts">
// Shows scan progress with status text and optional percentage bar
defineProps<{
  status: string;
  percent?: number;
  message?: string;
}>();
</script>

<template>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg" role="status" aria-live="polite">
    <div class="flex justify-between items-center mb-2">
      <span class="font-semibold text-sm text-blue-600">{{ status }}</span>
      <span v-if="percent !== undefined" class="text-sm text-slate-500">{{ percent }}%</span>
    </div>
    <div
      v-if="percent !== undefined"
      class="h-2 bg-slate-200 rounded-full overflow-hidden"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full bg-blue-600 rounded-full transition-[width] duration-300 ease-in-out"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <p v-if="message" class="mt-2 text-xs text-slate-500">{{ message }}</p>
  </div>
</template>
