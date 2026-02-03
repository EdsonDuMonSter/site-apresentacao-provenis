import express from 'express';
import { settingsRouter } from './modules/settings/index.js';
import { createProjectsRouter } from './modules/projects/routes.js';
import { createContactRouter } from './modules/contact/routes.js';
import { getPool } from './infra/db/pool.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // CORS for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Client-Key');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(settingsRouter);
  
  // Projects API
  const pool = getPool();
  app.use('/api/projects', createProjectsRouter(pool));

  // Contact API
  app.use('/api/contact', createContactRouter(pool));

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
