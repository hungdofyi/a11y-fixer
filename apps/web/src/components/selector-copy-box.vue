<script setup lang="ts">
// Monospace selector display with copy-to-clipboard button
import { ref } from 'vue';

defineProps<{ selector?: string }>();

const copied = ref(false);

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // Clipboard API unavailable (e.g. HTTP context)
  }
}
</script>

<template>
  <div v-if="selector" class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-md px-3 py-2">
    <code class="flex-1 text-xs font-mono truncate text-slate-800 dark:text-slate-200">{{ selector }}</code>
    <button
      type="button"
      class="shrink-0 text-xs font-medium px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
      :aria-label="copied ? 'Copied to clipboard' : 'Copy CSS selector'"
      @click="copy(selector)"
    >
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
  </div>
</template>
