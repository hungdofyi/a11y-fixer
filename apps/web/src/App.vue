<script setup lang="ts">
// Root application layout with accessible nav sidebar and router-view
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="flex min-h-screen">
    <nav class="w-[220px] bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0 sticky top-0 h-screen" aria-label="Main navigation">
      <div class="px-4 py-5 border-b border-slate-200">
        <RouterLink to="/" class="flex items-center gap-2 no-underline font-bold text-base text-slate-900" aria-label="a11y-fixer home">
          <span aria-hidden="true" class="text-xl">♿</span>
          <span>a11y-fixer</span>
        </RouterLink>
      </div>
      <ul class="list-none py-3 flex-1" role="list">
        <li>
          <RouterLink
            to="/"
            class="flex items-center gap-2.5 px-4 py-2.5 no-underline text-slate-500 text-sm font-medium transition-colors hover:bg-blue-50 hover:text-blue-700 [&.router-link-active]:bg-blue-50 [&.router-link-active]:text-blue-600 [&.router-link-active]:font-semibold [&.router-link-active]:border-l-[3px] [&.router-link-active]:border-blue-600 [&.router-link-active]:pl-[calc(1rem-3px)]"
            aria-current-value="page"
          >
            <span aria-hidden="true">📁</span> Projects
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/vpat"
            class="flex items-center gap-2.5 px-4 py-2.5 no-underline text-slate-500 text-sm font-medium transition-colors hover:bg-blue-50 hover:text-blue-700 [&.router-link-active]:bg-blue-50 [&.router-link-active]:text-blue-600 [&.router-link-active]:font-semibold [&.router-link-active]:border-l-[3px] [&.router-link-active]:border-blue-600 [&.router-link-active]:pl-[calc(1rem-3px)]"
          >
            <span aria-hidden="true">📄</span> VPAT Generator
          </RouterLink>
        </li>
      </ul>
    </nav>

    <main class="flex-1 p-8 overflow-y-auto min-w-0" id="main-content" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>
