import { Pool } from 'pg';
import type { ProjectListItem, ProjectWithDetails, Category } from './types.js';
import { schemaFromClientKey } from '../../infra/db/tenant.js';

function quoteIdent(ident: string) {
  return `"${ident.replace(/"/g, '""')}"`;
}

export class ProjectsRepository {
  constructor(private pool: Pool) {}

  /**
   * Set schema for multi-tenant isolation
   */
  private async setSchema(clientKey: string, client?: any) {
    const tenantSchema = schemaFromClientKey(clientKey);
    const query = `SET LOCAL search_path TO ${quoteIdent(tenantSchema)}, public`;
    if (client) {
      await client.query(query);
    } else {
      await this.pool.query(query);
    }
  }

  /**
   * Initialize schema (create tables if not exist)
   */
  async initSchema(clientKey: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tenantSchema = schemaFromClientKey(clientKey);
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(tenantSchema)}`);
      await this.setSchema(clientKey, client);
      
      // Create tables, indexes and triggers
      const schemaSQL = `
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          slug VARCHAR(200) UNIQUE NOT NULL,
          description TEXT NOT NULL,
          content TEXT,
          tags TEXT[],
          client_name VARCHAR(200),
          project_url VARCHAR(500),
          completion_date DATE,
          status VARCHAR(20) DEFAULT 'published',
          featured BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS project_images (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          url VARCHAR(500) NOT NULL,
          alt_text VARCHAR(200),
          caption TEXT,
          is_thumbnail BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS project_stats (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          label VARCHAR(100) NOT NULL,
          value VARCHAR(50) NOT NULL,
          sort_order INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
        CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
        CREATE INDEX IF NOT EXISTS idx_project_images_project ON project_images(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_stats_project ON project_stats(project_id);

        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
        CREATE TRIGGER update_categories_updated_at
          BEFORE UPDATE ON categories
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
        CREATE TRIGGER update_projects_updated_at
          BEFORE UPDATE ON projects
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `;
      
      await client.query(schemaSQL);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all categories
   */
  async getCategories(clientKey: string): Promise<Category[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.setSchema(clientKey, client);
      
      const result = await client.query<Category>(`
        SELECT * FROM categories
        ORDER BY name
      `);
      
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all projects with optional filters
   */
  async getProjects(
    clientKey: string,
    filters?: {
      categorySlug?: string;
      featured?: boolean;
      status?: string;
    }
  ): Promise<ProjectListItem[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.setSchema(clientKey, client);

      let whereClause = 'WHERE p.status = $1';
      const params: any[] = [filters?.status || 'published'];
      let paramIndex = 2;

      if (filters?.categorySlug) {
        whereClause += ` AND c.slug = $${paramIndex}`;
        params.push(filters.categorySlug);
        paramIndex++;
      }

      if (filters?.featured !== undefined) {
        whereClause += ` AND p.featured = $${paramIndex}`;
        params.push(filters.featured);
        paramIndex++;
      }

      const result = await client.query(`
        SELECT 
          p.id,
          p.title,
          p.slug,
          p.description,
          p.tags,
          p.featured,
          json_build_object(
            'id', c.id,
            'slug', c.slug,
            'name', c.name
          ) as category,
          (
            SELECT url 
            FROM project_images 
            WHERE project_id = p.id AND is_thumbnail = true 
            LIMIT 1
          ) as thumbnail,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'label', ps.label,
                  'value', ps.value
                )
                ORDER BY ps.sort_order
              )
              FROM project_stats ps
              WHERE ps.project_id = p.id
            ),
            '[]'::json
          ) as stats
        FROM projects p
        INNER JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY p.featured DESC, p.sort_order ASC, p.created_at DESC
      `, params);

      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get single project with full details
   */
  async getProjectBySlug(
    clientKey: string,
    slug: string
  ): Promise<ProjectWithDetails | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.setSchema(clientKey, client);

      const projectResult = await client.query(`
        SELECT 
          p.*,
          json_build_object(
            'id', c.id,
            'slug', c.slug,
            'name', c.name,
            'description', c.description
          ) as category
        FROM projects p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE p.slug = $1 AND p.status = 'published'
      `, [slug]);

      if (projectResult.rows.length === 0) {
        await client.query('COMMIT');
        return null;
      }

      const project = projectResult.rows[0];

      // Get images
      const imagesResult = await client.query(`
        SELECT * FROM project_images
        WHERE project_id = $1
        ORDER BY sort_order, created_at
      `, [project.id]);

      // Get stats
      const statsResult = await client.query(`
        SELECT * FROM project_stats
        WHERE project_id = $1
        ORDER BY sort_order
      `, [project.id]);

      await client.query('COMMIT');

      return {
        ...project,
        images: imagesResult.rows,
        stats: statsResult.rows,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
