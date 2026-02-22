<script setup lang="ts">
// Colored badge displaying a severity level with accessible contrast
import UiBadge from './ui/badge.vue';

const props = defineProps<{ severity: 'critical' | 'serious' | 'moderate' | 'minor' }>();

type BadgeVariant = 'critical' | 'serious' | 'moderate' | 'minor';
</script>

<template>
  <UiBadge :variant="props.severity as BadgeVariant" role="status">
    {{ severity }}
  </UiBadge>
</template>
