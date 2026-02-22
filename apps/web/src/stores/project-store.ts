// Pinia store for projects list and current project state
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiGet, apiPost } from '../composables/use-api.js';

export interface Project {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  url: string;
}

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjects(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await apiGet<Project[]>('/projects');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load projects';
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      currentProject.value = await apiGet<Project>(`/projects/${id}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load project';
    } finally {
      loading.value = false;
    }
  }

  async function createProject(input: CreateProjectInput): Promise<Project | null> {
    error.value = null;
    try {
      const project = await apiPost<Project>('/projects', input);
      projects.value.push(project);
      return project;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create project';
      return null;
    }
  }

  return { projects, currentProject, loading, error, fetchProjects, fetchProject, createProject };
});
