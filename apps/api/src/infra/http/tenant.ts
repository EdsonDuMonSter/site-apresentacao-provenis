import type { Request } from 'express';

export function getClientKey(req: Request) {
  const headerName = (process.env.TENANT_HEADER || 'X-Client-Key').toLowerCase();
  const raw = req.headers[headerName];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
