# Projects API Module

Módulo de gerenciamento de portfólio/projetos com suporte multi-tenant via PostgreSQL schemas.

## Estrutura do Banco

### Tabelas

- **categories**: Categorias dos projetos (Sites, Bots, Automações)
- **projects**: Projetos do portfólio
- **project_images**: Imagens dos projetos (galeria + thumbnail)
- **project_stats**: Estatísticas/métricas dos projetos

### Multi-tenancy

Cada cliente tem seu próprio schema: `c_<client_key>`  
O client_key é identificado via header `X-Client-Key` nas requisições.

## Setup

### 1. Configurar .env

```bash
cd apps/api
cp .env.example .env
```

Edite `.env` e configure:
```env
DATABASE_URL=postgres://user:pass@127.0.0.1:5433/Provenis_system?sslmode=disable
DEFAULT_CLIENT_KEY=site_provenis_vendas
PORT=3000
```

### 2. Inicializar banco de dados

```bash
npm run db:seed
```

Esse comando cria/atualiza apenas o schema e as tabelas.

Isso irá:
- Criar schema `c_site_provenis_vendas` (ou o valor de DEFAULT_CLIENT_KEY)
- Criar todas as tabelas

Obs.: os arquivos de templates (seeds.sql) foram removidos (opção B). Se você quiser projetos iniciais, crie diretamente no banco.

## API Endpoints

Todos os endpoints requerem o header: `X-Client-Key: site_provenis_vendas`

### GET /api/projects/categories

Retorna todas as categorias.

**Response:**
```json
[
  {
    "id": 1,
    "slug": "sites",
    "name": "Sites",
    "description": "Websites e plataformas web"
  }
]
```

### GET /api/projects

Retorna lista de projetos.

**Query params:**
- `category`: filtrar por categoria slug (sites, bots, automations)
- `featured`: filtrar projetos em destaque (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Loja Virtual Premium",
    "slug": "loja-virtual-premium",
    "description": "E-commerce completo...",
    "tags": ["E-commerce", "React", "Node.js"],
    "featured": true,
    "category": {
      "id": 1,
      "slug": "sites",
      "name": "Sites"
    },
    "thumbnail": null,
    "stats": [
      { "label": "Aumento em vendas", "value": "+187%" },
      { "label": "Tempo de entrega", "value": "45 dias" }
    ]
  }
]
```

### GET /api/projects/:slug

Retorna projeto completo com todas as informações, imagens e stats.

**Response:**
```json
{
  "id": 1,
  "title": "Loja Virtual Premium",
  "slug": "loja-virtual-premium",
  "description": "E-commerce completo...",
  "content": "<h2>Sobre o Projeto</h2><p>...</p>",
  "tags": ["E-commerce", "React", "Node.js"],
  "client_name": "Boutique Fashion",
  "project_url": null,
  "completion_date": null,
  "status": "published",
  "featured": true,
  "category": {
    "id": 1,
    "slug": "sites",
    "name": "Sites",
    "description": "Websites e plataformas web"
  },
  "images": [
    {
      "id": 1,
      "url": "https://...",
      "alt_text": "Screenshot",
      "caption": "Página inicial",
      "is_thumbnail": true,
      "sort_order": 0
    }
  ],
  "stats": [
    { "id": 1, "label": "Aumento em vendas", "value": "+187%" },
    { "id": 2, "label": "Tempo de entrega", "value": "45 dias" }
  ]
}
```

## Exemplos de uso

### Listar todos os projetos
```bash
curl -H "X-Client-Key: site_provenis_vendas" http://localhost:3000/api/projects
```

### Filtrar por categoria
```bash
curl -H "X-Client-Key: site_provenis_vendas" "http://localhost:3000/api/projects?category=bots"
```

### Projetos em destaque
```bash
curl -H "X-Client-Key: site_provenis_vendas" "http://localhost:3000/api/projects?featured=true"
```

### Detalhes de um projeto
```bash
curl -H "X-Client-Key: site_provenis_vendas" http://localhost:3000/api/projects/loja-virtual-premium
```

### Listar categorias
```bash
curl -H "X-Client-Key: site_provenis_vendas" http://localhost:3000/api/projects/categories
```

## Desenvolvimento

```bash
# Iniciar servidor em modo watch
npm run dev

# Popular banco novamente (cuidado: insere duplicados se já existir)
npm run db:seed

# Build para produção
npm run build
npm start
```

## Próximos passos

- [ ] Adicionar endpoints CRUD (POST, PUT, DELETE) para admin
- [ ] Upload de imagens (integração com storage)
- [ ] Autenticação/autorização para rotas admin
- [ ] Paginação nos listagens
- [ ] Busca full-text nos projetos
- [ ] Cache com Redis
