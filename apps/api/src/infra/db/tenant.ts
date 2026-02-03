import type { PoolClient, QueryResult } from 'pg';
import { getPool } from './pool.js';

export function schemaFromClientKey(clientKey: string) {
  const safe = clientKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `c_${safe}`;
}

function normalizeSchemaName(value: string) {
  const safe = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return safe.trim() ? safe : null;
}

function quoteIdent(ident: string) {
  // Protege contra caracteres especiais; além disso, normalizamos antes.
  return `"${ident.replace(/"/g, '""')}"`;
}

function getExtraSchemasFromEnv() {
  const raw = process.env.EXTRA_SEARCH_PATH_SCHEMAS;
  if (!raw) return [];

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeSchemaName(s))
    .filter((s): s is string => Boolean(s));
}

export async function withTenant<T>(
  clientKey: string,
  fn: (q: (sql: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>
): Promise<T> {
  const client: PoolClient = await getPool().connect();
  const tenantSchema = schemaFromClientKey(clientKey);
  const extraSchemas = getExtraSchemasFromEnv();
  const schemas = Array.from(new Set([tenantSchema, ...extraSchemas, 'public']));

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO ${schemas.map(quoteIdent).join(', ')}`);

    const out = await fn((sql, params) => client.query(sql, params));

    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
