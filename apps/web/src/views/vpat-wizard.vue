<script setup lang="ts">
// VPAT Generator wizard: select project → choose format → generate → download
import { ref, onMounted } from 'vue';
import { useProjectStore } from '../stores/project-store.js';
import { apiUrl } from '../composables/use-api.js';
import VpatStepSelectProject from '../components/vpat-step-select-project.vue';
import UiCard from '../components/ui/card.vue';
import UiCardContent from '../components/ui/card-content.vue';
import UiButton from '../components/ui/button.vue';

const projectStore = useProjectStore();

const step = ref(1);
const selectedProjectId = ref('');
const selectedFormat = ref<'html' | 'docx'>('html');
const generating = ref(false);
const error = ref<string | null>(null);
const downloadPath = ref<string | null>(null);

const STEP_LABELS = ['Select Project', 'Choose Format', 'Download'];

onMounted(() => { void projectStore.fetchProjects(); });

function goNext(): void { step.value = Math.min(step.value + 1, 3); }
function goBack(): void { step.value = Math.max(step.value - 1, 1); }

/** Download VPAT by fetching the binary/HTML response directly (not JSON) */
async function handleGenerate(): Promise<void> {
  if (!selectedProjectId.value) return;
  generating.value = true;
  error.value = null;
  downloadPath.value = null;
  try {
    const url = apiUrl('/vpat/generate');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        projectId: Number(selectedProjectId.value),
        format: selectedFormat.value,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || res.statusText);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    downloadPath.value = objectUrl;
    step.value = 3;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate VPAT';
  } finally {
    generating.value = false;
  }
}

function reset(): void {
  step.value = 1;
  selectedProjectId.value = '';
  selectedFormat.value = 'html';
  downloadPath.value = null;
  error.value = null;
}

function downloadFileName(): string {
  return `vpat-${selectedProjectId.value}.${selectedFormat.value}`;
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="text-2xl font-bold text-slate-900">VPAT Generator</h1>
    <p class="text-sm text-slate-500 mt-1.5 mb-6">
      Generate a Voluntary Product Accessibility Template (VPAT) for your project.
    </p>

    <!-- Step indicator -->
    <ol class="flex gap-0 list-none mb-6" aria-label="Wizard steps">
      <li
        v-for="(label, i) in STEP_LABELS" :key="i"
        class="flex items-center gap-1.5 text-sm flex-1"
        :class="[
          step === i + 1 ? 'text-blue-600 font-semibold' : step > i + 1 ? 'text-green-600' : 'text-slate-400',
        ]"
        :aria-current="step === i + 1 ? 'step' : undefined"
      >
        <span v-if="i > 0" class="mr-1.5 text-slate-300" aria-hidden="true">›</span>
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-current text-xs font-bold flex-shrink-0"
          aria-hidden="true"
        >
          {{ step > i + 1 ? '✓' : i + 1 }}
        </span>
        <span>{{ label }}</span>
      </li>
    </ol>

    <UiCard>
      <UiCardContent class="pt-6">
        <!-- Step 1: Select project -->
        <VpatStepSelectProject
          v-if="step === 1"
          :projects="projectStore.projects"
          :loading="projectStore.loading"
          v-model="selectedProjectId"
          @next="goNext"
        />

        <!-- Step 2: Choose format + generate -->
        <section v-else-if="step === 2" aria-labelledby="step2-heading">
          <h2 id="step2-heading" class="text-lg font-semibold text-slate-900 mb-4">Choose Format</h2>
          <div class="flex flex-col gap-3 my-4" role="radiogroup" aria-label="Output format">
            <label
              class="flex items-start gap-3 p-3.5 border rounded-md cursor-pointer transition-colors"
              :class="selectedFormat === 'html' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'"
            >
              <input type="radio" name="vpat-format" value="html" v-model="selectedFormat" class="mt-0.5" />
              <span>
                <strong class="text-sm font-semibold text-slate-900">HTML</strong>
                <span class="block text-xs text-slate-500 mt-0.5">Web-ready VPAT document</span>
              </span>
            </label>
            <label
              class="flex items-start gap-3 p-3.5 border rounded-md cursor-pointer transition-colors"
              :class="selectedFormat === 'docx' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'"
            >
              <input type="radio" name="vpat-format" value="docx" v-model="selectedFormat" class="mt-0.5" />
              <span>
                <strong class="text-sm font-semibold text-slate-900">DOCX</strong>
                <span class="block text-xs text-slate-500 mt-0.5">Microsoft Word document</span>
              </span>
            </label>
          </div>
          <p v-if="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
            {{ error }}
          </p>
          <div class="flex gap-3 mt-5">
            <UiButton variant="secondary" @click="goBack">← Back</UiButton>
            <UiButton :disabled="generating" @click="handleGenerate">
              {{ generating ? 'Generating…' : 'Generate VPAT' }}
            </UiButton>
          </div>
        </section>

        <!-- Step 3: Download -->
        <section v-else aria-labelledby="step3-heading">
          <h2 id="step3-heading" class="text-lg font-semibold text-slate-900 mb-4">Your VPAT is Ready</h2>
          <p class="text-sm text-green-800 bg-green-50 border border-green-300 rounded-md px-4 py-3 mb-4">
            VPAT document generated successfully.
          </p>
          <div class="my-4">
            <a
              v-if="downloadPath"
              :href="downloadPath"
              :download="downloadFileName()"
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              ↓ Download {{ selectedFormat.toUpperCase() }}
            </a>
            <p v-else class="text-sm text-slate-500">No download link returned by server.</p>
          </div>
          <div class="flex gap-3 mt-5">
            <UiButton variant="secondary" @click="reset">Generate Another</UiButton>
          </div>
        </section>
      </UiCardContent>
    </UiCard>
  </div>
</template>
