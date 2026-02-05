# Blueprint para replicar este projeto (layout + cores + banco + API)

Este documento descreve **exatamente** o padrão deste repo para você criar outro site “igual” (mesma identidade visual, mesmas páginas/fluxos, mesma API e mesmo modelo de banco multi-tenant por schema).

> Objetivo: você copiar/colar isto em outra IA e ela conseguir reconstruir o projeto com a mesma organização.

---

## 1) Stack e arquitetura (alto nível)

**Monorepo Node + TypeScript** com 2 apps:

- **Web**: Vite (multipage), HTML + CSS por página, TypeScript para interação e consumo de API.
- **API**: Node + Express + `pg` (Pool), endpoints REST, multi-tenant por **schema**.
- **Banco**: PostgreSQL (central) com **1 database** e **1 schema por cliente**.
- **Produção**: Docker Compose com:
  - `web`: Nginx servindo estático + proxy de `/api/*` para `api`.
  - `api`: Node rodando Express.

Ponto crítico do multi-tenant:
- O tenant é resolvido por header HTTP (padrão: `X-Client-Key`).
- Para cada request, as queries rodam em transação usando `SET LOCAL search_path` para o schema `c_<client_key>`.

---

## 2) Identidade visual (cores, tipografia, estilo)

### Tipografia
- Fonte principal (sans): **Inter**
- Fonte serifada (destaques): **Instrument Serif**

Carregamento via Google Fonts (import no CSS da Home):
- `https://fonts.googleapis.com/css2?family=Inter:...&family=Instrument+Serif:...`

### Paleta (CSS Variables)
Definida em `:root` (na Home) e replicada nas outras páginas:

- `--black: #0a0a0a`
- `--black-light: #1a1a1a`
- `--gold: #d4af37`
- `--gold-light: #f4d576`
- `--gold-dark: #b8960f`
- `--white: #ffffff`
- `--gray: #6b7280`
- `--gray-light: #9ca3af`
- `--border: rgba(212, 175, 55, 0.15)`

### Motion/easing
- `--ease: cubic-bezier(0.4, 0, 0.2, 1)`
- `--ease-out: cubic-bezier(0, 0, 0.2, 1)`
- `--ease-in: cubic-bezier(0.4, 0, 1, 1)`

### Overlay de grain (ruído)
- Elemento fixo `.grain` (em todas as páginas principais) com `background-image` em **data-uri SVG**.
- Opacidade baixa e `animation: grain 8s steps(10) infinite`.

### Componentes visuais
- Header fixo com blur (`backdrop-filter`) e borda dourada translúcida.
- Botões com estilo premium (dourado/escuro) e hover suave.
- Ícones circulares no header (WhatsApp/Discord) com borda dourada.

---

## 3) Logo e favicon

Assets públicos (servidos pelo Nginx com cache longo):
- `/assets/brand/provenis-logo.png`
- `/assets/brand/provenis-logo.svg` (fallback)

Uso no header/rodapé:
- `<img class="logo-mark" src="/assets/brand/provenis-logo.png" ... onerror="...provenis-logo.svg" />`
- Texto `PROVENIS` visível ao lado.

Favicon configurado (PNG + SVG):
- `<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/provenis-logo.png" />`
- `<link rel="icon" type="image/svg+xml" href="/assets/brand/provenis-logo.svg" />`
- `<link rel="apple-touch-icon" href="/assets/brand/provenis-logo.png" />`

---

## 4) Organização de pastas (detalhada)

### Raiz do repo

- `apps/`
  - `web/` (frontend)
  - `api/` (backend)
- `docs/` (documentação)
- `.github/workflows/` (CI/CD para GHCR)
- `Dockerfile.web` / `Dockerfile.api` (build produção)
- `docker-compose.prod.yml` (produção build local)
- `docker-compose.prod.ghcr.yml` (produção via imagens GHCR)
- `.env.production.example` (exemplo de variáveis)

### Web (Vite multipage)

Pasta raiz do Vite:
- `apps/web/src/` (é o `root` configurado no Vite)

Estrutura:
- `apps/web/src/index.html`
  - Página de “redirect” para `/pages/home/index.html`.
- `apps/web/src/pages/` (uma pasta por página)
  - `home/`
    - `index.html` (estrutura completa da landing)
    - `style.css` (tema preto/dourado + componentes)
    - `main.ts` (animações/interações + contato)
  - `trabalhos/`
    - `index.html` (grid + filtros + modal)
    - `style.css`
    - `main.ts` (carrega projetos via API)
  - `about/` (página simples exemplo)
