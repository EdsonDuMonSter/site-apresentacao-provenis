import type { Request, Response } from 'express';
import { getClientKey } from '../../infra/http/tenant.js';
import { withTenant } from '../../infra/db/tenant.js';
import * as service from './service.js';

export async function get(req: Request, res: Response) {
  const clientKey = getClientKey(req);
  if (!clientKey) {
    return res.status(400).json({ error: 'Tenant ausente. Envie o header X-Client-Key.' });
  }

  const key = String(req.params.key || '').trim();
  if (!key) return res.status(400).json({ error: 'key inválida' });

  const setting = await withTenant(clientKey, (q) => service.read(q, key));
  if (!setting) return res.status(404).json({ error: 'not_found' });

  return res.json(setting);
}

export async function put(req: Request, res: Response) {
  const clientKey = getClientKey(req);
  if (!clientKey) {
    return res.status(400).json({ error: 'Tenant ausente. Envie o header X-Client-Key.' });
  }

  const key = String(req.params.key || '').trim();
  const value = typeof req.body?.value === 'string' ? req.body.value : null;
  if (!key) return res.status(400).json({ error: 'key inválida' });
  if (value === null) return res.status(400).json({ error: 'value inválido (string)' });

  const setting = await withTenant(clientKey, (q) => service.write(q, key, value));
  return res.json(setting);
}
