<script setup lang="ts">
// shadcn-vue CardHeader component
import { cn } from '@/lib/utils.js';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div :class="cn('flex flex-col space-y-1.5 p-6', props.class)">
    <slot />
  </div>
</template>
