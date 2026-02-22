<script setup lang="ts">
// Inline form for triggering a new scan — scan type selector + URL input
import { ref } from 'vue';
import UiCard from './ui/card.vue';
import UiCardHeader from './ui/card-header.vue';
import UiCardTitle from './ui/card-title.vue';
import UiCardContent from './ui/card-content.vue';
import UiButton from './ui/button.vue';
import UiInput from './ui/input.vue';
import UiSelect from './ui/select.vue';

const emit = defineEmits<{
  (e: 'submit', payload: { scanType: string; url: string }): void;
  (e: 'cancel'): void;
}>();

const SCAN_TYPES = ['browser', 'static', 'keyboard', 'combined'];
const scanType = ref('browser');
const scanUrl = ref('');

const props = defineProps<{ submitting?: boolean; error?: string | null; defaultUrl?: string }>();

// Pre-fill URL from project
if (props.defaultUrl && !scanUrl.value) {
  scanUrl.value = props.defaultUrl;
}

function handleSubmit(): void {
  if (!scanUrl.value.trim()) return;
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
        <div class="flex gap-3">
          <UiButton type="submit" :disabled="submitting">
            {{ submitting ? 'Starting…' : 'Start Scan' }}
          </UiButton>
          <UiButton type="button" variant="secondary" @click="emit('cancel')">Cancel</UiButton>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
          {{ error }}
        </p>
      </form>
    </UiCardContent>
  </UiCard>
</template>
