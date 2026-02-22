<script setup lang="ts">
// Conformance score table — displays per-WCAG-criterion scores with status badges
// Shows human-readable criterion names so non-WCAG-experts can understand results
import { computed } from 'vue';
import UiTable from './ui/table.vue';
import UiTableHeader from './ui/table-header.vue';
import UiTableBody from './ui/table-body.vue';
import UiTableRow from './ui/table-row.vue';
import UiTableHead from './ui/table-head.vue';
import UiTableCell from './ui/table-cell.vue';
import UiBadge from './ui/badge.vue';

export interface CriterionScore {
  wcagId: string;
  status: string;
  score: number;
  requiresManualReview: boolean;
}

const props = defineProps<{ conformance: CriterionScore[] }>();

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'critical' | 'serious' | 'moderate' | 'minor';

/** WCAG criterion ID → human-readable title lookup */
const CRITERION_TITLES: Record<string, string> = {
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio/Video-only (Prerecorded)',
  '1.2.2': 'Captions (Prerecorded)',
  '1.2.3': 'Audio Description (Prerecorded)',
  '1.2.4': 'Captions (Live)',
  '1.2.5': 'Audio Description (Prerecorded)',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.3.3': 'Sensory Characteristics',
  '1.3.4': 'Orientation',
  '1.3.5': 'Identify Input Purpose',
  '1.4.1': 'Use of Color',
  '1.4.2': 'Audio Control',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.5': 'Images of Text',
  '1.4.10': 'Reflow',
  '1.4.11': 'Non-text Contrast',
  '1.4.12': 'Text Spacing',
  '1.4.13': 'Content on Hover or Focus',
  '2.1.1': 'Keyboard',
  '2.1.2': 'No Keyboard Trap',
  '2.1.4': 'Character Key Shortcuts',
  '2.2.1': 'Timing Adjustable',
  '2.2.2': 'Pause, Stop, Hide',
  '2.3.1': 'Three Flashes or Below',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.5': 'Multiple Ways',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '2.5.1': 'Pointer Gestures',
  '2.5.2': 'Pointer Cancellation',
  '2.5.3': 'Label in Name',
  '2.5.4': 'Motion Actuation',
  '3.1.1': 'Language of Page',
  '3.1.2': 'Language of Parts',
  '3.2.1': 'On Focus',
  '3.2.2': 'On Input',
  '3.2.3': 'Consistent Navigation',
  '3.2.4': 'Consistent Identification',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '3.3.3': 'Error Suggestion',
  '3.3.4': 'Error Prevention',
  '4.1.2': 'Name, Role, Value',
  '4.1.3': 'Status Messages',
};

function criterionTitle(wcagId: string): string {
  return CRITERION_TITLES[wcagId] ?? wcagId;
}

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Supports': return 'default';
    case 'Partially Supports': return 'moderate';
    case 'Does Not Support': return 'destructive';
    default: return 'outline';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'Supports': return 'Pass';
    case 'Partially Supports': return 'Partial';
    case 'Does Not Support': return 'Fail';
    default: return status;
  }
}

/** Convert raw score to a user-friendly impact label */
function impactLabel(score: number): string {
  if (score === 0) return 'None';
  if (score <= 0.1) return 'Low';
  if (score <= 0.3) return 'Medium';
  return 'High';
}

const summary = computed(() => {
  const pass = props.conformance.filter(c => c.status === 'Supports').length;
  const partial = props.conformance.filter(c => c.status === 'Partially Supports').length;
  const fail = props.conformance.filter(c => c.status === 'Does Not Support').length;
  return { pass, partial, fail, total: props.conformance.length };
});
</script>

<template>
  <!-- Summary bar -->
  <div class="flex gap-4 mb-4 text-sm">
    <span class="text-slate-600">{{ summary.total }} criteria tested:</span>
    <span class="text-green-700 font-medium">{{ summary.pass }} pass</span>
    <span class="text-yellow-700 font-medium">{{ summary.partial }} partial</span>
    <span class="text-red-700 font-medium">{{ summary.fail }} fail</span>
  </div>

  <UiTable aria-label="WCAG Conformance Scores">
    <UiTableHeader>
      <UiTableRow>
        <UiTableHead>Criterion</UiTableHead>
        <UiTableHead>Name</UiTableHead>
        <UiTableHead>Result</UiTableHead>
        <UiTableHead>Impact</UiTableHead>
      </UiTableRow>
    </UiTableHeader>
    <UiTableBody>
      <UiTableRow v-for="item in conformance" :key="item.wcagId">
        <UiTableCell><code class="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{{ item.wcagId }}</code></UiTableCell>
        <UiTableCell>{{ criterionTitle(item.wcagId) }}</UiTableCell>
        <UiTableCell>
          <span class="inline-flex items-center gap-1.5">
            <UiBadge :variant="statusVariant(item.status)">{{ statusLabel(item.status) }}</UiBadge>
            <span v-if="item.requiresManualReview" class="text-yellow-600 text-xs" title="Automated scan found issues but manual screen reader verification recommended">*</span>
          </span>
        </UiTableCell>
        <UiTableCell class="text-sm">{{ impactLabel(item.score) }}</UiTableCell>
      </UiTableRow>
    </UiTableBody>
  </UiTable>
  <p v-if="conformance.some(c => c.requiresManualReview)" class="mt-2 text-xs text-slate-500">
    * Manual screen reader verification recommended
  </p>
</template>
