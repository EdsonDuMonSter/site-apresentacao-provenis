# Portfólio com API Backend

Sistema completo de portfólio com backend API em Node.js/PostgreSQL multi-tenant e frontend dinâmico.

## Estrutura

```
├── apps/
│   ├── api/          # Backend API (Node.js + Express + PostgreSQL)
│   └── web/          # Frontend (Vite + TypeScript)
```

## Setup Completo

### 1. Backend API

```bash
cd apps/api

# Configurar variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais do banco
# DATABASE_URL=postgres://user:pass@127.0.0.1:5433/Provenis_system
# DEFAULT_CLIENT_KEY=demo

# Instalar dependências (se necessário)
npm install

# Inicializar banco de dados e seeds
npm run db:seed

# Iniciar servidor de desenvolvimento
npm run dev
```

A API estará rodando em: `http://localhost:3000`

### 2. Frontend

```bash
cd apps/web

# Configurar variáveis de ambiente
cp .env.example .env

# Editar .env (valores padrão já funcionam):
# VITE_API_URL=http://localhost:3000
# VITE_CLIENT_KEY=demo

# Instalar dependências (se necessário)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará em: `http://localhost:5173`

## Como Funciona

### Backend (API)

- **Multi-tenant**: Cada cliente tem seu próprio schema PostgreSQL (`c_<client_key>`)
- **Autenticação**: Header `X-Client-Key` identifica o tenant
- **Endpoints**:
  - `GET /api/projects/categories` - Lista categorias
  - `GET /api/projects?category=sites&featured=true` - Lista projetos com filtros
  - `GET /api/projects/:slug` - Detalhes completos do projeto

### Frontend

- **Carregamento dinâmico**: Projetos carregados via API
- **Filtros**: Botões filtram por categoria (Sites, Bots, Automações)
- **Modal**: Clique em "Ver projeto" abre popup com detalhes completos, galeria de imagens e stats

### Banco de Dados

**Tabelas criadas automaticamente:**
- `categories` - Categorias dos projetos
- `projects` - Dados dos projetos
- `project_images` - Galeria de imagens
- `project_stats` - Métricas/estatísticas

**Seeds incluem:**
- 3 categorias (Sites, Bots, Automações)
- 6 projetos de exemplo (2 de cada categoria)
- Stats e descrições completas

## Gerenciamento de Projetos

### Via SQL

Conecte ao banco e use o schema do cliente:

```sql
\c Provenis_system
SET search_path TO c_demo, public;

-- Listar projetos
SELECT * FROM projects;

-- Adicionar projeto
INSERT INTO projects (category_id, title, slug, description, content, tags, status)
VALUES (
  1,
  'Novo Projeto',
  'novo-projeto',
  'Descrição curta',
  '<h2>Conteúdo completo</h2><p>...</p>',
  ARRAY['Tag1', 'Tag2'],
  'published'
);

-- Adicionar imagem
INSERT INTO project_images (project_id, url, is_thumbnail)
VALUES (1, 'https://url-da-imagem.com/img.jpg', true);

-- Adicionar stat
INSERT INTO project_stats (project_id, label, value)
VALUES (1, 'Métrica importante', '+250%');
```

### Via API (futuro)

Endpoints CRUD serão adicionados para gerenciar projetos via painel admin.

## Próximos Passos

1. **Painel Admin** - Interface web para CRUD de projetos
2. **Upload de Imagens** - Integração com storage (S3, Cloudinary)
3. **Autenticação** - JWT para proteger rotas admin
4. **Cache** - Redis para melhorar performance
5. **Busca** - Full-text search em projetos

## Troubleshooting

### API não conecta ao banco
- Verifique `DATABASE_URL` no `.env`
- Certifique-se que PostgreSQL está rodando na porta 5433
- Teste conexão: `psql "postgres://user:pass@127.0.0.1:5433/Provenis_system"`

### Frontend não carrega projetos
- Verifique se API está rodando (`http://localhost:3000/health`)
- Abra console do navegador para ver erros
- Verifique CORS no navegador (dev mode permite `*`)
- Confirme `VITE_API_URL` e `VITE_CLIENT_KEY` no `.env`

### Projetos não aparecem
- Execute `npm run db:seed` novamente
- Verifique se o `DEFAULT_CLIENT_KEY` no backend é o mesmo que `VITE_CLIENT_KEY` no frontend
- Teste a API diretamente: `curl -H "X-Client-Key: demo" http://localhost:3000/api/projects`

## Documentação

- [API README](apps/api/src/modules/projects/README.md) - Documentação completa da API
- [Schema SQL](apps/api/src/modules/projects/schema.sql) - Estrutura do banco
- [Seeds SQL](apps/api/src/modules/projects/seeds.sql) - Dados de exemplo
