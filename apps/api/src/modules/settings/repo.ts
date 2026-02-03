import type { QueryResult } from 'pg';

export async function ensureTables(q: (sql: string, params?: unknown[]) => Promise<QueryResult>) {
  await q(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function getSetting(
  q: (sql: string, params?: unknown[]) => Promise<QueryResult>,
  key: string
) {
  const res = await q('SELECT key, value, updated_at FROM app_settings WHERE key = $1', [key]);
  return res.rows[0] ?? null;
}

export async function setSetting(
  q: (sql: string, params?: unknown[]) => Promise<QueryResult>,
  key: string,
  value: string
) {
  const res = await q(
    `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    RETURNING key, value, updated_at;
    `,
    [key, value]
  );
  return res.rows[0];
}
