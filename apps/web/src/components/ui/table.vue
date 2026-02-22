<script setup lang="ts">
// shadcn-vue Table root component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div class="relative w-full overflow-auto">
    <table :class="cn('w-full caption-bottom text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
