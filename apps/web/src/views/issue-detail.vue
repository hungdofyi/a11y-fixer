<script setup lang="ts">
// Issue detail view: rich audit experience with screenshots, fix steps, HTML snippet
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan-store.js';
import SeverityBadge from '../components/severity-badge.vue';
import FixViewer from '../components/fix-viewer.vue';
import HtmlSnippetViewer from '../components/html-snippet-viewer.vue';
import ElementScreenshot from '../components/element-screenshot.vue';
import FixStepsViewer from '../components/fix-steps-viewer.vue';
import SelectorCopyBox from '../components/selector-copy-box.vue';
import UiButton from '../components/ui/button.vue';
import UiCard from '../components/ui/card.vue';
import UiCardHeader from '../components/ui/card-header.vue';
import UiCardTitle from '../components/ui/card-title.vue';
import UiCardContent from '../components/ui/card-content.vue';
import { parseWcagTags, formatWcagTag } from '../utils/wcag-link-builder.js';

const route = useRoute();
const router = useRouter();
const store = useScanStore();

const issueId = computed(() => String(route.params.id));
const issue = computed(() => store.currentIssue);

/** OAuth code input field */
const authCode = ref('');

const wcagLabels = computed(() => {
  if (!issue.value?.wcagCriteria) return [];
  return parseWcagTags(issue.value.wcagCriteria)
    .map(tag => formatWcagTag(tag))
    .filter(Boolean) as string[];
});

const screenshotUrl = computed(() => {
  if (!issue.value?.screenshotPath) return undefined;
  return `/api/${issue.value.screenshotPath}`;
});

onMounted(() => { void store.fetchIssue(issueId.value); });

function goBack(): void {
  const scanId = issue.value?.scanId;
  if (scanId) {
    void router.push(`/scans/${scanId}`);
  } else {
    void router.back();
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <nav aria-label="Breadcrumb" class="mb-5">
      <UiButton variant="outline" size="sm" @click="goBack">
        ← Back to Scan Results
      </UiButton>
    </nav>

    <div v-if="store.loading" class="py-8 text-center text-slate-500" aria-busy="true">Loading issue…</div>
    <p v-else-if="store.error && store.error !== 'AI_AUTH_REQUIRED'" class="text-sm text-red-700 bg-red-50 border border-red-600 rounded-md px-4 py-3" role="alert">
      {{ store.error }}
    </p>

    <template v-else-if="issue">
      <!-- Header: rule ID + severity -->
      <div class="flex items-center gap-4 mb-6 flex-wrap">
        <h1 class="text-2xl font-bold text-slate-900">{{ issue.ruleId }}</h1>
        <SeverityBadge :severity="issue.severity" />
      </div>

      <!-- Element Screenshot -->
      <UiCard v-if="screenshotUrl" class="mb-6">
        <UiCardHeader>
          <UiCardTitle>Element Screenshot</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <ElementScreenshot :screenshot-url="screenshotUrl" />
        </UiCardContent>
      </UiCard>

      <!-- Details -->
      <UiCard class="mb-6">
        <UiCardHeader>
          <UiCardTitle>Details</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <dl class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">WCAG Criteria</dt>
              <dd class="flex flex-wrap gap-1.5">
                <span
                  v-for="label in wcagLabels"
                  :key="label"
                  class="inline-block text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700"
                >{{ label }}</span>
                <span v-if="!wcagLabels.length" class="text-sm text-slate-900">{{ issue.wcagCriteria }}</span>
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Severity</dt>
              <dd><SeverityBadge :severity="issue.severity" /></dd>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Description</dt>
              <dd class="text-sm text-slate-900 leading-relaxed">{{ issue.description }}</dd>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">Page URL</dt>
              <dd class="text-sm leading-relaxed">
                <a :href="issue.pageUrl" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                  {{ issue.pageUrl }}
                </a>
              </dd>
            </div>
            <div v-if="issue.selector" class="col-span-2 flex flex-col gap-1">
              <dt class="text-xs font-bold uppercase tracking-wide text-slate-500">CSS Selector</dt>
              <dd><SelectorCopyBox :selector="issue.selector" /></dd>
            </div>
          </dl>
        </UiCardContent>
      </UiCard>

      <!-- HTML Snippet -->
      <UiCard v-if="issue.html" class="mb-6">
        <UiCardHeader>
          <UiCardTitle>HTML Element</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <HtmlSnippetViewer :html="issue.html" />
        </UiCardContent>
      </UiCard>

      <!-- How to Fix (axe failureSummary) -->
      <UiCard v-if="issue.failureSummary" class="mb-6">
        <UiCardHeader>
          <UiCardTitle>How to Fix</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <FixStepsViewer :failure-summary="issue.failureSummary" :help-url="issue.helpUrl" />
        </UiCardContent>
      </UiCard>

      <!-- AI Fix Suggestion -->
      <UiCard class="mb-6">
        <UiCardHeader>
          <div class="flex items-center justify-between w-full">
            <UiCardTitle>AI Fix Suggestion</UiCardTitle>
            <UiButton
              v-if="!issue.fixSuggestion"
              size="sm"
              :disabled="store.aiFixLoading"
              @click="void store.generateAiFix(issueId)"
            >
              {{ store.aiFixLoading ? 'Generating…' : 'Generate AI Fix' }}
            </UiButton>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <!-- Auth required OR pending code input -->
          <div v-if="store.error === 'AI_AUTH_REQUIRED' || store.pendingAuthState" class="bg-amber-50 border border-amber-300 rounded-md px-4 py-3" role="alert">
            <p class="text-sm font-medium text-amber-800 mb-2">Claude OAuth authentication required</p>

            <!-- Step 1: Open auth page -->
            <template v-if="!store.pendingAuthState">
              <p class="text-sm text-amber-700 mb-3">
                Click below to open Claude's authorization page in a new tab.
              </p>
              <UiButton
                size="sm"
                :disabled="store.aiFixLoading"
                @click="void store.startOAuthLogin(issueId)"
              >
                Sign in with Claude
              </UiButton>
            </template>

            <!-- Step 2: Paste authorization code -->
            <template v-else>
              <p class="text-sm text-amber-700 mb-3">
                Authorize in the new tab, then copy the code shown and paste it below.
              </p>
              <div class="flex items-center gap-2">
                <input
                  v-model="authCode"
                  type="text"
                  placeholder="Paste authorization code here"
                  class="flex-1 text-sm border border-amber-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  :disabled="store.aiFixLoading"
                  @keyup.enter="void store.completeOAuthLogin(authCode).then(() => { authCode = '' })"
                />
                <UiButton
                  size="sm"
                  :disabled="store.aiFixLoading || !authCode.trim()"
                  @click="void store.completeOAuthLogin(authCode).then(() => { authCode = '' })"
                >
                  {{ store.aiFixLoading ? 'Verifying…' : 'Submit Code' }}
                </UiButton>
              </div>
            </template>
          </div>
          <p v-else-if="!issue.fixSuggestion && !store.aiFixLoading" class="text-sm text-slate-500">
            No AI fix generated yet. Click "Generate AI Fix" to request one.
          </p>
          <p v-else-if="!issue.fixSuggestion && store.aiFixLoading" class="text-sm text-slate-500" aria-live="polite">
            Generating AI fix suggestion…
          </p>
          <FixViewer v-else :element="issue.element" :fix-suggestion="issue.fixSuggestion" />
        </UiCardContent>
      </UiCard>
    </template>
  </div>
</template>
