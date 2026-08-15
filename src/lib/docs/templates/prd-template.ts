/**
 * Template para Product Requirements Document (PRD)
 * Estrutura obrigatória para todos os sistemas/ERP/SaaS
 */

export interface PRDTemplate {
  version: string;
  projectName: string;
  segment: BusinessSegment;
  overview: {
    vision: string;
    objectives: string[];
    successMetrics: string[];
  };
  personas: Persona[];
  functionalRequirements: Requirement[];
  nonFunctionalRequirements: Requirement[];
  acceptanceCriteria: AcceptanceCriteria[];
  dataMapping: DataMapping;
  architecture: ArchitectureOverview;
  roadmap: RoadmapPhase[];
  compliance: ComplianceRequirements;
}

export type BusinessSegment =
  | "ERP"
  | "SaaS B2B"
  | "SaaS B2C"
  | "Marketplace"
  | "Mobile App"
  | "WhatsApp Automation"
  | "IPTV/Streaming"
  | "EAD/LMS"
  | "E-commerce"
  | "Fintech"
  | "HealthTech"
  | "AgriTech"
  | "Custom";

export interface Persona {
  id: string;
  name: string;
  role: string;
  jobsToBeDone: string[];
  painPoints: string[];
  goals: string[];
}

export interface Requirement {
  id: string; // RF-001, RNF-001
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  dependencies: string[]; // IDs de outros requisitos
  estimatedEffort: string; // S, M, L, XL
}

export interface AcceptanceCriteria {
  requirementId: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

export interface DataMapping {
  entities: Entity[];
  lgpdCompliance: {
    personalDataFields: string[];
    legalBasis: string;
    retentionPolicy: string;
    dataMinimization: boolean;
  };
}

export interface Entity {
  name: string;
  fields: Field[];
  relationships: Relationship[];
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
  isPII: boolean; // Personal Identifiable Information
  validation?: string;
}

export interface Relationship {
  type: "one-to-one" | "one-to-many" | "many-to-many";
  target: string;
  foreignKey?: string;
}

export interface ArchitectureOverview {
  stack: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
    integrations: string[];
  };
  layers: {
    presentation: string;
    business: string;
    data: string;
    integration: string;
  };
  tradeoffs: Tradeoff[];
}

export interface Tradeoff {
  decision: string;
  rationale: string;
  alternatives: string[];
  risks: string[];
}

export interface RoadmapPhase {
  phase: "MVP" | "V1" | "V2" | "V3";
  duration: string;
  deliverables: string[];
  dependencies: string[];
  risks: string[];
}

export interface ComplianceRequirements {
  lgpd: boolean;
  fiscalBR?: {
    nfe: boolean; // Nota Fiscal Eletrônica
    nfse: boolean; // Nota Fiscal de Serviço
    sped: boolean; // Sistema Público de Escrituração Digital
  };
  pciDss?: boolean; // Payment Card Industry Data Security Standard
  hipaa?: boolean; // Health Insurance Portability and Accountability Act
  sox?: boolean; // Sarbanes-Oxley Act
  custom: string[];
}

/**
 * Função para gerar PRD estruturado baseado no segmento
 */