- `apps/web/src/lib/api.ts`
  - Wrapper de API (fetch) + tipos de `projects`.
  - Sempre envia header `X-Client-Key` com `VITE_CLIENT_KEY`.
- `apps/web/src/features/`
  - Espaço para lógica por “feature” (padrão do repo).
- `apps/web/src/public/`
  - Tudo aqui vira arquivo público em `/` depois do build.
  - Ex.: `apps/web/src/public/assets/brand/...` vira `/assets/brand/...`.

Config multipage:
- `apps/web/vite.config.ts`
  - `rollupOptions.input` define entradas: `home`, `about`, `trabalhos`.

Nginx do web:
- `apps/web/nginx.conf`
  - Proxy `/api/` → `http://api:3000`
  - `location /assets/` com cache agressivo
  - `location = /` serve `/pages/home/index.html`

### API (Express + pg)

Estrutura:
- `apps/api/src/main.ts` (bootstrap + porta)
- `apps/api/src/app.ts` (Express, routers, CORS, health)
- `apps/api/src/infra/`
  - `db/pool.ts` → cria/retorna `pg.Pool`
  - `db/tenant.ts` → `withTenant()` faz `BEGIN` + `SET LOCAL search_path` (seguro para pool)
  - `http/tenant.ts` → extrai o client key do header configurável
- `apps/api/src/modules/`
  - `projects/` (portfólio)
  - `contact/` (form contato)
  - `settings/` (chave/valor por tenant)

Padrão do módulo (ideal):
- `routes.ts` (rotas Express)
- `repository.ts`/`repo.ts` (acesso ao DB)
- `types.ts` (tipos)
- `controller.ts`/`service.ts` (quando aplicável)

---

## 5) Contrato de multi-tenant

### Header
- Nome padrão: `X-Client-Key`
- Configurável via env: `TENANT_HEADER`

### Schema
- A API converte `client_key` em schema: `c_<client_key_sanitizado>`
  - sanitização: lowercase e troca caracteres fora de `[a-z0-9_]` por `_`.

### Segurança do pool
- Sempre usar transação + `SET LOCAL search_path` para não “vazar” tenant entre conexões do pool.
- Implementação pronta: `apps/api/src/infra/db/tenant.ts` (`withTenant`).

---

## 6) API HTTP (endpoints)

### Health
- `GET /health` → `{ status: 'ok' }`

### Projects (Portfólio)
Base: `/api/projects`

Requer header: `X-Client-Key: <client_key>`

- `GET /api/projects/categories`
  - Retorna categorias (`categories`).
- `GET /api/projects?category=<slug>&featured=true|false`
  - Lista projetos publicados.
- `GET /api/projects/:slug`
  - Detalhe do projeto + imagens + stats.
- `POST /api/projects/init-schema`
  - Cria schema/tabelas do módulo de projects (mais usado em dev).

### Contact
Base: `/api/contact`

- `POST /api/contact`
  - Body:
    - `name` (string)
    - `email` (string)
    - `contact_method` (string: `whatsapp` | `discord`) **ou** `method` (legado)
    - `phone` (string) quando `whatsapp`
    - `discord` (string) quando `discord`
    - `message` (string)
    - `page_url` (string) **ou** `pageUrl` (legado)
  - Salva em `contact_messages` no schema do tenant.

### Settings
- `GET /settings/:key`
- `PUT /settings/:key`

Tabela: `app_settings` (por tenant).

---

## 7) Banco de dados (Postgres): tabelas por tenant

Tudo abaixo existe **dentro do schema do tenant**, ex.: `c_site_provenis_vendas`.

### 7.1 projects/categories

**categories**
- `id SERIAL PK`
- `slug VARCHAR(50) UNIQUE NOT NULL`
- `name VARCHAR(100) NOT NULL`
- `description TEXT NULL`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

**projects**
- `id SERIAL PK`
- `category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE`
- `title VARCHAR(200) NOT NULL`
- `slug VARCHAR(200) UNIQUE NOT NULL`
- `description TEXT NOT NULL`
- `content TEXT NULL`
- `tags TEXT[]`
- `client_name VARCHAR(200) NULL`
- `project_url VARCHAR(500) NULL`
- `completion_date DATE NULL`
- `status VARCHAR(20) DEFAULT 'published'` (na prática: `draft|published|archived`)
- `featured BOOLEAN DEFAULT FALSE`
- `sort_order INTEGER DEFAULT 0`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

