# Changelog - PromptArchitect

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [2.0.0] - 2025-01-15

### ⚠️ BREAKING CHANGES

- **Removido completamente o módulo ImageForge (criação de imagens)**
  - Removidos: `src/lib/imageforge/`, `src/components/ImageForgePanel.tsx`, `src/services/imageService.ts`
  - Removida rota `/api/imageforge`
  - Removidos todos os tipos relacionados em `src/types/index.ts`
  - Motivação: Foco exclusivo em engenharia de prompts e arquitetura de sistemas

### 🆕 Adicionado

#### Sistema de Discovery Estruturado
- **`src/lib/discovery/segment-classifier.ts`**: Classifica automaticamente projetos por segmento de negócio
  - 13 segmentos suportados: ERP, SaaS B2B, WhatsApp Automation, IPTV/Streaming, EAD/LMS, etc.
  - Perguntas de qualificação obrigatórias por segmento
  - Suposições razoáveis declaradas explicitamente
  - Estimativa de complexidade e timeline automática

#### Templates de Documentação Completos
- **`src/lib/docs/templates/prd-template.ts`**: Product Requirements Document
  - Estrutura completa: Visão, Personas, Requisitos Funcionais/Não-Funcionais, Modelo de Dados
  - Adaptação automática por segmento (ERP tem compliance fiscal, WhatsApp tem regras de escalonamento, etc.)
  - Suporte a LGPD, conformidade fiscal BR (NF-e, SPED), segurança
  - Roadmap faseado (MVP → V1 → V2)
  
- **`src/lib/docs/templates/trd-template.ts`**: Technical Requirements Document
  - Stack tecnológico completo (frontend, backend, database, infrastructure)
  - Especificação de API (REST/GraphQL/tRPC)
  - Modelo de dados (ORM, migrations, indexes, constraints)
  - Infraestrutura (ambientes, scaling, backup, DR)
  - Segurança (autenticação, autorização, criptografia, compliance)
  - Performance targets (Web Vitals, caching, otimizações)
  - Deployment (estratégia, pipeline, rollback, variáveis de ambiente)
  - Monitoramento (APM, logs, métricas, alertas)
  - Trade-offs técnicos documentados
  - Runbook de infraestrutura

- **`src/lib/docs/templates/mcp-manifest-template.ts`**: MCP (Model Context Protocol) Manifest
  - Especificação de tools/agentes expostos pelo sistema
  - Schemas JSON de entrada/saída para cada tool
  - System prompts de agentes (customer_support, sales_assistant, etc.)
  - Regras de escalonamento (quando transferir para humano)
  - Autenticação (JWT, OAuth2, API Key)
  - Rate limiting por tool
  - Casos de teste obrigatórios (happy path, edge cases, error handling)
  - Versionamento de API
  - Tratamento de erros padronizado
  - Ambiente de sandbox para testes

#### Sistema de Governança e Versionamento
- **`src/lib/governance/version-control.ts`**: Versionamento semântico completo
  - `VersionedArtifact`: Estrutura para qualquer artefato (prompt, PRD, TRD, etc.)
  - Versionamento SemVer automático (major.minor.patch)
  - Changelog estruturado com justificativa de mudanças
  - Casos de teste anexados ao artefato
  - Validação de prontidão para produção:
    - Status "approved" obrigatório
    - Testes executados e passando
    - Edge cases e error handling cobertos
    - Dependências compatíveis
  - Compatibilidade de modelo (GPT-4, Claude, Gemini, DeepSeek)
  - Rastreabilidade completa (autor, datas, aprovações)
  - Export/Import em JSON estruturado

#### Orquestrador Principal
- **`src/lib/orchestrator/prompt-architect-orchestrator.ts`**: Fluxo end-to-end
  - **Fase 1 - Discovery**: Classifica segmento, faz perguntas, assume padrões
  - **Fase 2 - Geração**: Gera pacote completo de documentos (PRD, TRD, MCP Manifest, System Prompt)
  - **Fase 3 - Refinamento**: Iteração e ajustes (em desenvolvimento)
  - **Fase 4 - Validação**: Checklist de produção, relatório de compatibilidade
  - Estimativa de progresso (0-100%)
  - Next steps claros em cada fase

#### Documentação
- **`README.md`**: Documentação completa do projeto
  - Visão geral e diferenciais
  - Tabela de segmentos com documentos obrigatórios e timelines
  - Arquitetura do sistema
  - Guia de instalação e uso
  - Fluxo típico de trabalho
  - Slash commands disponíveis
  - Design system e regras
  - Segurança e compliance (LGPD, OWASP, fiscal BR)
  - Governança de artefatos
  - Testes e contribuição

