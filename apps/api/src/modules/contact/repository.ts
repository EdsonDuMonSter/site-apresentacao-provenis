import { Pool, type PoolClient } from 'pg';
import { schemaFromClientKey } from '../../infra/db/tenant.js';
import type { CreateContactMessageInput } from './types.js';

function quoteIdent(ident: string) {
  return `"${ident.replace(/"/g, '""')}"`;
}

export class ContactRepository {
  constructor(private pool: Pool) {}

  private async setSchema(clientKey: string, client?: any) {
    const tenantSchema = schemaFromClientKey(clientKey);
    const query = `SET LOCAL search_path TO ${quoteIdent(tenantSchema)}, public`;
    if (client) {
      await client.query(query);
    } else {
      await this.pool.query(query);
    }
  }

  private async ensureSchema(clientKey: string, client: PoolClient): Promise<void> {
    const tenantSchema = schemaFromClientKey(clientKey);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(tenantSchema)}`);
    await this.setSchema(clientKey, client);

    const sql = `
        CREATE TABLE IF NOT EXISTS contact_messages (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          contact_method VARCHAR(20) NOT NULL,
          phone TEXT,
          discord TEXT,
          message TEXT NOT NULL,
          page_url TEXT,
          user_agent TEXT,
          ip TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT contact_messages_method_chk CHECK (contact_method IN ('whatsapp', 'discord')),
          CONSTRAINT contact_messages_method_fields_chk CHECK (
            (contact_method = 'whatsapp' AND phone IS NOT NULL AND length(trim(phone)) > 0 AND (discord IS NULL OR length(trim(discord)) = 0))
            OR
            (contact_method = 'discord' AND discord IS NOT NULL AND length(trim(discord)) > 0 AND (phone IS NULL OR length(trim(phone)) = 0))
          )
        );

        CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
      `;

    await client.query(sql);
  }

  async initSchema(clientKey: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.ensureSchema(clientKey, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createMessage(clientKey: string, input: CreateContactMessageInput): Promise<{ id: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.ensureSchema(clientKey, client);

      const result = await client.query<{ id: string }>(
        `
          INSERT INTO contact_messages (
            name, email, contact_method, phone, discord, message, page_url, user_agent, ip
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id::text as id
        `,
        [
          input.name,
          input.email,
          input.contact_method,
          input.phone ?? null,
          input.discord ?? null,
          input.message,
          input.page_url ?? null,
          input.user_agent ?? null,
          input.ip ?? null,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