export function generatePRDTemplate(
  projectName: string,
  segment: BusinessSegment,
  userInput: string
): string {
  const template = `# Product Requirements Document (PRD)
**Projeto:** ${projectName}
**Segmento:** ${segment}
**Versão:** 1.0.0
**Data:** ${new Date().toISOString().split("T")[0]}

---

## 1. Visão Geral e Objetivos

### 1.1 Visão do Produto
[PREENCHER: Qual problema este produto resolve? Para quem?]

### 1.2 Objetivos
- [PREENCHER: Objetivo 1]
- [PREENCHER: Objetivo 2]
- [PREENCHER: Objetivo 3]

### 1.3 Métricas de Sucesso
- [PREENCHER: KPI 1 - ex: Reduzir tempo de X em Y%]
- [PREENCHER: KPI 2 - ex: Aumentar conversão em Z%]
- [PREENCHER: KPI 3]

---

## 2. Personas e Jobs-to-be-Done

### Persona 1: [PREENCHER: Nome/Papel]
**Jobs-to-be-Done:**
- [PREENCHER: Tarefa principal que precisa realizar]
- [PREENCHER: Resultado desejado]

**Pain Points:**
- [PREENCHER: Dor 1]
- [PREENCHER: Dor 2]

${getSegmentSpecificPersonas(segment)}

---

## 3. Requisitos Funcionais

### RF-001: [PREENCHER: Título do Requisito]
**Descrição:** [PREENCHER]
**Prioridade:** Critical | High | Medium | Low
**Dependências:** []
**Estimativa:** S | M | L | XL

${getSegmentSpecificRequirements(segment)}

---

## 4. Requisitos Não-Funcionais

### RNF-001: Performance
**Descrição:** Tempo de resposta < 200ms para 95% das requisições
**Prioridade:** High

### RNF-002: Segurança
**Descrição:** Conformidade com OWASP Top 10, autenticação JWT, criptografia em trânsito e em repouso
**Prioridade:** Critical

### RNF-003: Escalabilidade
**Descrição:** Suportar até [PREENCHER: X usuários/requisições] simultâneos
**Prioridade:** High

${getSegmentSpecificNFR(segment)}

---

## 5. Critérios de Aceitação (Given-When-Then)

### AC-RF-001
**Cenário:** [PREENCHER]
**Given:** [PREENCHER: contexto inicial]
**When:** [PREENCHER: ação do usuário]
**Then:** [PREENCHER: resultado esperado]

---

## 6. Modelo de Dados e Compliance

### 6.1 Entidades Principais
${getSegmentSpecificEntities(segment)}

### 6.2 LGPD/GDPR
**Dados Pessoais Coletados:** [PREENCHER]
**Base Legal:** Consentimento | Contrato | Interesse Legítimo | [PREENCHER]
**Política de Retenção:** [PREENCHER: tempo de armazenamento]
**Minimização de Dados:** Sim | Não
**Direitos do Titular Implementados:** Acesso, Correção, Exclusão, Portabilidade

${getSegmentSpecificCompliance(segment)}

---

## 7. Arquitetura Proposta

### 7.1 Stack Tecnológico
**Frontend:** [PREENCHER: React, Next.js, Vue, etc.]
**Backend:** [PREENCHER: Node.js, Python, Go, etc.]
**Banco de Dados:** [PREENCHER: PostgreSQL, MongoDB, etc.]
**Infraestrutura:** [PREENCHER: Vercel, AWS, Supabase, etc.]
**Integrações:** [PREENCHER: APIs, N8N, Evolution API, etc.]

### 7.2 Camadas
- **Apresentação:** [PREENCHER]
- **Negócio:** [PREENCHER]
- **Dados:** [PREENCHER]
- **Integração:** [PREENCHER]

### 7.3 Trade-offs e Decisões Técnicas
**Decisão 1:** [PREENCHER]
- **Justificativa:** [PREENCHER]
- **Alternativas Consideradas:** [PREENCHER]
- **Riscos:** [PREENCHER]

---

## 8. Roadmap Faseado

### Fase MVP (M1) - [PREENCHER: prazo]
**Entregáveis:**
- [PREENCHER: Feature core 1]
- [PREENCHER: Feature core 2]

**Dependências:** []
**Riscos:** [PREENCHER]

### Fase V1 (M2) - [PREENCHER: prazo]
**Entregáveis:**
- [PREENCHER]

### Fase V2 (M3) - [PREENCHER: prazo]
**Entregáveis:**
- [PREENCHER]

---

## 9. Casos de Teste

### Cenário Feliz 1
**Entrada:** [PREENCHER]
**Saída Esperada:** [PREENCHER]

### Edge Case 1
**Entrada:** [PREENCHER: caso extremo]
**Saída Esperada:** [PREENCHER: comportamento esperado]

---

## 10. Segurança e Compliance

${getSegmentSpecificSecurity(segment)}

---

## Anexos

- Link para TRD (Technical Requirements Document)
- Link para especificação de API (OpenAPI)
- Link para Design System
- Link para MCP Manifest (se aplicável)

---

**Changelog:**
- v1.0.0 (${new Date().toISOString().split("T")[0]}) - Versão inicial

`;

  return template;
}

