/**
 * Template para Technical Requirements Document (TRD)
 * Arquitetura técnica detalhada, decisões e trade-offs
 */

export interface TRDTemplate {
  version: string;
  projectName: string;
  prdReference: string;
  architecture: {
    overview: string;
    diagrams: string[];
  };
  stack: TechStack;
  dataModel: DataModelSpec;
  apiSpecification: APISpec;
  infrastructure: InfrastructureSpec;
  security: SecuritySpec;
  performance: PerformanceSpec;
  deployment: DeploymentSpec;
  monitoring: MonitoringSpec;
  tradeoffs: TechnicalTradeoff[];
}

export interface TechStack {
  frontend: {
    framework: string;
    stateManagement: string;
    styling: string;
    uiLibrary: string;
    buildTool: string;
    testing: string[];
  };
  backend: {
    runtime: string;
    framework: string;
    language: string;
    orm?: string;
    testing: string[];
  };
  database: {
    primary: string;
    cache?: string;
    search?: string;
  };
  infrastructure: {
    hosting: string;
    cdn?: string;
    containerization?: string;
    ci_cd: string;
  };
  integrations: {
    name: string;
    purpose: string;
    authentication: string;
  }[];
}

export interface DataModelSpec {
  orm: string;
  migrations: string;
  schema: string; // Path to schema file or inline
  indexes: Index[];
  constraints: Constraint[];
}

export interface Index {
  table: string;
  columns: string[];
  type: "btree" | "hash" | "gin" | "gist";
  unique: boolean;
}

export interface Constraint {
  table: string;
  type: "primary_key" | "foreign_key" | "unique" | "check";
  definition: string;
}

export interface APISpec {
  type: "REST" | "GraphQL" | "tRPC" | "gRPC";
  documentation: string; // URL to OpenAPI/Swagger
  versioning: string;
  rateLimit: {
    requests: number;
    window: string;
    strategy: string;
  };
  endpoints: EndpointSpec[];
}

export interface EndpointSpec {
  path: string;
  method: string;
  description: string;
  authentication: boolean;
  authorization: string[]; // roles
  request: {
    body?: string;
    params?: string;
    query?: string;
  };
  response: {
    success: string;
    errors: string[];
  };
}

export interface InfrastructureSpec {
  environments: {
    name: "development" | "staging" | "production";
    url: string;
    resources: {
      compute: string;
      memory: string;
      storage: string;
    };
  }[];
  scaling: {
    type: "horizontal" | "vertical" | "both";
    triggers: string[];
    limits: {
      min: number;
      max: number;
    };
  };
  backup: {
    frequency: string;
    retention: string;
    type: "full" | "incremental" | "differential";
  };
}

export interface SecuritySpec {
  authentication: {
    method: string;
    provider?: string;
    mfa: boolean;
  };
  authorization: {
    model: "RBAC" | "ABAC" | "ACL";
    roles: string[];
  };
  encryption: {
    atRest: string;
    inTransit: string;
  };
  compliance: string[];
  vulnerabilityScan: {
    tool: string;
    frequency: string;
  };
}

export interface PerformanceSpec {
  targets: {
    metric: string;
    target: string;
    measurement: string;
  }[];
  caching: {
    strategy: string;
    layers: string[];
    ttl: Record<string, string>;
  };
  optimization: {
    bundleSize: string;
    codeS splitting: boolean;
    lazyLoading: boolean;
    cdn: boolean;
  };
}

export interface DeploymentSpec {
  strategy: "blue-green" | "canary" | "rolling" | "recreate";
  pipeline: {
    stages: string[];
    approvals: string[];
  };
  rollback: {
    automated: boolean;
    triggers: string[];
  };
  environmentVariables: {
    key: string;
    required: boolean;
    description: string;
  }[];
}

export interface MonitoringSpec {
  apm: string;
  logs: {
    aggregation: string;
    retention: string;
  };
  metrics: {
    tool: string;
    dashboards: string[];
  };
  alerts: {
    channel: string;
    conditions: string[];
  };
  uptime: {
    tool: string;
    frequency: string;
  };
}

