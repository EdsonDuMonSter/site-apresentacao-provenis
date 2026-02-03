# Postgres (infra)

- Docker compose: [infra/postgres/docker-compose.yml](../infra/postgres/docker-compose.yml)
- Guia multi-tenant (1 DB + 1 schema por cliente): [postgres.md](../postgres.md)

## Subir o Postgres local

- `cp infra/postgres/.env.example infra/postgres/.env`
- `docker compose -f infra/postgres/docker-compose.yml up -d`

> Importante: o compose faz bind local em `127.0.0.1:5433` (não expõe na internet).
