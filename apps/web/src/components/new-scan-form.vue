<script setup lang="ts">
// Inline form for triggering a new scan — scan type selector + URL input + auth flow
import { ref } from 'vue';
import { useScanStore } from '../stores/scan-store.js';
import UiCard from './ui/card.vue';
import UiCardHeader from './ui/card-header.vue';
import UiCardTitle from './ui/card-title.vue';
import UiCardContent from './ui/card-content.vue';
import UiButton from './ui/button.vue';
import UiInput from './ui/input.vue';
import UiSelect from './ui/select.vue';

const emit = defineEmits<{
  (e: 'submit', payload: { scanType: string; url: string; authSessionId?: string }): void;
  (e: 'cancel'): void;
}>();

const scanStore = useScanStore();

const SCAN_TYPES = ['browser', 'static', 'keyboard', 'combined'];
const scanType = ref('browser');
const scanUrl = ref('');
const requiresLogin = ref(false);
const authStep = ref<'idle' | 'logging-in' | 'capturing'>('idle');

const props = defineProps<{ submitting?: boolean; error?: string | null; defaultUrl?: string }>();

// Pre-fill URL from project
if (props.defaultUrl && !scanUrl.value) {
  scanUrl.value = props.defaultUrl;
}

async function handleLoginClick(): Promise<void> {
  if (!scanUrl.value.trim()) return;
  await scanStore.startAuthSession(scanUrl.value.trim());
  if (!scanStore.error) {
    authStep.value = 'logging-in';
  }
}

async function handleDoneLogin(): Promise<void> {
  authStep.value = 'capturing';
  const authSessionId = await scanStore.captureAuthSession();
  if (authSessionId) {
    emit('submit', { scanType: scanType.value, url: scanUrl.value.trim(), authSessionId });
    authStep.value = 'idle';
    requiresLogin.value = false;
  } else {
    authStep.value = 'idle';
  }
}

async function handleCancelAuth(): Promise<void> {
  await scanStore.cancelAuthSession();
  authStep.value = 'idle';
}

function handleSubmit(): void {
  if (!scanUrl.value.trim()) return;
  if (requiresLogin.value && authStep.value === 'idle') {
    void handleLoginClick();
    return;
  }
  emit('submit', { scanType: scanType.value, url: scanUrl.value.trim() });
}
</script>

<template>
  <UiCard class="mb-6" role="region" aria-label="Trigger new scan">
    <UiCardHeader>
      <UiCardTitle>New Scan</UiCardTitle>
    </UiCardHeader>
    <UiCardContent>
      <form @submit.prevent="handleSubmit" novalidate>
        <div class="flex gap-4 flex-wrap mb-4">
          <div class="flex flex-col gap-1.5">
            <label for="scan-type" class="text-sm font-semibold text-slate-700">Scan Type</label>
            <UiSelect id="scan-type" v-model="scanType" class="w-36">
              <option v-for="t in SCAN_TYPES" :key="t" :value="t">{{ t }}</option>
            </UiSelect>
          </div>
          <div class="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label for="scan-url" class="text-sm font-semibold text-slate-700">
              URL <span aria-hidden="true">*</span>
            </label>
            <UiInput id="scan-url" v-model="scanUrl" type="url" required placeholder="https://example.com/page" />
          </div>
        </div>

        <!-- Requires Login toggle — only for browser scan type -->
        <div v-if="scanType === 'browser'" class="mb-4">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="requiresLogin"
              class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              :disabled="authStep !== 'idle'"
            />
            <span class="text-sm font-medium text-slate-700">Requires Login</span>
          </label>
        </div>

        <!-- Auth flow states -->
        <div v-if="requiresLogin && scanType === 'browser' && authStep === 'logging-in'" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm font-medium text-blue-800 mb-2">A browser window has opened on your computer — log in to the site, then click "Done, Start Scan".</p>
          <div class="flex gap-3">
            <UiButton type="button" @click="handleDoneLogin" :disabled="scanStore.authSessionLoading">
              Done, Start Scan
            </UiButton>
            <UiButton type="button" variant="secondary" @click="handleCancelAuth">
              Cancel
            </UiButton>
          </div>
        </div>

        <div v-if="authStep === 'capturing'" class="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p class="text-sm text-slate-600">Capturing session and starting scan…</p>
        </div>

        <!-- Standard submit buttons (hidden during auth flow) -->
        <div v-if="authStep === 'idle'" class="flex gap-3">
          <UiButton type="submit" :disabled="submitting || scanStore.authSessionLoading">
            {{ submitting ? 'Starting…' : requiresLogin && scanType === 'browser' ? 'Login to Site' : 'Start Scan' }}
          </UiButton>
          <UiButton type="button" variant="secondary" @click="emit('cancel')">Cancel</UiButton>
        </div>

        <p v-if="error || scanStore.error" class="mt-3 text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
          {{ error || scanStore.error }}
        </p>
      </form>
    </UiCardContent>
  </UiCard>
</template>