// Funções auxiliares por segmento

function getSegmentSpecificPersonas(segment: BusinessSegment): string {
  const personas: Record<BusinessSegment, string> = {
    ERP: `
### Persona 2: Gerente Financeiro
**Jobs-to-be-Done:**
- Emitir notas fiscais com conformidade fiscal BR
- Gerar relatórios contábeis e SPED
- Controlar fluxo de caixa

**Pain Points:**
- Processos manuais propensos a erro
- Falta de integração com sistemas legados
`,
    "SaaS B2B": `
### Persona 2: Administrador da Empresa Cliente
**Jobs-to-be-Done:**
- Gerenciar usuários e permissões
- Configurar integrações
- Acessar dashboards e relatórios

**Pain Points:**
- Onboarding complexo
- Falta de controle granular de acesso
`,
    "WhatsApp Automation": `
### Persona 2: Atendente de Suporte
**Jobs-to-be-Done:**
- Responder dúvidas frequentes automaticamente
- Escalar casos complexos para humano
- Rastrear histórico de conversas

**Pain Points:**
- Volume alto de mensagens repetitivas
- Falta de contexto em conversas
`,
    "IPTV/Streaming": `
### Persona 2: Assinante
**Jobs-to-be-Done:**
- Assistir conteúdo em múltiplos dispositivos
- Buscar e descobrir novo conteúdo
- Gerenciar perfis familiares

**Pain Points:**
- Buffering e qualidade instável
- Interface confusa
`,
    "EAD/LMS": `
### Persona 2: Instrutor
**Jobs-to-be-Done:**
- Criar e publicar cursos
- Acompanhar progresso dos alunos
- Gerar certificados

**Pain Points:**
- Ferramentas de autoria complexas
- Falta de analytics pedagógicos
`,
    // Defaults para outros segmentos
    "SaaS B2C": "",
    Marketplace: "",
    "Mobile App": "",
    "E-commerce": "",
    Fintech: "",
    HealthTech: "",
    AgriTech: "",
    Custom: "",
  };

  return personas[segment] || "";
}

function getSegmentSpecificRequirements(segment: BusinessSegment): string {
  const requirements: Record<BusinessSegment, string> = {
    ERP: `
### RF-002: Emissão de Nota Fiscal Eletrônica (NF-e)
**Descrição:** Integração com SEFAZ para emitir, consultar e cancelar NF-e
**Prioridade:** Critical
**Dependências:** [RF-003: Cadastro de produtos]
**Estimativa:** L

### RF-003: Controle de Estoque
**Descrição:** Entrada, saída, transferência e inventário de produtos
**Prioridade:** High
**Dependências:** []
**Estimativa:** M
`,
    "WhatsApp Automation": `
### RF-002: Integração com Evolution API
**Descrição:** Conectar instância do WhatsApp via Evolution API para envio/recebimento
**Prioridade:** Critical
**Dependências:** []
**Estimativa:** M

### RF-003: Fluxo de Atendimento Inteligente
**Descrição:** LLM identifica intenção e roteia para humano quando necessário
**Prioridade:** High
**Dependências:** [RF-002]
**Estimativa:** L
`,
    // Defaults
    "SaaS B2B": "",
    "SaaS B2C": "",
    Marketplace: "",
    "Mobile App": "",
    "IPTV/Streaming": "",
    "EAD/LMS": "",
    "E-commerce": "",
    Fintech: "",
    HealthTech: "",
    AgriTech: "",
    Custom: "",
  };

  return requirements[segment] || "";
}