export interface TechnicalTradeoff {
  decision: string;
  context: string;
  options: {
    name: string;
    pros: string[];
    cons: string[];
  }[];
  chosen: string;
  rationale: string;
  consequences: string[];
}

/**
 * Gera TRD estruturado baseado no PRD e stack escolhido
 */
export function generateTRDTemplate(
  projectName: string,
  prdReference: string,
  stack: Partial<TechStack>
): string {
  const template = `# Technical Requirements Document (TRD)
**Projeto:** ${projectName}
**Referência PRD:** ${prdReference}
**Versão:** 1.0.0
**Data:** ${new Date().toISOString().split("T")[0]}

---

## 1. Visão Geral da Arquitetura

### 1.1 Diagrama de Alto Nível
\`\`\`
[PREENCHER: Adicionar diagrama C4 ou equivalente]
\`\`\`

### 1.2 Princípios Arquiteturais
- Separação de Responsabilidades (SoC)
- Princípio do Menor Privilégio
- Falha Rápida e Graciosamente
- Stateless quando possível
- Idempotência em operações críticas

---

## 2. Stack Tecnológico

### 2.1 Frontend
- **Framework:** ${stack.frontend?.framework || "[PREENCHER]"}
- **State Management:** ${stack.frontend?.stateManagement || "[PREENCHER]"}
- **Styling:** ${stack.frontend?.styling || "Tailwind CSS v4"}
- **UI Library:** ${stack.frontend?.uiLibrary || "shadcn/ui + Radix"}
- **Build Tool:** ${stack.frontend?.buildTool || "Vite"}
- **Testing:** ${stack.frontend?.testing?.join(", ") || "Vitest, Playwright"}

### 2.2 Backend
- **Runtime:** ${stack.backend?.runtime || "[PREENCHER]"}
- **Framework:** ${stack.backend?.framework || "[PREENCHER]"}
- **Linguagem:** ${stack.backend?.language || "[PREENCHER]"}
- **ORM:** ${stack.backend?.orm || "[PREENCHER: Prisma, Drizzle, TypeORM]"}
- **Testing:** ${stack.backend?.testing?.join(", ") || "Jest, Supertest"}

### 2.3 Banco de Dados
- **Primary:** ${stack.database?.primary || "[PREENCHER: PostgreSQL, MySQL]"}
- **Cache:** ${stack.database?.cache || "[PREENCHER: Redis, Memcached, ou N/A]"}
- **Search:** ${stack.database?.search || "[PREENCHER: Elasticsearch, Meilisearch, ou N/A]"}

### 2.4 Infraestrutura
- **Hosting:** ${stack.infrastructure?.hosting || "[PREENCHER]"}
- **CDN:** [PREENCHER: Cloudflare, AWS CloudFront, ou N/A]
- **Containerização:** [PREENCHER: Docker, ou N/A]
- **CI/CD:** ${stack.infrastructure?.ci_cd || "[PREENCHER: GitHub Actions, GitLab CI]"}

### 2.5 Integrações
${
  stack.integrations?.map((i) => `- **${i.name}:** ${i.purpose} (Auth: ${i.authentication})`).join("\n") ||
  "[PREENCHER: listar integrações de terceiros]"
}

---

## 3. Modelo de Dados

### 3.1 ORM e Migrações
**ORM:** [PREENCHER: Prisma, Drizzle, etc.]
**Estratégia de Migração:** Versionadas, aplicadas via CI/CD

### 3.2 Schema Principal
\`\`\`prisma
// Exemplo: schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
}

enum Role {
  USER
  ADMIN
  MANAGER
}

[PREENCHER: adicionar demais modelos]
\`\`\`

### 3.3 Índices e Performance
| Tabela | Colunas | Tipo | Justificativa |
|--------|---------|------|---------------|
| users  | email   | btree (unique) | Busca rápida no login |
| [PREENCHER] | [PREENCHER] | [PREENCHER] | [PREENCHER] |

### 3.4 Constraints e Validações
- **Primary Keys:** UUID v4 em todas as tabelas
- **Foreign Keys:** Com ON DELETE CASCADE onde apropriado
- **Check Constraints:** [PREENCHER: ex: valor > 0 em transações]

---

## 4. Especificação de API

### 4.1 Tipo e Versionamento
**Tipo:** REST | GraphQL | tRPC
**Versionamento:** URL-based (`/api/v1/`) ou Header-based
**Documentação:** [PREENCHER: URL do Swagger/OpenAPI]

### 4.2 Rate Limiting
- **Não autenticado:** 60 req/min por IP
- **Autenticado:** 1000 req/min por usuário
- **Estratégia:** Token Bucket via middleware

### 4.3 Endpoints Principais

#### POST /api/v1/auth/login
**Descrição:** Autentica usuário e retorna JWT
**Autenticação:** Não
**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "string"
}
\`\`\`
**Response (200):**
\`\`\`json
{
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "expiresIn": 3600
}
\`\`\`
**Errors:** 400 (Invalid credentials), 429 (Too many requests)

[PREENCHER: adicionar demais endpoints]

---

## 5. Infraestrutura

### 5.1 Ambientes

| Ambiente | URL | Compute | Memory | Storage |
|----------|-----|---------|--------|---------|
| Development | localhost:3000 | Local | 8GB | N/A |
| Staging | staging.example.com | [PREENCHER] | [PREENCHER] | [PREENCHER] |
| Production | example.com | [PREENCHER] | [PREENCHER] | [PREENCHER] |

### 5.2 Estratégia de Scaling
**Tipo:** Horizontal | Vertical
**Triggers:**
- CPU > 70% por 5 minutos
- Memory > 80% por 5 minutos
- [PREENCHER: métricas customizadas]

**Limites:**
- **Min:** 2 instâncias (produção)
- **Max:** 10 instâncias (produção)

### 5.3 Backup e Disaster Recovery
**Frequência:** Diário (2h da manhã UTC)
**Retenção:**
- Daily: 7 dias
- Weekly: 4 semanas
- Monthly: 12 meses

**RPO (Recovery Point Objective):** 1 hora
**RTO (Recovery Time Objective):** 4 horas

---

## 6. Segurança

### 6.1 Autenticação
**Método:** JWT (Access + Refresh tokens)
**Provider:** [PREENCHER: Auth0, Supabase Auth, custom]
**MFA:** Sim (TOTP via app autenticador)

### 6.2 Autorização
**Modelo:** RBAC (Role-Based Access Control)
**Roles:**
- `ADMIN` - Acesso total
- `MANAGER` - Gerenciamento de recursos
- `USER` - Acesso básico

### 6.3 Criptografia
**Em Repouso:** AES-256-GCM
**Em Trânsito:** TLS 1.3
**Senhas:** Argon2id (não bcrypt - mais seguro)

### 6.4 Compliance
- **LGPD:** Sim - [PREENCHER: DPO designado, processos de DSAR]
- **OWASP Top 10:** Mitigado conforme [PREENCHER: link para checklist]
- [PREENCHER: outros frameworks aplicáveis]

### 6.5 Vulnerability Scanning
**Ferramenta:** [PREENCHER: Snyk, Dependabot, OWASP Dependency Check]
**Frequência:** Diária (dependências), Semanal (código)

---

## 7. Performance

### 7.1 Targets (Web Vitals)

| Métrica | Target | Medição |
|---------|--------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse, RUM |
| FID (First Input Delay) | < 100ms | RUM |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse, RUM |
| TTFB (Time to First Byte) | < 200ms | Synthetic monitoring |

### 7.2 Estratégia de Caching

**Frontend:**
- Static assets: Cache-Control: max-age=31536000, immutable
- API responses: Stale-while-revalidate onde apropriado

**Backend:**
- **L1 (In-memory):** Dados de configuração (TTL: 5 min)
- **L2 (Redis):** Sessões de usuário (TTL: 24h), resultados de queries custosas (TTL: 15 min)

### 7.3 Otimizações
- [x] Code splitting por rota
- [x] Lazy loading de componentes pesados
- [x] Image optimization (WebP, AVIF)
- [x] Tree shaking
- [x] Bundle analysis (target: < 200KB initial JS)

---

## 8. Deployment

### 8.1 Estratégia
**Tipo:** Blue-Green | Canary | Rolling

**Pipeline:**
1. Commit → GitHub
2. CI: Lint + Type Check + Unit Tests
3. Build: Gerar artefatos otimizados
4. Deploy Staging: Automático em merge para `main`
5. E2E Tests: Playwright em staging
6. Aprovação Manual: Product Owner
7. Deploy Production: [PREENCHER: estratégia]

### 8.2 Rollback
**Automático:** Sim, se health check falhar por 3 minutos consecutivos
**Manual:** Reverter último deploy via [PREENCHER: ferramenta/comando]

### 8.3 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| DATABASE_URL | Sim | Connection string do PostgreSQL |
| JWT_SECRET | Sim | Secret para assinar JWTs (min 32 chars) |
| [PREENCHER] | [PREENCHER] | [PREENCHER] |

---

## 9. Monitoramento e Observabilidade

### 9.1 APM (Application Performance Monitoring)
**Ferramenta:** [PREENCHER: Sentry, New Relic, DataDog]
**Métricas:**
- Latência de requisições (P50, P95, P99)
- Taxa de erros (4xx, 5xx)
- Throughput (req/s)

### 9.2 Logs
**Agregação:** [PREENCHER: ELK, Loki, CloudWatch]
**Retenção:** 30 dias (produção), 7 dias (outros)
**Formato:** JSON estruturado

\`\`\`json
{
  "timestamp": "2025-01-15T12:00:00Z",
  "level": "info",
  "message": "User logged in",
  "userId": "uuid",
  "ip": "192.168.1.1",
  "requestId": "req-uuid"
}
\`\`\`

### 9.3 Alertas
**Canal:** [PREENCHER: Slack, PagerDuty, email]
**Condições:**
- Error rate > 1% por 5 minutos
- Latência P95 > 1s por 10 minutos
- Uptime < 99.5% em 1 hora
- [PREENCHER: métricas de negócio]

### 9.4 Uptime Monitoring
**Ferramenta:** [PREENCHER: UptimeRobot, Pingdom]
**Frequência:** A cada 1 minuto
**Endpoints:** `/health`, `/api/v1/health`

---

## 10. Trade-offs e Decisões Técnicas

### Decisão 1: [PREENCHER: ex: Monolito vs Microserviços]

**Contexto:**
[PREENCHER: time pequeno, produto MVP, necessidade de velocidade]

**Opções Avaliadas:**

**Opção A: Monolito Modular**
- **Prós:** Deploy simples, debugging fácil, menos overhead de rede
- **Contras:** Escalabilidade vertical limitada, acoplamento se mal estruturado

**Opção B: Microserviços**
- **Prós:** Escalabilidade granular, times independentes
- **Contras:** Complexidade operacional, latência de rede, transações distribuídas

**Escolha:** Monolito Modular

**Justificativa:**
Para MVP com time enxuto, monolito bem estruturado permite velocidade de desenvolvimento sem sacrificar manutenibilidade. Módulos podem ser extraídos futuramente se necessário.

**Consequências:**
- Deploy atômico (simplifica rollback)
- Banco de dados compartilhado (exige disciplina em migrations)
- Possível refatoração futura se escala exigir

---

### Decisão 2: [PREENCHER]
[PREENCHER: repetir estrutura acima para cada decisão técnica importante]

---

## 11. Runbook de Infraestrutura

### 11.1 Deploy Manual (Emergência)
\`\`\`bash
# 1. Build
npm run build

# 2. Deploy
[PREENCHER: comandos específicos do host]

# 3. Verificação
curl https://example.com/health
\`\`\`

### 11.2 Rollback
\`\`\`bash
[PREENCHER: comandos para reverter deploy]
\`\`\`

### 11.3 Restore de Backup
\`\`\`bash
[PREENCHER: procedimento de restore do banco]
\`\`\`

---

## Anexos

- [Link para repositório Git]
- [Link para documentação de API (Swagger)]
- [Link para diagramas de arquitetura (Miro/Excalidraw)]
- [Link para especificação de testes]

---

**Changelog:**
- v1.0.0 (${new Date().toISOString().split("T")[0]}) - Versão inicial

`;

  return template;
}
