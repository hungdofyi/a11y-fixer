<script setup lang="ts">
// Scan results: severity summary cards, filterable issue table, report downloads
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan-store.js';
import { apiUrl } from '../composables/use-api.js';
import ScanSummaryCard from '../components/scan-summary-card.vue';
import IssueTable from '../components/issue-table.vue';
import UiButton from '../components/ui/button.vue';
import type { Issue } from '../stores/scan-store.js';

const route = useRoute();
const router = useRouter();
const store = useScanStore();

const scanId = computed(() => String(route.params.id));

onMounted(async () => {
  await Promise.all([
    store.fetchScan(scanId.value),
    store.fetchIssues(scanId.value, { limit: 500 }),
  ]);
});

const countBySeverity = computed(() => {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const issue of store.issues) {
    if (issue.severity in counts) counts[issue.severity]++;
  }
  return counts;
});

const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'] as const;

function reportUrl(format: 'html' | 'csv'): string {
  return apiUrl(`/reports/${scanId.value}?format=${format}`);
}

function handleSelectIssue(issue: Issue): void {
  void router.push(`/issues/${issue.id}`);
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <div class="max-w-5xl">
    <nav aria-label="Breadcrumb" class="text-sm text-slate-500 mb-4">
      <RouterLink v-if="store.currentScan" :to="`/projects/${store.currentScan.projectId}`" class="text-blue-600 hover:underline">Project</RouterLink>
      <RouterLink v-else to="/" class="text-blue-600 hover:underline">Projects</RouterLink>
      <span aria-hidden="true" class="mx-1">/</span>
      <span aria-current="page">Scan Results</span>
    </nav>

    <div class="flex justify-between items-start mb-6 gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Scan Results</h1>
        <p v-if="store.currentScan" class="text-sm text-slate-500 mt-1">
          {{ store.currentScan.scanType }} scan &mdash; {{ store.currentScan.url }}
          &mdash; {{ formatDate(store.currentScan.completedAt) }}
        </p>
      </div>
      <div class="flex gap-3 flex-shrink-0" aria-label="Download reports">
        <UiButton variant="outline" as="a" :href="reportUrl('html')" download aria-label="Download HTML report">
          ↓ HTML Report
        </UiButton>
        <UiButton variant="outline" as="a" :href="reportUrl('csv')" download aria-label="Download CSV report">
          ↓ CSV Report
        </UiButton>
      </div>
    </div>

    <section class="flex gap-4 flex-wrap mb-8" aria-label="Violation summary by severity">
      <ScanSummaryCard
        v-for="sev in SEVERITIES"
        :key="sev"
        :severity="sev"
        :count="countBySeverity[sev]"
      />
    </section>

    <section class="mt-4" aria-label="Issue list">
      <h2 class="text-lg font-semibold text-slate-900 mb-3">Issues ({{ store.issues.length }} total)</h2>
      <p v-if="store.error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
        {{ store.error }}
      </p>
      <IssueTable
        :issues="store.issues"
        :loading="store.loading"
        @select="handleSelectIssue"
      />
    </section>
  </div>
</template>
