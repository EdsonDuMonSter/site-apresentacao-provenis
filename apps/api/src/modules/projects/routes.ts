import { Router, Request, Response } from 'express';
import { ProjectsRepository } from './repository.js';
import { Pool } from 'pg';
import { getClientKey as getClientKeyFromReq } from '../../infra/http/tenant.js';

export function createProjectsRouter(pool: Pool): Router {
  const router = Router();
  const repository = new ProjectsRepository(pool);

  const requireClientKey = (req: Request): string => {
    const clientKey = getClientKeyFromReq(req);
    if (!clientKey) {
      throw new Error('Tenant ausente. Envie o header X-Client-Key.');
    }
    return clientKey;
  };

  /**
   * GET /api/projects/categories
   * Retorna todas as categorias
   */
  router.get('/categories', async (req: Request, res: Response) => {
    try {
      const clientKey = requireClientKey(req);
      const categories = await repository.getCategories(clientKey);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  /**
   * GET /api/projects
   * Retorna lista de projetos com filtros opcionais
   * Query params: category, featured
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const clientKey = requireClientKey(req);
      const categorySlug = req.query.category as string | undefined;
      const featured = req.query.featured === 'true' ? true : undefined;

      const projects = await repository.getProjects(clientKey, {
        categorySlug,
        featured,
      });

      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  /**
   * GET /api/projects/:slug
   * Retorna projeto completo com imagens e stats
   */
  router.get('/:slug', async (req: Request, res: Response) => {
    try {
      const clientKey = requireClientKey(req);
      const { slug } = req.params;

      const project = await repository.getProjectBySlug(clientKey, slug);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  /**
   * POST /api/projects/init-schema
   * Inicializa schema e tabelas (dev only)
   */
  router.post('/init-schema', async (req: Request, res: Response) => {
    try {
      const clientKey = requireClientKey(req);
      await repository.initSchema(clientKey);
      res.json({ message: 'Schema initialized successfully' });
    } catch (error) {
      console.error('Error initializing schema:', error);
      res.status(500).json({ error: 'Failed to initialize schema' });
    }
  });

  return router;
}
