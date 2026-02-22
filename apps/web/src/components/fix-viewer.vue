<script setup lang="ts">
// Displays fix suggestion with affected element HTML and suggested fix
defineProps<{
  element?: string;
  fixSuggestion?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-if="element" class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">Affected Element</h3>
      <pre
        class="bg-slate-800 text-slate-100 p-4 rounded-md overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap break-all"
        tabindex="0"
        aria-label="Affected HTML element"
      ><code>{{ element }}</code></pre>
    </div>

    <div v-if="fixSuggestion" class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">Fix Suggestion</h3>
      <div class="bg-slate-50 border border-slate-200 border-l-4 border-l-blue-600 px-4 py-3.5 rounded-r-md text-sm leading-relaxed text-slate-900">
        {{ fixSuggestion }}
      </div>
    </div>

    <p v-if="!element && !fixSuggestion" class="text-sm text-slate-500 italic">
      No fix suggestion available for this issue.
    </p>
  </div>
</template>
