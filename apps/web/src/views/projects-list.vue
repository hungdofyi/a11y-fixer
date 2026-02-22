<script setup lang="ts">
// Projects list view: table of projects with inline new-project form
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project-store.js';
import UiButton from '../components/ui/button.vue';
import UiCard from '../components/ui/card.vue';
import UiCardHeader from '../components/ui/card-header.vue';
import UiCardTitle from '../components/ui/card-title.vue';
import UiCardContent from '../components/ui/card-content.vue';
import UiInput from '../components/ui/input.vue';
import UiTable from '../components/ui/table.vue';
import UiTableHeader from '../components/ui/table-header.vue';
import UiTableBody from '../components/ui/table-body.vue';
import UiTableRow from '../components/ui/table-row.vue';
import UiTableHead from '../components/ui/table-head.vue';
import UiTableCell from '../components/ui/table-cell.vue';

const router = useRouter();
const store = useProjectStore();

const showForm = ref(false);
const newName = ref('');
const newUrl = ref('');
const submitting = ref(false);

onMounted(() => { void store.fetchProjects(); });

async function handleCreate(): Promise<void> {
  if (!newName.value.trim() || !newUrl.value.trim()) return;
  submitting.value = true;
  const project = await store.createProject({ name: newName.value.trim(), url: newUrl.value.trim() });
  submitting.value = false;
  if (project) {
    newName.value = '';
    newUrl.value = '';
    showForm.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<template>
  <div class="max-w-3xl">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-900">Projects</h1>
      <UiButton @click="showForm = !showForm" :aria-expanded="showForm">
        + New Project
      </UiButton>
    </div>

    <UiCard v-if="showForm" class="mb-6" role="region" aria-label="Create new project">
      <UiCardHeader>
        <UiCardTitle>Create Project</UiCardTitle>
      </UiCardHeader>
      <UiCardContent>
        <form @submit.prevent="handleCreate" novalidate class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="proj-name" class="text-sm font-semibold text-slate-700">
              Project Name <span aria-hidden="true">*</span>
            </label>
            <UiInput id="proj-name" v-model="newName" type="text" required placeholder="My Website" class="max-w-md" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="proj-url" class="text-sm font-semibold text-slate-700">
              URL <span aria-hidden="true">*</span>
            </label>
            <UiInput id="proj-url" v-model="newUrl" type="url" required placeholder="https://example.com" class="max-w-md" />
          </div>
          <div class="flex gap-3">
            <UiButton type="submit" :disabled="submitting">
              {{ submitting ? 'Creating…' : 'Create' }}
            </UiButton>
            <UiButton type="button" variant="secondary" @click="showForm = false">Cancel</UiButton>
          </div>
          <p v-if="store.error" class="text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
            {{ store.error }}
          </p>
        </form>
      </UiCardContent>
    </UiCard>

    <div v-if="store.loading" class="py-8 text-center text-slate-500" aria-busy="true">Loading projects…</div>

    <UiTable v-else-if="store.projects.length" aria-label="Projects">
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>Name</UiTableHead>
          <UiTableHead>URL</UiTableHead>
          <UiTableHead>Created</UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow
          v-for="project in store.projects"
          :key="project.id"
          class="cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
          tabindex="0"
          @click="router.push(`/projects/${project.id}`)"
          @keydown.enter="router.push(`/projects/${project.id}`)"
          @keydown.space.prevent="router.push(`/projects/${project.id}`)"
        >
          <UiTableCell class="font-medium text-slate-900">{{ project.name }}</UiTableCell>
          <UiTableCell class="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
            <a :href="project.url" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline" @click.stop>
              {{ project.url }}
            </a>
          </UiTableCell>
          <UiTableCell>{{ formatDate(project.createdAt) }}</UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>

    <div v-else-if="!store.loading" class="py-8 text-center text-slate-500">
      <p>No projects yet. Create your first project to start scanning.</p>
    </div>

    <p v-if="store.error && !showForm" class="mt-4 text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
      {{ store.error }}
    </p>
  </div>
</template>