function getSegmentSpecificNFR(segment: BusinessSegment): string {
  if (segment === "ERP" || segment === "Fintech") {
    return `
### RNF-004: Conformidade Fiscal BR
**Descrição:** Aderência a NF-e, NFS-e, SPED, SAT-CF-e
**Prioridade:** Critical
`;
  }
  if (segment === "HealthTech") {
    return `
### RNF-004: Conformidade HIPAA
**Descrição:** Criptografia de dados de saúde, audit logs, controle de acesso
**Prioridade:** Critical
`;
  }
  if (segment === "PropTech") {
    return `
### RNF-004: Conformidade Imobiliária
**Descrição:** Integração com CRECI, contratos digitais, garantias
**Prioridade:** High
`;
  }
  if (segment === "LegalTech") {
    return `
### RNF-004: Conformidade Jurídica
**Descrição:** Sigilo profissional (OAB), cálculo de prazos processuais
**Prioridade:** Critical
`;
  }
  return "";
}

function getSegmentSpecificEntities(segment: BusinessSegment): string {
  const entities: Record<BusinessSegment, string> = {
    ERP: `
**Produto**
- id: UUID (PK)
- nome: string
- sku: string
- preco: decimal
- estoque: integer
- ncm: string (PII: false)

**NotaFiscal**
- id: UUID (PK)
- numero: string
- serie: string
- clienteId: UUID (FK)
- valor: decimal
- xml: text
- status: enum (pendente, autorizada, cancelada)
`,
    "WhatsApp Automation": `
**Conversa**
- id: UUID (PK)
- telefone: string (PII: true)
- instanciaId: UUID (FK)
- status: enum (aberta, fechada, escalada)
- criadoEm: timestamp

**Mensagem**
- id: UUID (PK)
- conversaId: UUID (FK)
- tipo: enum (texto, imagem, audio)
- conteudo: text
- remetente: enum (usuario, bot, atendente)
`,
    "SaaS B2B": "",
    "SaaS B2C": "",
    Marketplace: "",
    "Mobile App": "",
    "IPTV/Streaming": "",
    "EAD/LMS": "",
    "E-commerce": "",
    Fintech: "",
    HealthTech: "",
    AgriTech: "",
    Custom: "",
  };

  return entities[segment] || "[PREENCHER: Entidades principais do domínio]";
}

function getSegmentSpecificCompliance(segment: BusinessSegment): string {
  if (segment === "ERP" || segment === "Fintech") {
    return `
### 6.3 Compliance Fiscal BR
**NF-e:** Sim - Integração com SEFAZ
**NFS-e:** [PREENCHER: necessário?]
**SPED:** Sim - Geração de arquivos ECD, ECF, EFD-ICMS/IPI
**Certificado Digital A1/A3:** Obrigatório para assinatura digital
`;
  }
  if (segment === "PropTech") {
    return `
### 6.3 Compliance Imobiliário
**CRECI:** Integração com sistema de corretores
**Contratos:** Assinatura digital de contratos de locação/venda
**Garantias:** Gestão de fianças, seguros, caução
`;
  }
  if (segment === "LegalTech") {
    return `
### 6.3 Compliance Jurídico
**OAB:** Validação de número de inscrição de advogados
**Prazos Processuais:** Cálculo automático de prazos
**Petições:** Geração e protocolo eletrônico
**LGPD:** Sigilo profissional reforçado
`;
  }
  return "";
}

function getSegmentSpecificSecurity(segment: BusinessSegment): string {
  let base = `
### Autenticação
- JWT com refresh tokens
- Autenticação multi-fator (MFA) para ações críticas

### Autorização
- RBAC (Role-Based Access Control)
- Princípio do menor privilégio

### Dados Sensíveis
- Criptografia AES-256 em repouso
- TLS 1.3 em trânsito
- PII nunca em logs

### Rate Limiting
- 100 req/min por IP
- 1000 req/min por usuário autenticado

### Monitoramento
- Audit logs de todas as operações
- Alertas de tentativas de acesso suspeitas
`;

  if (segment === "ERP" || segment === "Fintech") {
    base += `
### Compliance Adicional
- Certificado Digital A1/A3 para assinatura de documentos fiscais
- Backup diário com retenção de 7 anos (exigência fiscal)
- Logs imutáveis de transações financeiras
`;
  }

  return base;
}
