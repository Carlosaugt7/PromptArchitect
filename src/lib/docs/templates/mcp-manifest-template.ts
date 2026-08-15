/**
 * Template para MCP (Model Context Protocol) Manifest
 * Define tools/agentes que o sistema expõe, schemas de entrada/saída
 */

export interface MCPManifest {
  version: string;
  name: string;
  description: string;
  author: string;
  tools: MCPTool[];
  agents: MCPAgent[];
  schemas: Record<string, JSONSchema>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: string; // Reference to schema in schemas object
  outputSchema: string;
  authentication: "none" | "api_key" | "oauth2" | "jwt";
  rateLimit?: {
    requests: number;
    window: string;
  };
  examples: MCPExample[];
}

export interface MCPAgent {
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[]; // Tool names this agent can use
  escalationRules?: EscalationRule[];
  fallbackBehavior: string;
}

export interface EscalationRule {
  condition: string;
  action: "escalate_to_human" | "delegate_to_agent" | "fallback_response";
  target?: string;
}

export interface MCPExample {
  input: Record<string, any>;
  output: Record<string, any>;
  description: string;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Gera MCP Manifest para sistemas com agentes/IA
 */
export function generateMCPManifestTemplate(
  projectName: string,
  projectDescription: string
): string {
  const template = `# MCP (Model Context Protocol) Manifest
**Projeto:** ${projectName}
**Descrição:** ${projectDescription}
**Versão:** 1.0.0
**Data:** ${new Date().toISOString().split("T")[0]}

---

## Visão Geral

Este documento especifica as ferramentas (tools) e agentes expostos por **${projectName}** seguindo o padrão Model Context Protocol (MCP). Permite que LLMs externos interajam com o sistema de forma estruturada e previsível.

---

## 1. Metadados

\`\`\`json
{
  "version": "1.0.0",
  "name": "${projectName.toLowerCase().replace(/\\s+/g, "-")}",
  "description": "${projectDescription}",
  "author": "[PREENCHER: nome ou organização]",
  "homepage": "[PREENCHER: URL]",
  "repository": "[PREENCHER: URL do repo]"
}
\`\`\`

---

## 2. Tools (Ferramentas Expostas)

### 2.1 Tool: \`create_entity\`

**Descrição:** Cria uma nova entidade no sistema

**Input Schema:** \`CreateEntityInput\`
\`\`\`json
{
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "enum": ["user", "product", "order"],
      "description": "Tipo da entidade a ser criada"
    },
    "data": {
      "type": "object",
      "description": "Dados da entidade conforme schema específico"
    }
  },
  "required": ["entityType", "data"],
  "additionalProperties": false
}
\`\`\`

**Output Schema:** \`CreateEntityOutput\`
\`\`\`json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "entityType": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" },
    "status": { "type": "string", "enum": ["success", "error"] },
    "message": { "type": "string" }
  },
  "required": ["id", "status"]
}
\`\`\`

**Autenticação:** JWT (Bearer token no header)

**Rate Limit:** 100 requests/minuto

**Exemplos:**

Exemplo 1: Criar usuário
\`\`\`json
// Input
{
  "entityType": "user",
  "data": {
    "email": "user@example.com",
    "name": "João Silva",
    "role": "USER"
  }
}

// Output
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "entityType": "user",
  "createdAt": "2025-01-15T12:00:00Z",
  "status": "success",
  "message": "Usuário criado com sucesso"
}
\`\`\`

Exemplo 2: Erro de validação
\`\`\`json
// Input
{
  "entityType": "user",
  "data": {
    "email": "invalid-email"
  }
}

// Output
{
  "id": null,
  "status": "error",
  "message": "Email inválido. Required: name"
}
\`\`\`

---

### 2.2 Tool: \`query_entities\`

**Descrição:** Busca entidades com filtros e paginação

**Input Schema:** \`QueryEntitiesInput\`
\`\`\`json
{
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "description": "Tipo da entidade"
    },
    "filters": {
      "type": "object",
      "description": "Filtros chave-valor"
    },
    "pagination": {
      "type": "object",
      "properties": {
        "page": { "type": "integer", "minimum": 1, "default": 1 },
        "pageSize": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20 }
      }
    }
  },
  "required": ["entityType"]
}
\`\`\`

**Output Schema:** \`QueryEntitiesOutput\`
\`\`\`json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": { "type": "object" }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "total": { "type": "integer" },
        "page": { "type": "integer" },
        "pageSize": { "type": "integer" },
        "totalPages": { "type": "integer" }
      }
    }
  }
}
\`\`\`

**Autenticação:** JWT

**Rate Limit:** 200 requests/minuto

**Exemplo:**
\`\`\`json
// Input
{
  "entityType": "product",
  "filters": { "category": "electronics", "inStock": true },
  "pagination": { "page": 1, "pageSize": 10 }
}

// Output
{
  "data": [
    { "id": "uuid-1", "name": "Laptop", "price": 999.99, "category": "electronics" },
    { "id": "uuid-2", "name": "Mouse", "price": 29.99, "category": "electronics" }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
\`\`\`

---

[PREENCHER: adicionar demais tools conforme necessário]

---

## 3. Agentes

### 3.1 Agent: \`customer_support\`

**Papel:** Atendimento ao cliente via chat

**System Prompt:**
\`\`\`
Você é um assistente de atendimento ao cliente da ${projectName}.

**Identidade:**
- Nome: [PREENCHER: nome do agente]
- Tom: Profissional, empático e prestativo
- Objetivo: Resolver dúvidas e problemas dos clientes com eficiência

**Capacidades:**
- Consultar pedidos (tool: query_entities com entityType="order")
- Atualizar status de tickets (tool: update_entity)
- Escalar para humano se necessário

**Restrições:**
- NUNCA altere dados financeiros (preços, valores de pedido)
- NUNCA compartilhe dados pessoais de outros clientes
- Se não souber responder, escale para atendente humano

**Formato de Resposta:**
- Mensagens curtas e objetivas (máx 280 caracteres por mensagem)
- Use bullet points para listas
- Sempre termine com uma pergunta aberta se o problema não foi resolvido
\`\`\`

**Tools Disponíveis:**
- \`query_entities\`
- \`update_entity\`
- \`send_notification\`

**Regras de Escalonamento:**

| Condição | Ação |
|----------|------|
| Cliente menciona "falar com gerente" ou "humano" | Escalar para atendente humano |
| Dúvida sobre reembolso > R$ 500 | Escalar para supervisor |
| Fora do horário comercial (22h-6h) | Resposta automática com previsão de retorno |
| Cliente insatisfeito após 3 interações | Escalar para atendente humano |

**Fallback Behavior:**
Se não conseguir resolver, responder:
> "Entendo sua situação e vou transferir para um especialista que poderá ajudá-lo melhor. Um atendente entrará em contato em até [PREENCHER: SLA]."

---

### 3.2 Agent: \`sales_assistant\`

**Papel:** Assistente de vendas e recomendações de produtos

**System Prompt:**
\`\`\`
Você é um consultor de vendas da ${projectName}.

**Identidade:**
- Nome: [PREENCHER]
- Tom: Consultivo, entusiasta, mas não insistente
- Objetivo: Ajudar clientes a encontrar produtos adequados às suas necessidades

**Capacidades:**
- Buscar produtos (tool: query_entities com entityType="product")
- Comparar produtos (tool: compare_products)
- Aplicar cupons de desconto (tool: apply_coupon)

**Restrições:**
- NUNCA force uma venda
- Se o cliente não estiver interessado, respeite
- Não invente informações sobre produtos

**Formato de Resposta:**
- Apresente no máximo 3 opções de produtos por vez
- Destaque benefícios específicos para a necessidade do cliente
- Sempre inclua preço e disponibilidade
\`\`\`

**Tools Disponíveis:**
- \`query_entities\`
- \`compare_products\`
- \`apply_coupon\`

**Regras de Escalonamento:**
- Cliente quer negociar preço de alto valor (> R$ 5000) → Escalar para gerente comercial

---

[PREENCHER: adicionar demais agentes]

---

## 4. Schemas Completos

### 4.1 CreateEntityInput
\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "entityType": {
      "type": "string",
      "enum": ["user", "product", "order", "ticket"]
    },
    "data": {
      "type": "object",
      "description": "Schema varia conforme entityType"
    }
  },
  "required": ["entityType", "data"],
  "additionalProperties": false
}
\`\`\`

### 4.2 QueryEntitiesInput
\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "entityType": { "type": "string" },
    "filters": {
      "type": "object",
      "additionalProperties": true
    },
    "pagination": {
      "type": "object",
      "properties": {
        "page": { "type": "integer", "minimum": 1 },
        "pageSize": { "type": "integer", "minimum": 1, "maximum": 100 }
      }
    },
    "sort": {
      "type": "object",
      "properties": {
        "field": { "type": "string" },
        "order": { "type": "string", "enum": ["asc", "desc"] }
      }
    }
  },
  "required": ["entityType"]
}
\`\`\`

[PREENCHER: adicionar schemas completos de todos os tools]

---

## 5. Autenticação

### 5.1 Método: JWT Bearer Token

**Header:**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**Obtenção do Token:**
\`\`\`bash
curl -X POST https://api.example.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "password"}'
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600
}
\`\`\`

### 5.2 Refresh Token
Quando o token expirar (HTTP 401), use o refresh token:
\`\`\`bash
curl -X POST https://api.example.com/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refreshToken": "refresh_token_here"}'
\`\`\`

---

## 6. Rate Limiting

| Endpoint | Limite | Janela |
|----------|--------|--------|
| Todos os tools | 1000 req/min | Por usuário autenticado |
| \`create_entity\` | 100 req/min | Por usuário |
| \`query_entities\` | 200 req/min | Por usuário |

**Resposta ao exceder limite:**
\`\`\`json
{
  "error": "rate_limit_exceeded",
  "message": "Você excedeu o limite de 100 requisições por minuto",
  "retryAfter": 60
}
\`\`\`
HTTP Status: **429 Too Many Requests**

---

## 7. Tratamento de Erros

### 7.1 Códigos de Erro Padrão

| Código | Descrição | Exemplo |
|--------|-----------|---------|
| 400 | Bad Request | Input inválido, validação falhou |
| 401 | Unauthorized | Token ausente ou inválido |
| 403 | Forbidden | Usuário sem permissão para a operação |
| 404 | Not Found | Entidade não encontrada |
| 422 | Unprocessable Entity | Dados válidos mas lógica de negócio rejeitou |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro inesperado no servidor |

### 7.2 Formato de Erro
\`\`\`json
{
  "error": "validation_error",
  "message": "Email é obrigatório",
  "details": {
    "field": "email",
    "code": "required"
  },
  "requestId": "req-uuid-123"
}
\`\`\`

---

## 8. Versionamento

**Estratégia:** URL-based

**Versão Atual:** v1

**Base URL:** \`https://api.example.com/v1\`

**Deprecação:** Versões antigas serão suportadas por no mínimo 6 meses após lançamento de nova versão. Avisos serão enviados via:
- Response Header: \`Sunset: Sat, 01 Jul 2025 00:00:00 GMT\`
- Email para desenvolvedores registrados
- Changelog público

---

## 9. Testes e Validação

### 9.1 Ambiente de Sandbox
**URL:** \`https://sandbox-api.example.com/v1\`
**Características:**
- Dados de teste pré-populados
- Rate limit relaxado (10x do produção)
- Reset diário às 3h UTC

### 9.2 Casos de Teste Obrigatórios

**Teste 1: Criação de entidade com sucesso**
\`\`\`bash
curl -X POST https://sandbox-api.example.com/v1/tools/create_entity \\
  -H "Authorization: Bearer <sandbox_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entityType": "user",
    "data": {
      "email": "test@example.com",
      "name": "Test User",
      "role": "USER"
    }
  }'

# Esperado: HTTP 200, retorna ID da entidade criada
\`\`\`

**Teste 2: Validação de input inválido**
\`\`\`bash
curl -X POST https://sandbox-api.example.com/v1/tools/create_entity \\
  -H "Authorization: Bearer <sandbox_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entityType": "user",
    "data": {
      "email": "invalid-email"
    }
  }'

# Esperado: HTTP 400, mensagem de erro clara
\`\`\`

[PREENCHER: adicionar casos de teste para edge cases críticos]

---

## 10. Changelog

### v1.0.0 (2025-01-15)
- Versão inicial do MCP Manifest
- Tools: \`create_entity\`, \`query_entities\`
- Agentes: \`customer_support\`, \`sales_assistant\`

---

## Anexos

- [Coleção Postman/Insomnia]
- [SDK em TypeScript]
- [SDK em Python]
- [Documentação interativa (Swagger UI)]

`;

  return template;
}

/**
 * Valida se um MCP Manifest está bem formado
 */
export function validateMCPManifest(manifest: MCPManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest.version) errors.push("version é obrigatório");
  if (!manifest.name) errors.push("name é obrigatório");
  if (!manifest.tools || manifest.tools.length === 0) {
    errors.push("Pelo menos um tool deve ser definido");
  }

  manifest.tools?.forEach((tool, idx) => {
    if (!tool.name) errors.push(`Tool #${idx}: name é obrigatório`);
    if (!tool.inputSchema) errors.push(`Tool ${tool.name}: inputSchema é obrigatório`);
    if (!tool.outputSchema) errors.push(`Tool ${tool.name}: outputSchema é obrigatório`);
    if (tool.examples?.length === 0) {
      errors.push(`Tool ${tool.name}: Forneça pelo menos 1 exemplo`);
    }
  });

  manifest.agents?.forEach((agent, idx) => {
    if (!agent.name) errors.push(`Agent #${idx}: name é obrigatório`);
    if (!agent.systemPrompt) errors.push(`Agent ${agent.name}: systemPrompt é obrigatório`);
    if (!agent.fallbackBehavior) {
      errors.push(`Agent ${agent.name}: fallbackBehavior é obrigatório`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
