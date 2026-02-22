// Composable encapsulating sort/filter/pagination logic for the issues table
import { computed, ref } from 'vue';
import type { Issue } from '../stores/scan-store.js';

export type SortKey = 'severity' | 'ruleId' | 'wcagCriteria' | 'pageUrl';
export type SortDir = 'asc' | 'desc';
export type AriaSort = 'none' | 'ascending' | 'descending';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const PAGE_SIZE = 20;

export function useIssueTable(issuesRef: { value: Issue[] }) {
  const filterSeverity = ref('');
  const filterRule = ref('');
  const sortKey = ref<SortKey>('severity');
  const sortDir = ref<SortDir>('asc');
  const page = ref(1);

  const filtered = computed(() =>
    issuesRef.value.filter((issue) => {
      const sevOk = !filterSeverity.value || issue.severity === filterSeverity.value;
      const ruleOk =
        !filterRule.value ||
        issue.ruleId.toLowerCase().includes(filterRule.value.toLowerCase());
      return sevOk && ruleOk;
    })
  );

  const sorted = computed(() =>
    [...filtered.value].sort((a, b) => {
      let cmp = 0;
      if (sortKey.value === 'severity') {
        cmp = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      } else {
        cmp = a[sortKey.value].localeCompare(b[sortKey.value]);
      }
      return sortDir.value === 'asc' ? cmp : -cmp;
    })
  );

  const totalPages = computed(() => Math.ceil(sorted.value.length / PAGE_SIZE) || 1);

  const paginated = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE;
    return sorted.value.slice(start, start + PAGE_SIZE);
  });

  function setSort(key: SortKey): void {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey.value = key;
      sortDir.value = 'asc';
    }
    page.value = 1;
  }

  function sortIcon(key: SortKey): string {
    if (sortKey.value !== key) return '↕';
    return sortDir.value === 'asc' ? '↑' : '↓';
  }

  function ariaSort(key: SortKey): AriaSort {
    if (sortKey.value !== key) return 'none';
    return sortDir.value === 'asc' ? 'ascending' : 'descending';
  }

  function resetPage(): void { page.value = 1; }

  return {
    filterSeverity, filterRule, sortKey, sortDir,
    page, filtered, sorted, totalPages, paginated,
    setSort, sortIcon, ariaSort, resetPage,
  };
}