### 🔄 Modificado

- **`src/routes/index.tsx`**: Interface principal
  - Removida alternância entre chat e imageforge
  - Mantido apenas modo chat para foco em prompts/arquitetura
  - Removidos imports não utilizados

- **`src/types/index.ts`**: Tipos centrais
  - Removidos todos os tipos de geração de imagens
  - Arquivo limpo para receber tipos de documentação futuramente

### 🗑️ Removido

- **Módulo completo de geração de imagens (ImageForge)**
  - `src/lib/imageforge/` (pasta inteira)
  - `src/components/ImageForgePanel.tsx`
  - `src/services/imageService.ts`
  - `src/routes/api/imageforge.ts`
  - Tipos relacionados em `src/types/index.ts`
  - Imports e referências em `src/routes/index.tsx`
  - Arquivo de patch `imageforge_ui.patch`

---

## Motivação das Mudanças

### Por que remover o ImageForge?

A remoção do módulo de geração de imagens foi estratégica para:

1. **Foco e Especialização**: PromptArchitect deve ser referência em engenharia de prompts e arquitetura de sistemas, não geração de imagens.

2. **Complexidade Reduzida**: Módulo de imagens requeria manutenção de múltiplos provedores (OpenAI DALL-E, Gemini Image, etc.), aumentando a superfície de falhas.

3. **Valor Diferenciado**: O verdadeiro valor está no discovery estruturado, documentação completa e governança — não em gerar imagens.

### Por que adicionar Discovery + Governança?

**Problema Identificado**: Geradores de prompt tradicionais falham porque:
- Não fazem discovery (partem direto para o prompt final)
- Entregam só texto, sem documentação de apoio
- Não têm versionamento (impossível rastrear mudanças)
- Não validam prontidão para produção
- Não consideram segmento de negócio (ERP tem necessidades diferentes de um chatbot)

**Solução Implementada**: PromptArchitect agora funciona como um **arquiteto de software sênior**:
1. Faz perguntas inteligentes antes de começar
2. Adapta entregáveis ao segmento (ERP ≠ WhatsApp Bot)
3. Gera pacote completo (PRD + TRD + MCP Manifest + System Prompt + Test Cases)
4. Versionamento semântico automático com changelog
5. Validação de prontidão para produção (checklist obrigatório)
6. Compatibilidade multi-modelo (GPT-4, Claude, Gemini, DeepSeek)

### Impacto no RS Business OS

Para o **RS Business OS**, o sistema agora oferece:

- **Discovery por Módulo**: Cada módulo vertical (IPTV, EAD/Unicorp, Fiscal BR) pode ter seu próprio PRD dentro do PRD guarda-chuva do ERP
- **Padrões Reusáveis**: Templates de documentação podem herdar configurações do ecossistema RS Consultoria (Supabase, Hono, N8N, Evolution API)
- **Conformidade Automática**: Templates já incluem compliance fiscal BR (NF-e, SPED) e LGPD por padrão
- **Rastreabilidade**: Todo prompt/documento versionado, auditável, com changelog
- **Qualidade**: System prompts não vão para produção sem casos de teste validados

---

## Próximos Passos (Roadmap)

### v2.1.0 (Curto Prazo)
- [ ] Implementar fase de refinamento no orquestrador
- [ ] Interface visual para GovernanceDashboard
- [ ] Executar casos de teste automaticamente
- [ ] Integração com GitHub para export de documentos

### v2.2.0 (Médio Prazo)
- [ ] Template de API Spec (OpenAPI/Swagger)
- [ ] Template de Design System
- [ ] Template de Security Doc detalhado
- [ ] Suporte a mais segmentos (PropTech, LegalTech, EdTech)

### v3.0.0 (Longo Prazo)
- [ ] Multi-workspace (gerenciar múltiplos projetos)
- [ ] Colaboração em tempo real
- [ ] Aprovações de documentos via workflow
- [ ] Integração com ferramentas de gestão (Jira, Linear, Notion)
- [ ] Export para Confluence, Google Docs, Markdown

---

## Agradecimentos

Agradecimentos especiais a todos que contribuíram com feedback para esta refatoração major.

---

**Autor:** [Seu Nome]
**Data:** 2025-01-15
**Versão:** 2.0.0
