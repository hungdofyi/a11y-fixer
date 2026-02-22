<script setup lang="ts">
// Displays HTML snippet with basic CSS-only syntax highlighting
import { computed } from 'vue';

const props = defineProps<{ html?: string }>();

/** Escape HTML entities then apply syntax coloring via a single-pass tokenizer */
function highlightHtml(raw: string): string {
  // Tokenize raw HTML into tags and text segments, then highlight each tag
  const parts: string[] = [];
  const tagRegex = /(<\/?)([\w-]+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*)\s*(\/?>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(raw)) !== null) {
    // Escaped text before this tag
    if (match.index > lastIndex) {
      parts.push(escapeHtml(raw.slice(lastIndex, match.index)));
    }
    const [, opener, tagName, attrs, closer] = match;
    // Build highlighted tag
    let result = escapeHtml(opener);
    result += `<span class="hl-tag">${escapeHtml(tagName)}</span>`;
    // Highlight individual attributes within the attrs string
    if (attrs) {
      result += attrs.replace(
        /([\w-]+)(\s*=\s*)(["'])([^"']*)\3/g,
        (_m, name: string, eq: string, quote: string, val: string) =>
          `<span class="hl-attr">${escapeHtml(name)}</span>${escapeHtml(eq)}${escapeHtml(quote)}<span class="hl-val">${escapeHtml(val)}</span>${escapeHtml(quote)}`
      );
    }
    result += escapeHtml(closer);
    parts.push(result);
    lastIndex = tagRegex.lastIndex;
  }
  // Remaining text after last tag
  if (lastIndex < raw.length) {
    parts.push(escapeHtml(raw.slice(lastIndex)));
  }
  return parts.join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

<style scoped>
:deep(.hl-tag) { color: #60a5fa; }
:deep(.hl-attr) { color: #4ade80; }
:deep(.hl-val) { color: #fbbf24; }
</style>
