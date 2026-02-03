# Postgres no site/backend (API): 1 DB + 1 schema por cliente (c_<client_key>)

Este arquivo é um “prompt/guia” pronto para você colar em outra IA e ela replicar o mesmo modelo para um **site/backend (API)** usando Postgres multi-tenant via schema.

## Como funciona (resumo técnico)

- Existe **1 PostgreSQL** e **1 database central** (no seu caso: `Provenis_system`).
- Cada cliente/tenant usa **1 schema próprio**: `c_<client_key>`.
- A API define o schema **por request** (ou por operação), usando o `client_key` do tenant:
   - dentro de transação: `SET LOCAL search_path TO c_<client_key>, public;`
   - daí em diante, toda query `SELECT ... FROM app_settings` cai no schema certo.
- A aplicação pode **criar as tabelas automaticamente** no schema do cliente (DDL idempotente: `CREATE TABLE IF NOT EXISTS ...`).
- Configurações ficam numa tabela por cliente: `app_settings (key, value, updated_at)`.
- Segredos podem ser salvos no banco e **criptografados** (AES-256-GCM) se existir `SETTINGS_ENCRYPTION_KEY`.

> Observação importante (API com pool): com `pg.Pool`, nunca use `SET search_path` “solto” sem transação. Use `BEGIN` + `SET LOCAL ...` para não vazar tenant entre requests.

## PROMPT (cole em outra IA)

Você é um engenheiro DevOps/Backend. Preciso de um passo a passo **executável** para subir PostgreSQL em Docker e preparar um banco para um site/backend (API) Node/TypeScript que usa **um schema por cliente**.

Regras obrigatórias:
- Vou ter **1 PostgreSQL** e **1 database central**.
- Cada cliente usa **1 schema** no padrão `c_<client_key>`.
- A API cria/garante as próprias tabelas no schema (não existe migration manual por cliente).
- Segurança: **não expor Postgres na internet** (bind local + SSH tunnel se necessário).

O que você deve entregar:

1) `docker-compose.yml` para Postgres 16 com volume persistente e bind local `127.0.0.1:5433:5432` (+ healthcheck opcional).
2) Comandos para:
   - criar o database central (se ainda não existir; no seu caso ele já existe: `Provenis_system`)
   - criar schema `c_<client_key>`
   - criar um usuário da API (role) com permissões mínimas
3) SQL idempotente para permissões mínimas:
   - `GRANT CONNECT` no database
   - `GRANT USAGE, CREATE ON SCHEMA c_<client_key>`
   - `ALTER DEFAULT PRIVILEGES` para a API ter `SELECT/INSERT/UPDATE/DELETE` nas tabelas criadas por ela
4) Como configurar a API (env vars) e o detalhe mais importante:
   - `DATABASE_URL=postgres://<user>:<pass>@127.0.0.1:5433/<db>?sslmode=disable`
   - como identificar o tenant (ex.: `X-Client-Key`, subdomínio, claim do JWT)
   - em cada request/transaction: `BEGIN; SET LOCAL search_path TO c_<client_key>, public; ...; COMMIT;`
5) Checklist de validação com `psql`:
   - conectar com o usuário da API
   - setar `search_path`
   - criar uma tabela de teste
   - inserir/ler 1 linha
6) Perguntas mínimas antes dos comandos (somente o necessário):
   - nome do database (no seu caso: `Provenis_system`)
   - `client_key` do primeiro cliente
   - usuário/senha da API
   - senha do superuser postgres

### Dados do meu ambiente (preencha e use nos comandos)

- VPS OS: Linux
- Docker instalado: (sim/não) = <PREENCHA>
- Postgres: 16
- Bind local: `127.0.0.1:5433:5432`
- Nome do database central: `Provenis_system`
- Senha do postgres (superuser): <PREENCHA>
- client_key do primeiro cliente: <PREENCHA>
- schema do primeiro cliente: `c_<client_key>`
- usuário da API: <PREENCHA>
- senha do usuário da API: <PREENCHA>

Comece pedindo só o mínimo. Depois me dê os comandos prontos, em ordem.

## SQL pronto (referência)

> Use esta seção se você quiser executar direto no `psql` como postgres.

### 1) Criar schema do cliente

```sql
CREATE SCHEMA IF NOT EXISTS c_acme;
```

### 2) Criar role da API (idempotente)

```sql
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'api_acme') THEN
      CREATE ROLE api_acme LOGIN PASSWORD 'TROQUE_ESTA_SENHA';
  END IF;
END $$;
```

### 3) Permissões mínimas

```sql
-- conectividade
GRANT CONNECT ON DATABASE "Provenis_system" TO api_acme;

-- usar e criar objetos no schema do cliente
GRANT USAGE, CREATE ON SCHEMA c_acme TO api_acme;

-- garantir que tabelas futuras criadas no schema já nasçam com permissão
ALTER DEFAULT PRIVILEGES IN SCHEMA c_acme
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO api_acme;

ALTER DEFAULT PRIVILEGES IN SCHEMA c_acme
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO api_acme;
```

> Se o seu database tiver outro nome, troque "Provenis_system" acima.

> Observação: o comando `ALTER DEFAULT PRIVILEGES` aplica para o dono que executar esse SQL. Execute como `postgres` (ou como o owner do schema) para ficar consistente.

## Checklist de validação (psql)

1) Entrar como usuário da API:

```bash
psql "postgres://api_acme:SENHA@127.0.0.1:5433/Provenis_system?sslmode=disable"
```

> Se o seu database tiver outro nome, troque `Provenis_system` na URL.

2) Apontar para o schema do cliente:

```sql
SET search_path TO c_acme, public;
SHOW search_path;
```

3) Teste de escrita/leitura no schema:

```sql
CREATE TABLE IF NOT EXISTS teste_schema (
  id SERIAL PRIMARY KEY,
  note TEXT NOT NULL
);

INSERT INTO teste_schema (note) VALUES ('ok');
SELECT * FROM teste_schema;

-- deve aparecer como c_acme.teste_schema
\dt c_acme.*
```

## Nota sobre segredos (opcional)

Se você quiser salvar segredos no DB com criptografia, o app usa uma chave de ambiente (32 bytes). O valor é salvo como `enc:v1:<base64>`.

- Env var: `SETTINGS_ENCRYPTION_KEY=<chave forte>`
- Sem essa env var, a aplicação pode armazenar como “plain” ou como `enc:v1:...` com fallback (dependendo do código), mas o recomendado é sempre setar a chave.

## Exemplo prático (API Node + pg.Pool)

Use este padrão para evitar vazamento de tenant quando você usa pool:

```ts
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function schemaFromClientKey(clientKey: string) {
   const safe = clientKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
   return `c_${safe}`;
}

export async function withTenant<T>(clientKey: string, fn: (q: (sql: string, params?: any[]) => Promise<any>) => Promise<T>) {
   const client = await pool.connect();
   const schema = schemaFromClientKey(clientKey);

   try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${schema}, public`);
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
```
