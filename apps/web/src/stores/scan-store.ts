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
  selector: string;
  html?: string;
  fixSuggestion?: string;
  failureSummary?: string;
  helpUrl?: string;
  screenshotPath?: string;
}

export interface TriggerScanInput {
  projectId: string;
  scanType: string;
  url: string;
}

export interface IssuesPage {
  data: Issue[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useScanStore = defineStore('scans', () => {
  const scans = ref<Scan[]>([]);
  const currentScan = ref<Scan | null>(null);
  const currentIssue = ref<Issue | null>(null);
  const issues = ref<Issue[]>([]);
  const totalIssues = ref(0);
  const loading = ref(false);
  const aiFixLoading = ref(false);
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
      issues.value = result.data;
      totalIssues.value = result.pagination.total;
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

  /** Request AI fix for an issue — stores full fix JSON in fixSuggestion */
  async function generateAiFix(issueId: string): Promise<void> {
    aiFixLoading.value = true;
    error.value = null;
    try {
      const result = await apiPost<{ fix: Record<string, unknown> }>(
        `/issues/${issueId}/ai-fix`,
        {},
      );
      if (currentIssue.value && currentIssue.value.id === issueId) {
        currentIssue.value = { ...currentIssue.value, fixSuggestion: JSON.stringify(result.fix) };
      }
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as { code?: string; error?: string };
          error.value = parsed.code === 'AI_AUTH_REQUIRED' ? 'AI_AUTH_REQUIRED' : (parsed.error ?? err.message);
        } catch {
          error.value = err.message;
        }
      } else {
        error.value = 'AI fix generation failed';
      }
    } finally {
      aiFixLoading.value = false;
    }
  }

  /** Pending auth state for code-paste flow */
  const pendingAuthState = ref<string | null>(null);
  /** Issue ID waiting for auth completion */
  const pendingAuthIssueId = ref<string | null>(null);

  /** Start OAuth flow: get auth URL, open in new tab, show code input */
  async function startOAuthLogin(issueId: string): Promise<void> {
    error.value = null;
    try {
      const { authUrl, state } = await apiPost<{ authUrl: string; state: string }>('/auth/login', {});
      pendingAuthState.value = state;
      pendingAuthIssueId.value = issueId;
      window.open(authUrl, '_blank');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start OAuth flow';
    }
  }

  /** Complete OAuth flow: send copied code to backend, then generate AI fix */
  async function completeOAuthLogin(code: string): Promise<void> {
    if (!pendingAuthState.value || !pendingAuthIssueId.value) {
      error.value = 'No pending auth state. Please start login again.';
      return;
    }
    aiFixLoading.value = true;
    error.value = null;
    try {
      await apiPost('/auth/callback', { code, state: pendingAuthState.value });
      const issueId = pendingAuthIssueId.value;
      pendingAuthState.value = null;
      pendingAuthIssueId.value = null;
      await generateAiFix(issueId);
    } catch (err) {
      // Clear pending state so user can retry from scratch
      pendingAuthState.value = null;
      pendingAuthIssueId.value = null;
      error.value = err instanceof Error ? err.message : 'OAuth callback failed';
    } finally {
      aiFixLoading.value = false;
    }
  }

  return {
    scans,
    currentScan,
    currentIssue,
    issues,
    totalIssues,
    loading,
    aiFixLoading,
    error,
    fetchScans,
    fetchScan,
    triggerScan,
    fetchIssues,
    fetchIssue,
    pendingAuthState,
    pendingAuthIssueId,
    generateAiFix,
    startOAuthLogin,
    completeOAuthLogin,
  };
});
