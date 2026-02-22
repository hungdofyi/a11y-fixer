import { createRouter, createWebHistory } from 'vue-router';
import ProjectsList from '../views/projects-list.vue';
import ProjectDetail from '../views/project-detail.vue';
import ScanResults from '../views/scan-results.vue';
import IssueDetail from '../views/issue-detail.vue';
import VpatWizard from '../views/vpat-wizard.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ProjectsList },
    { path: '/projects/:id', component: ProjectDetail },
    { path: '/scans/:id', component: ScanResults },
    { path: '/issues/:id', component: IssueDetail },
    { path: '/vpat', component: VpatWizard },
  ],
});
