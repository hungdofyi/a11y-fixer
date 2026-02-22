// Pinia store for scans and issues associated with the current project
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiGet, apiPost } from '../composables/use-api.js';

export interface Scan {
  id: string;
  projectId: string;
  scanType: string;
  status: string;
  url: string;
  startedAt: string;
  completedAt?: string;
  violationCount?: number;
}

export interface Issue {
  id: string;
  scanId: string;
  ruleId: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriteria: string;
  description: string;
  pageUrl: string;
  element: string;
  target: string;
  fixSuggestion?: string;
}

export interface TriggerScanInput {
  projectId: string;
  scanType: string;
  url: string;
}

export interface IssuesPage {
  items: Issue[];
  total: number;
  page: number;
  limit: number;
}

export const useScanStore = defineStore('scans', () => {
  const scans = ref<Scan[]>([]);
  const currentScan = ref<Scan | null>(null);
  const currentIssue = ref<Issue | null>(null);
  const issues = ref<Issue[]>([]);
  const totalIssues = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchScans(projectId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      scans.value = await apiGet<Scan[]>(`/projects/${projectId}/scans`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load scans';
    } finally {
      loading.value = false;
    }
  }

  async function fetchScan(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      currentScan.value = await apiGet<Scan>(`/scans/${id}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load scan';
    } finally {
      loading.value = false;
    }
  }

  async function triggerScan(input: TriggerScanInput): Promise<Scan | null> {
    error.value = null;
    try {
      const scan = await apiPost<Scan>('/scans', input);
      scans.value.push(scan);
      return scan;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to trigger scan';
      return null;
    }
  }

  async function fetchIssues(
    scanId: string,
    opts: { severity?: string; page?: number; limit?: number } = {}
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams({ scanId });
      if (opts.severity) params.set('severity', opts.severity);
      if (opts.page !== undefined) params.set('page', String(opts.page));
      if (opts.limit !== undefined) params.set('limit', String(opts.limit));
      const result = await apiGet<IssuesPage>(`/issues?${params.toString()}`);
      issues.value = result.items;
      totalIssues.value = result.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load issues';
    } finally {
      loading.value = false;
    }
  }

  async function fetchIssue(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      currentIssue.value = await apiGet<Issue>(`/issues/${id}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load issue';
    } finally {
      loading.value = false;
    }
  }

  return {
    scans,
    currentScan,
    currentIssue,
    issues,
    totalIssues,
    loading,
    error,
    fetchScans,
    fetchScan,
    triggerScan,
    fetchIssues,
    fetchIssue,
  };
});
