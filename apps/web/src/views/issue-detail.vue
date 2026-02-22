<script setup lang="ts">
// Issue detail view: full violation info, affected elements, fix suggestion
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan-store.js';
import SeverityBadge from '../components/severity-badge.vue';
import FixViewer from '../components/fix-viewer.vue';
import UiButton from '../components/ui/button.vue';
import UiCard from '../components/ui/card.vue';
import UiCardHeader from '../components/ui/card-header.vue';
import UiCardTitle from '../components/ui/card-title.vue';
import UiCardContent from '../components/ui/card-content.vue';

const route = useRoute();
const router = useRouter();
const store = useScanStore();

const issueId = computed(() => String(route.params.id));

onMounted(() => { void store.fetchIssue(issueId.value); });

function goBack(): void {
  const scanId = store.currentIssue?.scanId;
  if (scanId) {
    void router.push(`/scans/${scanId}`);
  } else {
    void router.back();
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <nav aria-label="Breadcrumb" class="mb-5">
      <UiButton variant="outline" size="sm" @click="goBack">
        ← Back to Scan Results
      </UiButton>
    </nav>

    <div v-if="store.loading" class="py-8 text-center text-slate-500" aria-busy="true">Loading issue…</div>
    <p v-else-if="store.error" class="text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
      {{ store.error }}
    </p>

    <template v-else-if="store.currentIssue">
      <div class="flex items-center gap-4 mb-6 flex-wrap">
        <h1 class="text-2xl font-bold text-slate-900">{{ store.currentIssue.ruleId }}</h1>
        <SeverityBadge :severity="store.currentIssue.severity" />
      </div>

      <UiCard class="mb-6">
        <UiCardHeader>
          <UiCardTitle>Details</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <dl class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">WCAG Criteria</dt>
              <dd class="text-sm text-slate-900 leading-relaxed">{{ store.currentIssue.wcagCriteria }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Severity</dt>
              <dd><SeverityBadge :severity="store.currentIssue.severity" /></dd>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Description</dt>
              <dd class="text-sm text-slate-900 leading-relaxed">{{ store.currentIssue.description }}</dd>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Page URL</dt>
              <dd class="text-sm leading-relaxed">
                <a :href="store.currentIssue.pageUrl" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                  {{ store.currentIssue.pageUrl }}
                </a>
              </dd>
            </div>
            <div v-if="store.currentIssue.target" class="col-span-2 flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">CSS Target</dt>
              <dd class="text-sm"><code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{{ store.currentIssue.target }}</code></dd>
            </div>
          </dl>
        </UiCardContent>
      </UiCard>

      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Fix Information</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <FixViewer
            :element="store.currentIssue.element"
            :fix-suggestion="store.currentIssue.fixSuggestion"
          />
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