**project_images**
- `id SERIAL PK`
- `project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
- `url VARCHAR(500) NOT NULL`
- `alt_text VARCHAR(200) NULL`
- `caption TEXT NULL`
- `is_thumbnail BOOLEAN DEFAULT FALSE`
- `sort_order INTEGER DEFAULT 0`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

**project_stats**
- `id SERIAL PK`
- `project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
- `label VARCHAR(100) NOT NULL`
- `value VARCHAR(50) NOT NULL`
- `sort_order INTEGER DEFAULT 0`

Triggers:
- `update_updated_at_column()` + triggers em `categories` e `projects` para atualizar `updated_at`.

### 7.2 contact_messages

**contact_messages** (criada sob demanda no primeiro POST)
- `id BIGSERIAL PK`
- `name TEXT NOT NULL`
- `email TEXT NOT NULL`
- `contact_method VARCHAR(20) NOT NULL` (`whatsapp` | `discord`)
- `phone TEXT NULL`
- `discord TEXT NULL`
- `message TEXT NOT NULL`
- `page_url TEXT NULL`
- `user_agent TEXT NULL`
- `ip TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Constraints:
- `contact_method IN ('whatsapp','discord')`
- regra de consistência: se whatsapp → phone obrigatório e discord vazio; se discord → discord obrigatório e phone vazio.

### 7.3 app_settings

**app_settings**
- `key TEXT PK`
- `value TEXT NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 8) Variáveis de ambiente

### API
Obrigatório:
- `DATABASE_URL` (ex.: `postgres://user:pass@postgres16:5432/Provenis_system`)

Opcional:
- `PORT` (padrão 3000)
- `TENANT_HEADER` (padrão `X-Client-Key`)
- `DEFAULT_CLIENT_KEY` (padrão `site_provenis_vendas`)
- `EXTRA_SEARCH_PATH_SCHEMAS` (lista `schema1,schema2` que entram no search_path além do tenant; default é só `public`)

### WEB (build-time no Docker)
- `VITE_API_URL`
  - `same-origin` para usar proxy do Nginx em `/api` (recomendado em produção)
- `VITE_CLIENT_KEY`
  - o `client_key` padrão para o site (ex.: `site_provenis_vendas`)

---

## 9) Produção (Docker + Nginx)

### Compose
- `docker-compose.prod.yml`
  - Sobe `api` + `web`.
  - `web` expõe `127.0.0.1:8080:80`.
  - `api` conecta no Postgres central.
  - Requer rede externa do Postgres central: `postgresql_provenis_default`.

### Nginx (dentro do container web)
- Proxy `/api/` → `api:3000`.
- `location = /` serve a Home: `/pages/home/index.html`.
- Cache longo para `/assets/`.

### Deploy com build no VPS
1) Ajuste `.env`
2) `docker compose -f docker-compose.prod.yml up -d --build`

### Deploy puxando imagens do GHCR (sem build no VPS)
- Workflow: `.github/workflows/docker-publish-ghcr.yml`
- Override: `docker-compose.prod.ghcr.yml`

Comandos:
1) `docker login ghcr.io`
2) `GITHUB_REPOSITORY=<owner>/<repo> docker compose -f docker-compose.prod.yml -f docker-compose.prod.ghcr.yml up -d`

---

## 10) Checklist de replicação (para outra IA)

Peça para a outra IA fazer:

1) Criar monorepo com `apps/web` (Vite multipage TS) + `apps/api` (Express TS).
2) Replicar exatamente as variáveis CSS e fontes.
3) Replicar o overlay `.grain` (data-uri + animação).
4) Replicar header fixo com:
   - logo (imagem) + texto `PROVENIS`
   - ícones WhatsApp/Discord com botões circulares
5) Replicar páginas:
   - Home: sections modernas, CTA, formulário de contato que chama `POST /api/contact`
   - Trabalhos: filtros + grid; carrega categorias/projetos via API; modal com detalhes
6) Implementar API:
   - `X-Client-Key` obrigatório
   - multi-tenant por schema `c_<client_key>` com transação e `SET LOCAL search_path`
   - tabelas do portfólio e contato conforme acima
7) Produção:
   - Nginx servindo estático + proxy `/api`
   - compose com `web` e `api`

---

## 11) Observações importantes

- O módulo `projects` tem `initSchema()` que cria tabelas/índices/triggers; em produção pode ser usado apenas no primeiro setup.
- O módulo `contact` cria a tabela `contact_messages` sob demanda e evita DDL se a tabela já existir (para compatibilidade com banco central onde o owner pode ser outro).
- Para manter consistência do tenant com pool, prefira sempre o padrão `withTenant()`.
