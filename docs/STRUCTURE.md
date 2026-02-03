# Padrão de organização

## Regras

- **Cada página** fica dentro de sua própria pasta.
- **Cada função/módulo** fica dentro de sua própria pasta, com tudo que pertence a ela.

## Web

- `apps/web/src/pages/<pagina>/`
  - `index.html`
  - `style.css`
  - `main.ts`

- `apps/web/src/features/<feature>/` (lógica por função)
  - `index.ts`
  - `types.ts`
  - `helpers/`

## API

- `apps/api/src/modules/<modulo>/`
  - `index.ts`
  - `routes.ts`
  - `controller.ts`
  - `service.ts`
  - `repo.ts`
  - `types.ts`

- `apps/api/src/infra/db/` (infra compartilhada)
  - `pool.ts`
  - `tenant.ts` (SET LOCAL search_path dentro de transação)
