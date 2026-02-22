<script setup lang="ts">
// Parses axe failureSummary into instruction + numbered steps
import { computed } from 'vue';

const props = defineProps<{ failureSummary?: string; helpUrl?: string }>();

const parsed = computed(() => {
  if (!props.failureSummary) return null;
  const lines = props.failureSummary.split('\n').map(l => l.trim()).filter(Boolean);
  return {
    instruction: lines[0] ?? '',
    steps: lines.slice(1),
  };
});
</script>

<template>
  <div v-if="parsed" class="flex flex-col gap-3">
    <p class="text-sm font-semibold text-slate-900">{{ parsed.instruction }}</p>
    <ol v-if="parsed.steps.length" class="list-decimal list-inside space-y-1.5">
      <li v-for="(step, i) in parsed.steps" :key="i" class="text-sm text-slate-700 leading-relaxed">
        {{ step }}
      </li>
    </ol>
    <a
      v-if="helpUrl"
      :href="helpUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
    >
      View rule documentation →
    </a>
  </div>
  <p v-else class="text-sm text-slate-500 italic">No fix steps available.</p>
</template>
