<script setup lang="ts">
// Project detail: scan history table, new scan form, SSE progress for running scans
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project-store.js';
import { useScanStore } from '../stores/scan-store.js';
import { useScanProgress } from '../composables/use-scan-progress.js';
import ProgressIndicator from '../components/progress-indicator.vue';
import NewScanForm from '../components/new-scan-form.vue';
import UiTable from '../components/ui/table.vue';
import UiTableHeader from '../components/ui/table-header.vue';
import UiTableBody from '../components/ui/table-body.vue';
import UiTableRow from '../components/ui/table-row.vue';
import UiTableHead from '../components/ui/table-head.vue';
import UiTableCell from '../components/ui/table-cell.vue';
import UiButton from '../components/ui/button.vue';
import UiBadge from '../components/ui/badge.vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const scanStore = useScanStore();

const projectId = computed(() => String(route.params.id));
const showScanForm = ref(false);
const submitting = ref(false);

const confirmingDelete = ref(false);

async function handleDelete(): Promise<void> {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true;
    return;
  }
  const ok = await projectStore.deleteProject(projectId.value);
  if (ok) router.push('/');
}

const { progressScanId, progressStatus, progressPct, watchScanProgress } = useScanProgress(
  () => { void scanStore.fetchScans(projectId.value); }
);

onMounted(async () => {
  await Promise.all([
    projectStore.fetchProject(projectId.value),
    scanStore.fetchScans(projectId.value),
  ]);
  const running = scanStore.scans.find((s) => s.status === 'running' || s.status === 'pending');
  if (running) watchScanProgress(running.id);
});

async function handleScanSubmit(payload: { scanType: string; url: string }): Promise<void> {
  submitting.value = true;
  const scan = await scanStore.triggerScan({
    projectId: projectId.value,
    scanType: payload.scanType,
    url: payload.url,
  });
  submitting.value = false;
  if (scan) {
    showScanForm.value = false;
    watchScanProgress(scan.id);
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

type ScanStatus = 'completed' | 'running' | 'pending' | 'failed';
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'critical' | 'serious' | 'moderate' | 'minor';

function statusVariant(status: string): BadgeVariant {
  const map: Record<ScanStatus, BadgeVariant> = {
    completed: 'default',
    running: 'secondary',
    pending: 'outline',
    failed: 'destructive',
  };
  return map[status as ScanStatus] ?? 'outline';
}
</script>

<template>
  <div class="max-w-4xl">
    <nav aria-label="Breadcrumb" class="text-sm text-slate-500 mb-4">
      <RouterLink to="/" class="text-blue-600 hover:underline">Projects</RouterLink>
      <span aria-hidden="true" class="mx-1">/</span>
      <span aria-current="page">{{ projectStore.currentProject?.name ?? '…' }}</span>
    </nav>

    <div class="flex justify-between items-start mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ projectStore.currentProject?.name }}</h1>
        <a v-if="projectStore.currentProject?.url"
          :href="projectStore.currentProject.url"
          target="_blank" rel="noopener noreferrer"
          class="text-sm text-slate-500 hover:underline mt-1 block">
          {{ projectStore.currentProject.url }}
        </a>
      </div>
      <div class="flex gap-2">
        <UiButton @click="showScanForm = !showScanForm" :aria-expanded="showScanForm">
          + New Scan
        </UiButton>
        <UiButton variant="destructive" @click="handleDelete">
          {{ confirmingDelete ? 'Confirm Delete' : 'Delete Project' }}
        </UiButton>
      </div>
    </div>

    <NewScanForm
      v-if="showScanForm"
      :submitting="submitting"
      :error="scanStore.error"
      :default-url="projectStore.currentProject?.url ?? ''"
      @submit="handleScanSubmit"
      @cancel="showScanForm = false"
    />

    <ProgressIndicator
      v-if="progressScanId"
      :status="progressStatus"
      :percent="progressPct"
      class="mb-5"
    />

    <section aria-label="Scan history">
      <h2 class="text-lg font-semibold text-slate-900 mb-3">Scan History</h2>
      <div v-if="scanStore.loading" class="py-8 text-center text-slate-500" aria-busy="true">Loading scans…</div>
      <UiTable v-else-if="scanStore.scans.length" aria-label="Scans">
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Type</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Started</UiTableHead>
            <UiTableHead>Completed</UiTableHead>
            <UiTableHead>Violations</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow
            v-for="scan in scanStore.scans" :key="scan.id"
            class="cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
            tabindex="0"
            @click="router.push(`/scans/${scan.id}`)"
            @keydown.enter="router.push(`/scans/${scan.id}`)"
            @keydown.space.prevent="router.push(`/scans/${scan.id}`)">
            <UiTableCell>{{ scan.scanType }}</UiTableCell>
            <UiTableCell>
              <UiBadge :variant="statusVariant(scan.status)">{{ scan.status }}</UiBadge>
            </UiTableCell>
            <UiTableCell>{{ formatDate(scan.startedAt) }}</UiTableCell>
            <UiTableCell>{{ formatDate(scan.completedAt) }}</UiTableCell>
            <UiTableCell>{{ scan.violationCount ?? '—' }}</UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
      <div v-else class="py-8 text-center text-slate-500">No scans yet for this project.</div>
    </section>
  </div>
</template>
