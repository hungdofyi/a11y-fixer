<script setup lang="ts">
// Displays fix suggestion: parses JSON for code before/after diff, falls back to plain text
import { computed } from 'vue';
import HtmlSnippetViewer from './html-snippet-viewer.vue';

interface ParsedFix {
  description: string;
  codeSnippetBefore: string;
  codeSnippetAfter: string;
  confidence?: number;
}

const props = defineProps<{
  element?: string;
  fixSuggestion?: string;
}>();

const parsedFix = computed<ParsedFix | null>(() => {
  if (!props.fixSuggestion) return null;
  try {
    const obj = JSON.parse(props.fixSuggestion) as Record<string, unknown>;
    if (typeof obj.description === 'string' && typeof obj.codeSnippetBefore === 'string' && typeof obj.codeSnippetAfter === 'string') {
      return obj as unknown as ParsedFix;
    }
    return null;
  } catch {
    return null;
  }
});
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Structured AI fix with code diff -->
    <template v-if="parsedFix">
      <p class="text-sm leading-relaxed text-slate-900">{{ parsedFix.description }}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <h3 class="text-xs font-bold uppercase tracking-wide text-red-500">Before</h3>
          <HtmlSnippetViewer :html="parsedFix.codeSnippetBefore" />
        </div>
        <div class="flex flex-col gap-1">
          <h3 class="text-xs font-bold uppercase tracking-wide text-green-600">After</h3>
          <HtmlSnippetViewer :html="parsedFix.codeSnippetAfter" />
        </div>
      </div>
      <span
        v-if="parsedFix.confidence"
        class="inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 w-fit"
      >{{ Math.round(parsedFix.confidence * 100) }}% confidence</span>
    </template>

    <!-- Fallback: plain text fix suggestion -->
    <template v-else-if="fixSuggestion">
      <div v-if="element" class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">Affected Element</h3>
        <HtmlSnippetViewer :html="element" />
      </div>
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">Fix Suggestion</h3>
        <div class="bg-slate-50 border border-slate-200 border-l-4 border-l-blue-600 px-4 py-3.5 rounded-r-md text-sm leading-relaxed text-slate-900">
          {{ fixSuggestion }}
        </div>
      </div>
    </template>

    <!-- No fix at all -->
    <p v-else-if="!element" class="text-sm text-slate-500 italic">
      No fix suggestion available for this issue.
    </p>

    <!-- Element only, no fix -->
    <div v-else class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wide text-slate-500">Affected Element</h3>
      <HtmlSnippetViewer :html="element" />
    </div>
  </div>
</template>
