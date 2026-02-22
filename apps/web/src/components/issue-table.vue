<script setup lang="ts">
// Reusable sortable, filterable, paginated issues table — logic in use-issue-table composable
import { toRef } from 'vue';
import type { Issue } from '../stores/scan-store.js';
import { useIssueTable } from '../composables/use-issue-table.js';
import { formatWcagCriteria } from '../utils/wcag-link-builder.js';
import SeverityBadge from './severity-badge.vue';
import UiTable from './ui/table.vue';
import UiTableHeader from './ui/table-header.vue';
import UiTableBody from './ui/table-body.vue';
import UiTableRow from './ui/table-row.vue';
import UiTableHead from './ui/table-head.vue';
import UiTableCell from './ui/table-cell.vue';
import UiButton from './ui/button.vue';
import UiInput from './ui/input.vue';
import UiSelect from './ui/select.vue';

const props = defineProps<{ issues: Issue[]; loading?: boolean }>();
const emit = defineEmits<{ (e: 'select', issue: Issue): void }>();

const issuesRef = toRef(props, 'issues');
const {
  filterSeverity, filterRule, page, filtered, totalPages, paginated,
  setSort, sortIcon, ariaSort, resetPage,
} = useIssueTable(issuesRef);
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="flex gap-4 items-end flex-wrap mb-4" role="search" aria-label="Filter issues">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-slate-500" for="filter-severity">Severity</label>
        <UiSelect id="filter-severity" v-model="filterSeverity" @change="resetPage" class="w-36" aria-label="Filter by severity">
          <option value="">All</option>
          <option value="critical">Critical</option>
          <option value="serious">Serious</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </UiSelect>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-slate-500" for="filter-rule">Rule</label>
        <UiInput
          id="filter-rule"
          v-model="filterRule"
          type="search"
          placeholder="Filter by rule ID…"
          @input="resetPage"
          class="w-48"
          aria-label="Filter by rule ID"
        />
      </div>
      <span class="ml-auto text-sm text-slate-500 self-end pb-0.5">
        {{ filtered.length }} issue{{ filtered.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <div v-if="loading" class="py-8 text-center text-slate-500" aria-busy="true">Loading issues…</div>

    <UiTable v-else aria-label="Accessibility issues">
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>
            <button
              class="bg-transparent border-none cursor-pointer font-semibold text-xs uppercase tracking-wide text-slate-500 p-0 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:rounded-sm"
              @click="setSort('ruleId')"
              :aria-sort="ariaSort('ruleId')"
            >
              Rule {{ sortIcon('ruleId') }}
            </button>
          </UiTableHead>
          <UiTableHead>
            <button
              class="bg-transparent border-none cursor-pointer font-semibold text-xs uppercase tracking-wide text-slate-500 p-0 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:rounded-sm"
              @click="setSort('wcagCriteria')"
              :aria-sort="ariaSort('wcagCriteria')"
            >
              WCAG {{ sortIcon('wcagCriteria') }}
            </button>
          </UiTableHead>
          <UiTableHead>
            <button
              class="bg-transparent border-none cursor-pointer font-semibold text-xs uppercase tracking-wide text-slate-500 p-0 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:rounded-sm"
              @click="setSort('severity')"
              :aria-sort="ariaSort('severity')"
            >
              Severity {{ sortIcon('severity') }}
            </button>
          </UiTableHead>
          <UiTableHead>Description</UiTableHead>
          <UiTableHead>
            <button
              class="bg-transparent border-none cursor-pointer font-semibold text-xs uppercase tracking-wide text-slate-500 p-0 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:rounded-sm"
              @click="setSort('pageUrl')"
              :aria-sort="ariaSort('pageUrl')"
            >
              Page {{ sortIcon('pageUrl') }}
            </button>
          </UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow
          v-for="issue in paginated" :key="issue.id"
          class="cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
          tabindex="0"
          @click="emit('select', issue)"
          @keydown.enter="emit('select', issue)"
          @keydown.space.prevent="emit('select', issue)"
        >
          <UiTableCell><code class="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{{ issue.ruleId }}</code></UiTableCell>
          <UiTableCell>{{ formatWcagCriteria(issue.wcagCriteria) }}</UiTableCell>
          <UiTableCell><SeverityBadge :severity="issue.severity" /></UiTableCell>
          <UiTableCell class="max-w-[280px]">{{ issue.description }}</UiTableCell>
          <UiTableCell class="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500" :title="issue.pageUrl">
            {{ issue.pageUrl }}
          </UiTableCell>
        </UiTableRow>
        <UiTableRow v-if="paginated.length === 0">
          <UiTableCell colspan="5" class="text-center text-slate-500 py-8">
            No issues match the current filters.
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>

    <div
      v-if="totalPages > 1"
      class="flex items-center gap-4 justify-center mt-4 text-sm"
      role="navigation"
      aria-label="Pagination"
    >
      <UiButton variant="outline" size="sm" :disabled="page === 1" @click="page--" aria-label="Previous page">
        ‹ Prev
      </UiButton>
      <span class="text-slate-600">Page {{ page }} of {{ totalPages }}</span>
      <UiButton variant="outline" size="sm" :disabled="page === totalPages" @click="page++" aria-label="Next page">
        Next ›
      </UiButton>
    </div>
  </div>
</template>
