<script setup lang="ts">
// VPAT wizard step 1: select a project from the list
import type { Project } from '../stores/project-store.js';
import UiButton from './ui/button.vue';

defineProps<{ projects: Project[]; loading?: boolean; modelValue: string }>();
const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'next'): void;
}>();
</script>

<template>
  <section aria-labelledby="step1-heading">
    <h2 id="step1-heading" class="text-lg font-semibold text-slate-900 mb-4">Select a Project</h2>
    <div v-if="loading" class="text-sm text-slate-500 py-4">Loading projects…</div>
    <div v-else class="flex flex-col gap-2 my-4" role="radiogroup" aria-label="Projects">
      <label
        v-for="project in projects"
        :key="project.id"
        class="flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors"
        :class="modelValue === project.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'"
      >
        <input
          type="radio"
          name="vpat-project"
          :value="project.id"
          :checked="modelValue === project.id"
          @change="emit('update:modelValue', project.id)"
          class="flex-shrink-0"
        />
        <span class="flex flex-col gap-0.5">
          <strong class="text-sm font-semibold text-slate-900">{{ project.name }}</strong>
          <span class="text-xs text-slate-500">{{ project.url }}</span>
        </span>
      </label>
      <p v-if="projects.length === 0" class="text-sm text-slate-500 py-2">
        No projects available. Create a project first.
      </p>
    </div>
    <div class="flex gap-3 mt-5">
      <UiButton :disabled="!modelValue" @click="emit('next')">
        Next →
      </UiButton>
    </div>
  </section>
</template>
