# Guia de Uso - PromptArchitect

Este guia detalha como usar o PromptArchitect para criar sistemas complexos de forma estruturada e profissional.

---

## 📖 Índice

1. [Conceitos Fundamentais](#conceitos-fundamentais)
2. [Fluxo Completo de Trabalho](#fluxo-completo-de-trabalho)
3. [Discovery Estruturado](#discovery-estruturado)
4. [Geração de Documentos](#geração-de-documentos)
5. [Governança e Versionamento](#governança-e-versionamento)
6. [Casos de Uso por Segmento](#casos-de-uso-por-segmento)
7. [Boas Práticas](#boas-práticas)
8. [Troubleshooting](#troubleshooting)

---

## Conceitos Fundamentais

### O que é um "Prompt Architect"?

Diferente de geradores de prompt comuns, o PromptArchitect funciona como um **arquiteto de software sênior**:

- ❌ **NÃO faz**: Gerar prompt genérico e parar
- ✅ **FAZ**: Discovery → Documentação Completa → Versionamento → Validação

### Por que Discovery antes de Gerar?

**Problema**: "Crie um ERP" é ambíguo. ERP fiscal? Multi-empresa? Quais módulos?

**Solução**: O sistema faz perguntas de qualificação:
- Quais módulos? (Financeiro, Estoque, Fiscal...)
- Necessita NF-e/SPED?
- Multi-empresa ou single-tenant?
- Stack preferido?
- Integrações necessárias?

**Resultado**: Documentação precisa, não genérica.

### Segmentos de Negócio

O sistema reconhece automaticamente o segmento e adapta os entregáveis:

| Segmento | Palavras-chave Reconhecidas | Documentos Obrigatórios |
|----------|----------------------------|-------------------------|
| **ERP** | erp, nota fiscal, nfe, sped, fiscal, estoque | PRD, TRD, API Spec, Data Model, Security Doc, QA Plan, Runbook |
| **WhatsApp Bot** | whatsapp, chatbot, atendimento, bot, evolution api | PRD, TRD, MCP Manifest, System Prompt, QA Plan |
| **SaaS B2B** | saas, b2b, multi-tenant, assinatura, empresas | PRD, TRD, API Spec, Data Model, Design System, Security Doc |
| **IPTV** | iptv, streaming, vídeo, live, vod, cdn | PRD, TRD, API Spec, Data Model, Security Doc, Runbook |
| **EAD/LMS** | ead, lms, curso, educação, aluno, certificado | PRD, TRD, API Spec, Data Model, Design System |

---

## Fluxo Completo de Trabalho

### Fase 1: Discovery (Obrigatória)

**Objetivo**: Entender o projeto antes de gerar documentação.

**Como funciona**:
1. Você descreve sua ideia no chat
2. Sistema classifica o segmento automaticamente
3. Apresenta perguntas de qualificação
4. Você responde (ou aceita suposições padrão)
5. Sistema prepara contexto estruturado

**Exemplo de Input**:
```
Preciso de um sistema ERP para uma distribuidora de bebidas. 
Deve emitir notas fiscais, controlar estoque de 500 produtos, 
e integrar com o WhatsApp para pedidos.
```

**Output do Sistema**:
```markdown
# Discovery Estruturado

**Segmento Identificado:** ERP
**Confiança:** 95%
**Complexidade Estimada:** Complex
**Timeline Estimado:** 6-12 meses (MVP: 3-4 meses)

## Suposições Assumidas
- Segmento identificado: ERP
- Assumindo stack backend: Node.js (NestJS) ou Laravel (PHP)
- Assumindo banco de dados: PostgreSQL
- Compliance necessário: LGPD, NF-e/NFS-e, SPED, Certificado Digital A1/A3
- Riscos identificados: Complexidade fiscal BR (constantes mudanças na legislação)

## Perguntas de Qualificação

1. **Quais módulos o ERP deve ter?** (Obrigatório)
   Opções: Financeiro, Estoque, Compras, Vendas, Fiscal (NF-e/NFS-e), RH/Folha, CRM, BI/Relatórios
   _Contexto: Define o escopo e complexidade do sistema_

2. **Necessita conformidade fiscal brasileira (NF-e, SPED)?** (Obrigatório)
   Opções: Sim, completa / Sim, parcial / Não
   _Contexto: Impacta arquitetura e integrações com SEFAZ_

3. **Deve suportar múltiplas empresas/filiais?** (Obrigatório)
   Opções: Sim / Não
   _Contexto: Afeta modelo de dados e isolamento_

4. **Precisa integrar com sistemas legados?** (Opcional)
   _Contexto: Identifica necessidade de adaptadores/ETL_

## Documentos que serão Gerados
- [ ] PRD
- [ ] TRD
- [ ] API_SPEC
- [ ] DATA_MODEL
- [ ] SECURITY_DOC
- [ ] QA_PLAN
- [ ] RUNBOOK

## Próximos Passos:
1. Responda às perguntas acima
2. Revisarei as suposições e ajustarei se necessário
3. Gerarei o pacote completo de documentos
4. Você poderá revisar e solicitar ajustes antes da implementação
```

**Como Responder**:
```
1. Módulos: Financeiro, Estoque, Vendas, Fiscal (NF-e)
2. Sim, conformidade completa (NF-e + SPED)
3. Sim, suportar 3 filiais
4. Sim, integrar com ERP legado via API REST
```

---

### Fase 2: Geração de Documentos

**Objetivo**: Criar pacote completo de documentação baseado nas respostas do discovery.

**Como funciona**:
1. Sistema usa suas respostas como contexto
2. Gera documentos adaptados ao segmento
3. Cada documento vem versionado (v1.0.0)
4. Inclui casos de teste (para System Prompts)

**Documentos Gerados (exemplo ERP)**:

#### 1. PRD (Product Requirements Document)
```markdown
# Product Requirements Document (PRD)
**Projeto:** ERP Distribuidora Bebidas
**Segmento:** ERP
**Versão:** 1.0.0
**Data:** 2025-01-15

## 1. Visão Geral e Objetivos

### 1.1 Visão do Produto
Sistema ERP para gestão completa de distribuidora de bebidas com 500 produtos, 
3 filiais, conformidade fiscal BR (NF-e + SPED) e integração WhatsApp para pedidos.

### 1.2 Objetivos
- Reduzir tempo de emissão de NF-e de 15 min para 2 min (87% de redução)
- Eliminar erros fiscais (R$ 50k/ano em multas)
- Automatizar 80% dos pedidos via WhatsApp
- Visibilidade de estoque em tempo real entre filiais

### 1.3 Métricas de Sucesso
- NF-e emitidas < 2 min (P95)
- Zero falhas de integração SEFAZ
- 80% pedidos WhatsApp sem intervenção humana
- Acuracidade de estoque > 99%

## 2. Personas e Jobs-to-be-Done

### Persona 1: Faturista (Maria, 35 anos)
**Jobs-to-be-Done:**
- Emitir NF-e rapidamente sem erro
- Consultar histórico de notas
- Cancelar NF-e quando necessário

**Pain Points:**
- Sistema atual trava durante emissão
- Falta de validação prévia (nota rejeitada pela SEFAZ)
- Não sabe status da nota em tempo real

### Persona 2: Gerente Financeiro (João, 42 anos)
**Jobs-to-be-Done:**
- Gerar SPED (ECD, ECF, EFD-ICMS/IPI) mensalmente
- Controlar fluxo de caixa consolidado (3 filiais)
- Emitir relatórios contábeis

**Pain Points:**
- SPED gerado manualmente (4 dias de trabalho/mês)
- Falta de consolidação entre filiais
- Relatórios desatualizados (planilhas manuais)

...
```

#### 2. TRD (Technical Requirements Document)
```markdown
# Technical Requirements Document (TRD)
**Projeto:** ERP Distribuidora Bebidas
**Referência PRD:** PRD v1.0.0
**Versão:** 1.0.0

## 2. Stack Tecnológico

### 2.1 Frontend
- **Framework:** Next.js 15 (App Router)
- **State Management:** Zustand + TanStack Query
- **Styling:** Tailwind CSS v4
- **UI Library:** shadcn/ui + Radix
- **Build Tool:** Turbopack
- **Testing:** Vitest + Playwright

### 2.2 Backend
- **Runtime:** Node.js 22 LTS
- **Framework:** NestJS 10
- **Linguagem:** TypeScript
- **ORM:** Prisma 6
- **Testing:** Jest + Supertest

### 2.3 Banco de Dados
- **Primary:** PostgreSQL 16 (Supabase)
- **Cache:** Redis 7 (upstash)
- **Search:** MeiliSearch (produtos)

### 2.4 Infraestrutura
- **Hosting:** Vercel (frontend) + AWS ECS (backend)
- **CDN:** Cloudflare
- **CI/CD:** GitHub Actions
- **Monitoramento:** Sentry + DataDog

### 2.5 Integrações
- **SEFAZ:** API NF-e (via biblioteca brasil-api-nfe)
- **WhatsApp:** Evolution API (self-hosted VPS)
- **Pagamentos:** Pagar.me
- **ERP Legado:** REST API (autenticação OAuth2)

## 3. Modelo de Dados

### 3.1 Schema Principal (Prisma)
\`\`\`prisma
model Filial {
  id        String   @id @default(uuid())
  cnpj      String   @unique
  nome      String
  produtos  Produto[]
  @@index([cnpj])
}

model Produto {
  id          String   @id @default(uuid())
  sku         String   @unique
  nome        String
  preco       Decimal  @db.Decimal(10,2)
  estoque     Int
  ncm         String   // Nomenclatura Comum do Mercosul
  filialId    String
  filial      Filial   @relation(fields: [filialId], references: [id])
  @@index([sku])
  @@index([filialId])
}

model NotaFiscal {
  id          String   @id @default(uuid())
  numero      String
  serie       String
  chaveAcesso String   @unique // 44 dígitos da NF-e
  clienteId   String
  valor       Decimal  @db.Decimal(10,2)
  xml         String   @db.Text // XML completo da SEFAZ
  status      StatusNFe @default(PENDENTE)
  emitidaEm   DateTime @default(now())
  @@index([chaveAcesso])
  @@index([clienteId])
}

enum StatusNFe {
  PENDENTE
  AUTORIZADA
  CANCELADA
  DENEGADA
}
\`\`\`

...
```

#### 3. MCP Manifest (se aplicável)
Para o módulo WhatsApp do ERP:

```markdown
# MCP (Model Context Protocol) Manifest
**Projeto:** ERP Distribuidora Bebidas - Módulo WhatsApp
**Versão:** 1.0.0

## 2. Tools (Ferramentas Expostas)

### 2.1 Tool: \`create_order\`

**Descrição:** Cria pedido de venda a partir de mensagem WhatsApp

**Input Schema:** \`CreateOrderInput\`
\`\`\`json
{
  "type": "object",
  "properties": {
    "clienteId": { "type": "string", "format": "uuid" },
    "produtos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sku": { "type": "string" },
          "quantidade": { "type": "integer", "minimum": 1 }
        },
        "required": ["sku", "quantidade"]
      }
    },
    "observacao": { "type": "string" }
  },
  "required": ["clienteId", "produtos"]
}
\`\`\`

**Output Schema:** \`CreateOrderOutput\`
\`\`\`json
{
  "type": "object",
  "properties": {
    "orderId": { "type": "string", "format": "uuid" },
    "total": { "type": "number" },
    "status": { "type": "string", "enum": ["success", "error"] },
    "message": { "type": "string" }
  },
  "required": ["orderId", "status"]
}
\`\`\`

...

## 3. Agentes

### 3.1 Agent: \`atendimento_whatsapp\`

**System Prompt:**
\`\`\`
Você é um assistente de vendas da Distribuidora Bebidas XYZ.

**Identidade:**
- Nome: AssistenteBot
- Tom: Profissional, prestativo, rápido

**Capacidades:**
- Consultar produtos (tool: query_products)
- Criar pedidos (tool: create_order)
- Consultar status de pedidos (tool: get_order_status)

**Restrições:**
- NUNCA altere preços (use sempre os preços do sistema)
- NUNCA confirme pedidos > R$ 10.000 sem aprovação de gerente
- Se cliente pedir desconto, escale para vendedor humano

**Regras de Escalonamento:**
- Cliente menciona "gerente" ou "humano" → Escalar imediatamente
- Pedido > R$ 10.000 → Escalar para aprovação
- Fora do horário (22h-6h) → "Retornaremos às 8h"

**Formato de Resposta:**
- Mensagens curtas (máx 280 caracteres)
- Use emojis moderadamente (🛒 📦 ✅)
- Sempre confirme o pedido antes de finalizar
\`\`\`

**Casos de Teste:**

\`\`\`json
{
  "id": "test_create_order",
  "name": "Criar pedido válido",
  "type": "happy_path",
  "input": "Quero 10 caixas de Coca-Cola 2L",
  "expectedOutput": "✅ Pedido criado! 10 caixas de Coca-Cola 2L = R$ 320,00. Confirmar?",
  "status": "pending"
}
\`\`\`

...
```

---

### Fase 3: Revisão e Refinamento

**Objetivo**: Ajustar documentos conforme feedback.

**Como solicitar ajustes**:

❌ **Vago**:
```
Melhore o PRD
```

✅ **Específico**:
```
No PRD, seção 2.1 (Persona Faturista), adicione mais um pain point:
"Sistema não valida CFOP antes de enviar para SEFAZ, causando rejeição"

E na seção 3 (Requisitos Funcionais), adicione:
RF-007: Validação de CFOP
Descrição: Sistema deve validar CFOP conforme tabela atualizada da Receita Federal 
antes de permitir emissão de NF-e
Prioridade: Critical
```

---

### Fase 4: Validação e Aprovação

**Objetivo**: Garantir que documentos estão prontos para produção.

**Checklist Automático**:
- ✅ Status "approved" (revisor designado)
- ✅ Casos de teste executados (System Prompts)
- ✅ Edge cases cobertos
- ✅ Changelog com justificativa
- ✅ Dependências validadas
- ✅ Compatibilidade de modelo verificada

**Como executar validação**:
```typescript
import { orchestrate } from "@/lib/orchestrator/prompt-architect-orchestrator";

const result = await orchestrate({
  userInput: "...",
  projectName: "ERP Distribuidora",
  author: "João Silva",
  mode: "validate",
  discoveryAnswers: {
    artifacts: JSON.stringify(artifacts), // Artefatos gerados
  },
  targetModel: "gpt-4-turbo",
});

console.log(result.validationReport);
```

**Exemplo de Relatório**:
```json
{
  "productionReady": false,
  "blockers": [
    "System prompt 'atendimento_whatsapp' tem 2 casos de teste falhando: test_escalation, test_high_value_order"
  ],
  "warnings": [
    "PRD não tem aprovador designado (recomendado: Product Owner)",
    "TRD não especifica estratégia de backup (recomendado para ERP)"
  ],
  "testResults": {
    "total": 5,
    "passed": 3,
    "failed": 2,
    "pending": 0
  },
  "modelCompatibility": {
    "compatible": true,
    "issues": [],
    "recommendations": [
      "GPT-4 prefere XML-tagged instructions para parsing estruturado"
    ]
  }
}
```

**Resolvendo Bloqueadores**:
1. Corrija os testes falhando
2. Execute validação novamente
3. Quando `productionReady: true`, pode prosseguir

---

## Casos de Uso por Segmento

### Caso 1: ERP Fiscal Completo

**Input**:
```
Criar um ERP para indústria de móveis planejados. 
Deve controlar produção (MRP), estoque, vendas, 
emitir NF-e/NFS-e, integrar com loja virtual, 
e gerar SPED automático.
```

**Documentos Gerados**:
- PRD (20-30 páginas)
- TRD (25-40 páginas)
- API Spec (OpenAPI com 50+ endpoints)
- Data Model (Prisma schema com 30+ modelos)
- Security Doc (compliance LGPD + fiscal BR)
- QA Plan (100+ casos de teste)
- Runbook (procedures de deploy, backup, DR)

**Timeline**: 8-12 meses (MVP: 4 meses — módulos Vendas + Estoque + NF-e)

---

### Caso 2: Chatbot de WhatsApp para Agendamento

**Input**:
```
Chatbot de WhatsApp para clínica médica agendar consultas. 
Deve consultar agenda do médico, criar agendamento, 
enviar lembretes, e escalar para secretária se dúvida.
```

**Documentos Gerados**:
- PRD (8-12 páginas)
- TRD (10-15 páginas)
- MCP Manifest (tools: check_availability, create_appointment, send_reminder)
- System Prompt (agente "atendimento_clinica")
- QA Plan (20+ casos de teste: happy path, conflitos de horário, fora do horário)

**Timeline**: 1-2 meses (MVP: 3 semanas)

---

### Caso 3: SaaS B2B Multi-Tenant

**Input**:
```
SaaS de gestão de projetos para agências de marketing. 
Multi-tenant (1 banco por cliente), planos (Free, Pro, Enterprise), 
integrações (Slack, Trello, Google Drive), e billing automático (Stripe).
```

**Documentos Gerados**:
- PRD (15-20 páginas)
- TRD (20-30 páginas)
- API Spec (REST + webhooks)
- Data Model (Prisma com RLS — Row Level Security)
- Design System (paleta, tipografia, componentes)
- Security Doc (multi-tenancy, OAuth, RBAC)

**Timeline**: 5-7 meses (MVP: 3 meses — projeto, kanban, time)

---

## Boas Práticas

### 1. Sempre Faça Discovery Completo

❌ **Errado**:
```
Crie um ERP
```

✅ **Certo**:
```
Crie um ERP para distribuidora de alimentos com:
- 5 filiais
- 2000 produtos
- NF-e + SPED obrigatórios
- Integração com e-commerce (WooCommerce)
- Pedidos via WhatsApp
- Stack preferido: Node.js + PostgreSQL
```

### 2. Responda Todas as Perguntas Obrigatórias

Perguntas marcadas como **(Obrigatório)** no discovery **devem** ser respondidas. Se não souber, o sistema assume padrões razoáveis, mas podem não ser ideais.

### 3. Revise Suposições Assumidas

O sistema declara explicitamente todas as suposições. Exemplo:
> "Assumindo stack backend: Node.js (NestJS)"

Se sua preferência é diferente (ex: Laravel PHP), corrija antes de prosseguir.

### 4. Adicione Casos de Teste Específicos

Os casos de teste padrão são genéricos. Adicione casos específicos do seu domínio:

**Exemplo (ERP Fiscal)**:
```json
{
  "id": "test_nfe_rejection",
  "name": "NF-e rejeitada pela SEFAZ (CFOP inválido)",
  "type": "error_handling",
  "input": "Emitir NF-e com CFOP 9999 (inválido)",
  "expectedOutput": "❌ Erro: CFOP 9999 não existe. Consulte tabela atualizada da Receita Federal.",
  "status": "pending"
}
```

### 5. Versione Incrementalmente

Não tente fazer tudo na v1.0.0. Use versionamento semântico:

- **v1.0.0 (MVP)**: Apenas features core
- **v1.1.0**: Adiciona feature não-crítica (ex: relatórios)
- **v1.2.0**: Outra feature incremental
- **v2.0.0**: Breaking change (ex: migração de banco)

### 6. Valide Antes de Implementar

Execute validação **antes** de começar a implementar:
```
mode: "validate"
```

Se houver bloqueadores, resolva **antes** de escrever código.

---

## Troubleshooting

### Problema: "Segmento não reconhecido"

**Causa**: Input muito vago ou fora dos segmentos pré-definidos.

**Solução**: Use palavras-chave reconhecidas:
```
❌ "Sistema de gestão"
✅ "Sistema de gestão (ERP)"
```

Ou aceite segmento "Custom" e forneça detalhes no discovery.

---

### Problema: "Casos de teste falhando"

**Causa**: System prompt não cobre edge case testado.

**Solução**:
1. Leia o caso de teste falhando
2. Ajuste o system prompt para cobrir esse caso
3. Execute validação novamente

**Exemplo**:
```
Teste falhando: "Cliente pede desconto > 10%"
Esperado: "Escalar para gerente"
Atual: "Aplico 5% de desconto automaticamente" (ERRADO)

Correção no System Prompt:
"Se cliente pedir desconto > 5%, escale para gerente comercial"
```

---

### Problema: "Documentos muito genéricos"

**Causa**: Discovery incompleto.

**Solução**: Forneça mais contexto nas respostas do discovery. Quanto mais específico, melhor a documentação.

❌ **Genérico**:
```
1. Módulos: Todos
2. Compliance: Sim
```

✅ **Específico**:
```
1. Módulos: Financeiro (contas a pagar/receber, fluxo de caixa, conciliação bancária), 
   Estoque (entrada, saída, transferência entre filiais, inventário), 
   Fiscal (NF-e, NFS-e, SPED ECD/ECF/EFD-ICMS/IPI)

2. Compliance: Sim, NF-e obrigatória (emissão média: 500 notas/mês), 
   SPED ECD/ECF (fechamento mensal), certificado digital A1 (renovação anual)
```

---

### Problema: "Validação bloqueada por dependências"

**Causa**: Artefato depende de outro que não existe ou está desatualizado.

**Solução**: Gere os artefatos dependentes primeiro. Exemplo:
```
TRD v1.0.0 depende de PRD v1.0.0
Se PRD está em v0.9.0 (draft), finalize PRD primeiro.
```

---

## Suporte

Dúvidas ou problemas? Abra uma issue no GitHub:
[https://github.com/seu-usuario/PromptArchitect/issues](https://github.com/seu-usuario/PromptArchitect/issues)

---

**Autor:** [Seu Nome]
**Última Atualização:** 2025-01-15
**Versão do Guia:** 2.0.0
