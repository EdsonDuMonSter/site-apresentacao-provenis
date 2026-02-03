// API Configuration
export const API_CONFIG = {
  baseURL: (() => {
    const envUrl = (import.meta.env.VITE_API_URL || '').trim();
    const fallback = 'http://localhost:3000';

    if (envUrl === 'same-origin' || envUrl === 'relative' || envUrl === '/') {
      return '';
    }

    if (typeof window === 'undefined') return envUrl || fallback;

    const pageHost = window.location.hostname;
    const pageProtocol = window.location.protocol;
    const isPageLocal = pageHost === 'localhost' || pageHost === '127.0.0.1';

    if (!envUrl) {
      // Assume API on same host:3000
      return `${pageProtocol}//${pageHost}:3000`;
    }

    // If envUrl points to localhost but the user is visiting via a remote host,
    // auto-correct to the same hostname to avoid requests going to the user's machine.
    const isEnvLocal = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl);
    if (isEnvLocal && !isPageLocal) {
      return `${pageProtocol}//${pageHost}:3000`;
    }

    return envUrl;
  })(),
  clientKey: (import.meta.env.VITE_CLIENT_KEY || 'site_provenis_vendas').trim() || 'site_provenis_vendas',
};

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
}

export interface ProjectStat {
  label: string;
  value: string;
}

export interface ProjectListItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  featured: boolean;
  category: {
    id: number;
    slug: string;
    name: string;
  };
  thumbnail: string | null;
  stats: ProjectStat[];
}

export interface ProjectImage {
  id: number;
  url: string;
  alt_text: string | null;
  caption: string | null;
  is_thumbnail: boolean;
  sort_order: number;
}

export interface ProjectDetails extends ProjectListItem {
  content: string;
  client_name: string | null;
  project_url: string | null;
  completion_date: string | null;
  images: ProjectImage[];
}

class ProjectsAPI {
  private baseURL: string;
  private clientKey: string;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.clientKey = API_CONFIG.clientKey;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'X-Client-Key': this.clientKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCategories(): Promise<Category[]> {
    return this.fetch<Category[]>('/api/projects/categories');
  }

  async getProjects(filters?: { category?: string; featured?: boolean }): Promise<ProjectListItem[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetch<ProjectListItem[]>(`/api/projects${query}`);
  }

  async getProject(slug: string): Promise<ProjectDetails> {
    return this.fetch<ProjectDetails>(`/api/projects/${slug}`);
  }
}

export const projectsAPI = new ProjectsAPI();
