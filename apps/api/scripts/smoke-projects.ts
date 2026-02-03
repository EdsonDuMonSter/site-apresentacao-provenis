import 'dotenv/config';
import { createApp } from '../src/app.js';

const port = 3010;

async function main() {
  const app = createApp();

  const server = app.listen(port);

  try {
    const base = `http://127.0.0.1:${port}`;

    const health = await fetch(`${base}/health`);
    console.log('health', health.status, await health.text());

    const headers = { 'X-Client-Key': 'site_provenis_vendas' };

    const cats = await fetch(`${base}/api/projects/categories`, { headers });
    const categories = await cats.json();
    console.log(
      'categories',
      cats.status,
      Array.isArray(categories) ? categories.map((c: any) => c.slug).join(',') : 'not_array',
    );

    const projs = await fetch(`${base}/api/projects`, { headers });
    const projects = await projs.json();
    console.log('projects', projs.status, Array.isArray(projects) ? projects.length : 'not_array');

    const firstSlug = Array.isArray(projects) && projects[0]?.slug;
    if (firstSlug) {
      const one = await fetch(`${base}/api/projects/${firstSlug}`, { headers });
      const project = await one.json();
      console.log('project', one.status, project?.slug ?? 'missing_slug');
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

main().catch((err) => {
  console.error('smoke_failed', err);
  process.exitCode = 1;
});
