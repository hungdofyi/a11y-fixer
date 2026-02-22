<script setup lang="ts">
// Displays HTML snippet with basic CSS-only syntax highlighting
import { computed } from 'vue';

const props = defineProps<{ html?: string }>();

/** Escape HTML entities then apply syntax coloring via spans */
function highlightHtml(raw: string): string {
  // First, escape all HTML entities to prevent XSS
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Apply syntax coloring on the escaped string
  return escaped
    // Tag names: <tagname or </tagname
    .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="text-blue-400">$2</span>')
    // Attribute values: ="value"
    .replace(/(&quot;)(.*?)(&quot;)/g, '<span class="text-amber-400">$1$2$3</span>')
    // Attribute names: word=
    .replace(/([\w-]+)(=)/g, '<span class="text-green-400">$1</span>$2');
}

const highlighted = computed(() => props.html ? highlightHtml(props.html) : '');
</script>

<template>
  <div v-if="html" class="rounded-lg overflow-hidden">
    <pre
      class="bg-slate-800 text-slate-100 p-4 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap break-all"
      tabindex="0"
      aria-label="HTML element source code"
    ><code v-html="highlighted"></code></pre>
  </div>
</template>
