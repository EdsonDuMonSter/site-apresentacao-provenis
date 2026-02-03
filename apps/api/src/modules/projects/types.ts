export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectStat {
  id: number;
  project_id: number;
  label: string;
  value: string;
  sort_order: number;
}

export interface ProjectImage {
  id: number;
  project_id: number;
  url: string;
  alt_text: string | null;
  caption: string | null;
  is_thumbnail: boolean;
  sort_order: number;
  created_at: Date;
}

export interface Project {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  tags: string[];
  client_name: string | null;
  project_url: string | null;
  completion_date: Date | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectWithDetails extends Project {
  category: Category;
  images: ProjectImage[];
  stats: ProjectStat[];
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
