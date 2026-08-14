/**
 * =============================================================================
 * DOCUMENTATION ENGINE v5.0 — PromptArchitect
 * Núcleo de geração e exportação de documentação corporativa.
 * =============================================================================
 */

import { safeUUID } from "@/lib/utils";

// ─── Tipos Fundamentais ────────────────────────────────────────────────────

export type DocCategory = "prd" | "adr" | "api" | "architecture" | "changelog";
export type DocFormat = "md" | "json" | "html" | "pdf";
export type DocStatus = "draft" | "review" | "approved" | "published" | "deprecated";
export type RoadmapPhase = "M1" | "M2" | "M3" | "M4" | "M5";

// ─── Interfaces de Template ────────────────────────────────────────────────

export interface DocumentSubsection {
  id: string;
  title: string;
  content: string;
  order: number;
  subsections?: DocumentSubsection[];
}

export interface DocumentSection {
  id: string;
  title: string;
  slug: string;
  content: string;
  required: boolean;
  order: number;
  subsections: DocumentSubsection[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocCategory;
  sections: DocumentSection[];
  format: DocFormat;
  version: string;
  lastUpdated: string;
}

// ─── Interfaces de Documento Gerado ────────────────────────────────────────

export interface DocMetadata {
  projectName: string;
  author: string;
  department: string;
  version: string;
  status: DocStatus;
  tags: string[];
  stakeholders: string[];
  repository?: string;
  jiraEpic?: string;
  confluencePage?: string;
}

export interface GeneratedDoc {
  id: string;
  template: DocumentTemplate;
  title: string;
  sections: DocumentSection[];
  metadata: DocMetadata;
  createdAt: string;
  updatedAt: string;
  version: number;
  history: DocHistoryEntry[];
}

export interface DocHistoryEntry {
  version: number;
  date: string;
  author: string;
  changes: string[];
  sectionsSnapshot: DocumentSection[];
}

// ─── Interfaces de Dados de Entrada ────────────────────────────────────────

export interface PRDInput {
  projectName: string;
  description: string;
  objectives: string[];
  personas: Persona[];
  userJourneys: UserJourney[];
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: NonFunctionalRequirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  dataMapping: DataMappingItem[];
  architectureNotes: string;
  roadmap: RoadmapItem[];
  risks: RiskItem[];
  successMetrics: MetricItem[];
  glossary: GlossaryItem[];
  context: string;
}

export interface Persona {
  name: string;
  role: string;
  description: string;
  goals: string[];
  frustrations: string[];
  scenarios: string[];
}

export interface UserJourney {
  name: string;
  persona: string;
  currentState: string;
  desiredState: string;
  steps: JourneyStep[];
  touchpoints: string[];
}

export interface JourneyStep {
  step: number;
  action: string;
  emotion: "😀" | "😐" | "😟" | "😤";
  painPoint: string;
  opportunity: string;
}

export interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: "must" | "should" | "could" | "won't";
  dependencies: string[];
  owner: string;
}

export interface NonFunctionalRequirement {
  id: string;
  category: "performance" | "security" | "scalability" | "availability" | "usability" | "compliance" | "maintainability" | "observability";
  title: string;
  description: string;
  target: string;
  measurement: string;
}

export interface AcceptanceCriterion {
  id: string;
  featureRef: string;
  given: string;
  when: string;
  then: string;
}

export interface DataMappingItem {
  entity: string;
  fields: DataFieldItem[];
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  lgpdRelevance: boolean;
  retentionPeriod: string;
  basis: string;
}

export interface DataFieldItem {
  name: string;
  type: string;
  pii: boolean;
  encrypted: boolean;
  description: string;
}

export interface RoadmapItem {
  phase: RoadmapPhase;
  title: string;
  description: string;
  deliverables: string[];
  startDate: string;
  endDate: string;
  dependencies: string[];
}

export interface RiskItem {
  id: string;
  description: string;
  probability: "low" | "medium" | "high" | "critical";
  impact: "low" | "medium" | "high" | "critical";
  mitigation: string;
  contingency: string;
  owner: string;
}

export interface MetricItem {
  id: string;
  name: string;
  description: string;
  target: string;
  measurementMethod: string;
  frequency: string;
  category: "acquisition" | "activation" | "retention" | "revenue" | "referral" | "technical";
}

export interface GlossaryItem {
  term: string;
  definition: string;
  context: string;
  abbreviation?: string;
}

export interface ADRInput {
  title: string;
  status: DocStatus;
  context: string;
  decision: string;
  alternatives: AlternativeOption[];
  consequences: string;
  references: string[];
  stakeholders: string[];
}

export interface AlternativeOption {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  rationale: string;
}

export interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  path: string;
  summary: string;
  description: string;
  requestBody?: APISchema;
  responseBody: APISchema;
  errors: APIErrorCode[];
  authRequired: boolean;
  rateLimit?: string;
  tags: string[];
  examples: APIExample[];
}

export interface APISchema {
  contentType: string;
  schema: Record<string, unknown>;
  description?: string;
}

export interface APIErrorCode {
  code: number;
  message: string;
  description: string;
  resolution: string;
}

export interface APIExample {
  name: string;
  description: string;
  request?: string;
  response: string;
}

export interface ArchitectureInput {
  systemName: string;
  description: string;
  systemContext: SystemContextItem[];
  containers: ContainerItem[];
  components: ComponentItem[];
  stack: TechStackItem[];
  architecturalPatterns: ArchitecturePattern[];
  designDecisions: DesignDecision[];
  tradeoffs: TradeoffItem[];
  infrastructureRequirements: InfraRequirement[];
  observability: ObservabilityConfig;
  security: SecurityArchConfig;
}

export interface SystemContextItem {
  name: string;
  type: "person" | "external_system" | "database" | "queue" | "cache";
  description: string;
  relationship: string;
}

export interface ContainerItem {
  name: string;
  technology: string;
  description: string;
  type: "web_app" | "api" | "worker" | "database" | "cache" | "queue" | "gateway" | "mobile" | "desktop";
  dependsOn: string[];
  exposes: string[];
}

export interface ComponentItem {
  name: string;
  container: string;
  technology: string;
  description: string;
  responsibility: string;
  dependsOn: string[];
  stereotype?: "controller" | "service" | "repository" | "adapter" | "model" | "config" | "handler" | "middleware";
}

export interface TechStackItem {
  category: "language" | "framework" | "database" | "cache" | "queue" | "infra" | "observability" | "ci_cd" | "security" | "other";
  name: string;
  version: string;
  purpose: string;
}

export interface ArchitecturePattern {
  name: string;
  description: string;
  appliedWhere: string;
  rationale: string;
}

export interface DesignDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  consequences: string[];
  adrRef?: string;
}

export interface TradeoffItem {
  aspect: string;
  optionA: string;
  optionB: string;
  chosen: string;
  rationale: string;
}

export interface InfraRequirement {
  resource: string;
  specification: string;
  environment: "dev" | "staging" | "prod";
  estimatedCost: string;
  scaling: string;
}

export interface ObservabilityConfig {
  logging: string;
  metrics: string;
  tracing: string;
  alerting: string;
  dashboards: string[];
}

export interface SecurityArchConfig {
  authentication: string;
  authorization: string;
  encryption: string;
  networkSegmentation: string;
  secretsManagement: string;
  compliance: string[];
  threatModel: string;
}

export interface ChangelogInput {
  releases: ChangelogRelease[];
  projectName: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
}

// ─── Templates Pré-definidos ───────────────────────────────────────────────

export const PRDTemplate: DocumentTemplate = {
  id: "tmpl-prd",
  name: "PRD — Product Requirements Document",
  description: "Documento de requisitos de produto completo com visão geral, personas, jornadas, requisitos funcionais e não-funcionais, critérios de aceitação, mapeamento LGPD, roadmap, riscos e métricas.",
  category: "prd",
  sections: [],
  format: "md",
  version: "5.0.0",
  lastUpdated: "2026-08-14",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateISO(): string {
  return new Date().toISOString();
}

function formatDateBR(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSection(
  slug: string,
  title: string,
  content: string,
  required: boolean,
  order: number,
): DocumentSection {
  return {
    id: safeUUID(),
    title,
    slug,
    content,
    required,
    order,
    subsections: [],
  };
}

export const ADRTemplate: DocumentTemplate = {
  id: "tmpl-adr",
  name: "ADR — Architecture Decision Record",
  description: "Registro de decisão arquitetural com contexto, decisão, alternativas consideradas e consequências.",
  category: "adr",
  sections: [],
  format: "md",
  version: "5.0.0",
  lastUpdated: "2026-08-14",
};

export const APIDocsTemplate: DocumentTemplate = {
  id: "tmpl-api",
  name: "API Documentation",
  description: "Documentação completa de API REST com endpoints, schemas, códigos de erro e exemplos.",
  category: "api",
  sections: [],
  format: "md",
  version: "5.0.0",
  lastUpdated: "2026-08-14",
};

export const ArchitectureTemplate: DocumentTemplate = {
  id: "tmpl-arch",
  name: "Visão Geral de Arquitetura",
  description: "Documento de visão geral arquitetural com C4 Model, stack tecnológica, padrões e decisões de design.",
  category: "architecture",
  sections: [],
  format: "md",
  version: "5.0.0",
  lastUpdated: "2026-08-14",
};

export const ChangelogTemplate: DocumentTemplate = {
  id: "tmpl-changelog",
  name: "Changelog",
  description: "Registro de alterações por versão com seções Added, Changed, Deprecated, Removed, Fixed, Security.",
  category: "changelog",
  sections: [],
  format: "md",
  version: "5.0.0",
  lastUpdated: "2026-08-14",
};

// ─── Helpers de Conteúdo Markdown ─────────────────────────────────────────

/** Escapa pipes e quebras de linha para uso seguro em células de tabela Markdown. */
function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br/>");
}

/** Monta uma tabela Markdown a partir de cabeçalhos e linhas. */
function mdTable(headers: string[], rows: string[][]): string {
  const header = `| ${headers.map((h) => mdCell(h)).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => mdCell(cell)).join(" | ")} |`).join("\n");
  return [header, separator, body].join("\n");
}

/** Monta uma lista de bullets Markdown. */
function mdBullets(items: string[]): string {
  if (items.length === 0) return "- N/A";
  return items.map((item) => `- ${item}`).join("\n");
}

/** Monta um bloco de código fenced em Markdown. */
function mdCodeBlock(language: string, code: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/** Cria a estrutura base de um GeneratedDoc a partir do template, título e seções. */
function makeDoc(
  template: DocumentTemplate,
  title: string,
  sections: DocumentSection[],
  metadata: DocMetadata,
): GeneratedDoc {
  const now = formatDateISO();
  return {
    id: safeUUID(),
    template,
    title,
    sections,
    metadata,
    createdAt: now,
    updatedAt: now,
    version: 1,
    history: [],
  };
}

// ─── Metadados ─────────────────────────────────────────────────────────────

/** Retorna metadados de documento com valores padrão, sobrescrevendo com `partial`. */
export function makeMetadata(partial: Partial<DocMetadata> = {}): DocMetadata {
  return {
    projectName: "Projeto",
    author: "PromptArchitect",
    department: "Engenharia",
    version: "1.0.0",
    status: "draft",
    tags: [],
    stakeholders: [],
    ...partial,
  };
}

// ─── Geração de Documentos ─────────────────────────────────────────────────

/** Gera um PRD completo a partir dos dados de entrada. */
export function generatePRD(input: PRDInput): GeneratedDoc {
  const sections: DocumentSection[] = [];

  // 1. Visão Geral e Objetivos
  sections.push(
    buildSection(
      "visao-geral",
      "Visão Geral e Objetivos",
      [
        `**Projeto:** ${input.projectName}`,
        "",
        input.description,
        "",
        "### Objetivos",
        mdBullets(input.objectives),
      ].join("\n"),
      true,
      1,
    ),
  );

  // 2. Personas e Jornadas
  const personasMarkdown = input.personas.length
    ? input.personas
        .map((persona) =>
          [
            `### ${persona.name} — ${persona.role}`,
            persona.description,
            "",
            "**Metas:**",
            mdBullets(persona.goals),
            "",
            "**Frustrações:**",
            mdBullets(persona.frustrations),
            "",
            "**Cenários:**",
            mdBullets(persona.scenarios),
          ].join("\n"),
        )
        .join("\n\n")
    : "Nenhuma persona definida.";

  const journeysMarkdown = input.userJourneys.length
    ? [
        "### Jornadas",
        "",
        input.userJourneys
          .map((journey) =>
            [
              `#### ${journey.name}`,
              `**Persona:** ${journey.persona}`,
              `**Estado atual:** ${journey.currentState}`,
              `**Estado desejado:** ${journey.desiredState}`,
              "",
              "**Passos:**",
              mdTable(
                ["#", "Ação", "Emoção", "Ponto de dor", "Oportunidade"],
                journey.steps.map((step) => [
                  String(step.step),
                  step.action,
                  step.emotion,
                  step.painPoint,
                  step.opportunity,
                ]),
              ),
              "",
              "**Pontos de contato:**",
              mdBullets(journey.touchpoints),
            ].join("\n"),
          )
          .join("\n\n"),
      ].join("\n")
    : "";

  sections.push(
    buildSection(
      "personas",
      "Personas e Jornadas",
      [personasMarkdown, journeysMarkdown].filter(Boolean).join("\n\n"),
      true,
      2,
    ),
  );

  // 3. Requisitos Funcionais
  const functionalTable = mdTable(
    ["ID", "Título", "Prioridade", "Dependências", "Owner"],
    input.functionalRequirements.map((rf) => [
      rf.id,
      rf.title,
      rf.priority,
      rf.dependencies.join(", ") || "—",
      rf.owner,
    ]),
  );
  const functionalDetails = input.functionalRequirements
    .map((rf) => `#### ${rf.id} — ${rf.title}\n\n${rf.description}`)
    .join("\n\n");
  sections.push(
    buildSection(
      "requisitos-funcionais",
      "Requisitos Funcionais",
      [functionalTable, "", functionalDetails].join("\n"),
      true,
      3,
    ),
  );

  // 4. Requisitos Não-Funcionais
  const nfrTable = mdTable(
    ["ID", "Categoria", "Alvo", "Medição"],
    input.nonFunctionalRequirements.map((nfr) => [nfr.id, nfr.category, nfr.target, nfr.measurement]),
  );
  const nfrDetails = input.nonFunctionalRequirements
    .map((nfr) => `#### ${nfr.id} — ${nfr.title}\n\n${nfr.description}`)
    .join("\n\n");
  sections.push(
    buildSection(
      "requisitos-nao-funcionais",
      "Requisitos Não-Funcionais",
      [nfrTable, "", nfrDetails].join("\n"),
      true,
      4,
    ),
  );

  // 5. Critérios de Aceitação
  const acceptanceBlocks = input.acceptanceCriteria
    .map((ac) =>
      [
        `#### ${ac.id}${ac.featureRef ? ` — ${ac.featureRef}` : ""}`,
        "",
        `- **Dado que** ${ac.given}`,
        `- **Quando** ${ac.when}`,
        `- **Então** ${ac.then}`,
      ].join("\n"),
    )
    .join("\n\n");
  sections.push(
    buildSection(
      "criterios-aceitacao",
      "Critérios de Aceitação",
      acceptanceBlocks || "Nenhum critério de aceitação definido.",
      true,
      5,
    ),
  );

  // 6. Mapeamento de Dados e LGPD
  const dataMappingTable = mdTable(
    ["Entidade", "Sensibilidade", "Relevante LGPD", "Retenção", "Base Legal"],
    input.dataMapping.map((item) => [
      item.entity,
      item.sensitivity,
      item.lgpdRelevance ? "Sim" : "Não",
      item.retentionPeriod,
      item.basis,
    ]),
  );
  const dataFieldDetails = input.dataMapping
    .map((item) =>
      [
        `### ${item.entity}`,
        "",
        mdTable(
          ["Campo", "Tipo", "PII", "Criptografado", "Descrição"],
          item.fields.map((field) => [
            field.name,
            field.type,
            field.pii ? "Sim" : "Não",
            field.encrypted ? "Sim" : "Não",
            field.description,
          ]),
        ),
      ].join("\n"),
    )
    .join("\n\n");
  sections.push(
    buildSection(
      "mapeamento-dados",
      "Mapeamento de Dados e LGPD",
      [dataMappingTable, "", dataFieldDetails].filter(Boolean).join("\n"),
      true,
      6,
    ),
  );

  // 7. Arquitetura Proposta
  sections.push(
    buildSection(
      "arquitetura-proposta",
      "Arquitetura Proposta",
      input.architectureNotes || "A definir",
      true,
      7,
    ),
  );

  // 8. Roadmap
  const roadmapTable = mdTable(
    ["Fase", "Título", "Entregáveis", "Início", "Fim", "Dependências"],
    input.roadmap.map((item) => [
      item.phase,
      item.title,
      item.deliverables.join("<br/>"),
      item.startDate,
      item.endDate,
      item.dependencies.join(", ") || "—",
    ]),
  );
  const roadmapDetails = input.roadmap
    .map((item) => `### ${item.phase} — ${item.title}\n\n${item.description}`)
    .join("\n\n");
  sections.push(
    buildSection(
      "roadmap",
      "Roadmap",
      [roadmapTable, "", roadmapDetails].filter(Boolean).join("\n"),
      true,
      8,
    ),
  );

  // 9. Riscos e Mitigações
  const risksTable = mdTable(
    ["ID", "Descrição", "Probabilidade", "Impacto", "Mitigação", "Contingência", "Owner"],
    input.risks.map((risk) => [
      risk.id,
      risk.description,
      risk.probability,
      risk.impact,
      risk.mitigation,
      risk.contingency,
      risk.owner,
    ]),
  );
  sections.push(
    buildSection("riscos", "Riscos e Mitigações", risksTable, true, 9),
  );

  // 10. Métricas de Sucesso
  const metricsTable = mdTable(
    ["ID", "Nome", "Categoria", "Alvo", "Método de Medição", "Frequência"],
    input.successMetrics.map((metric) => [
      metric.id,
      metric.name,
      metric.category,
      metric.target,
      metric.measurementMethod,
      metric.frequency,
    ]),
  );
  const metricsDetails = input.successMetrics
    .map((metric) => `#### ${metric.id} — ${metric.name}\n\n${metric.description}`)
    .join("\n\n");
  sections.push(
    buildSection(
      "metricas",
      "Métricas de Sucesso",
      [metricsTable, "", metricsDetails].filter(Boolean).join("\n"),
      true,
      10,
    ),
  );

  // 11. Glossário
  const glossaryContent = input.glossary.length
    ? input.glossary
        .map(
          (item) =>
            `- **${item.term}**${item.abbreviation ? ` (${item.abbreviation})` : ""}: ${item.definition} — ${item.context}`,
        )
        .join("\n")
    : "- N/A";
  sections.push(
    buildSection("glossario", "Glossário", glossaryContent, false, 11),
  );

  // 12. Contexto Adicional
  sections.push(
    buildSection(
      "contexto-adicional",
      "Contexto Adicional",
      input.context || "Nenhum contexto adicional.",
      false,
      12,
    ),
  );

  return makeDoc(
    PRDTemplate,
    `PRD — ${input.projectName}`,
    sections,
    makeMetadata({ projectName: input.projectName }),
  );
}

/** Gera um ADR completo a partir dos dados de entrada. */
export function generateADR(input: ADRInput): GeneratedDoc {
  const alternativesContent = input.alternatives.length
    ? input.alternatives
        .map((alt) =>
          [
            `### ${alt.name}`,
            alt.description,
            "",
            "**Prós:**",
            mdBullets(alt.pros),
            "",
            "**Contras:**",
            mdBullets(alt.cons),
            "",
            `**Racional:** ${alt.rationale}`,
          ].join("\n"),
        )
        .join("\n\n")
    : "Nenhuma alternativa registrada.";

  const sections: DocumentSection[] = [
    buildSection("contexto", "Contexto", input.context, true, 1),
    buildSection(
      "decisao",
      "Decisão",
      `**Status:** ${input.status}\n\n${input.decision}`,
      true,
      2,
    ),
    buildSection("alternativas", "Alternativas Consideradas", alternativesContent, true, 3),
    buildSection("consequencias", "Consequências", input.consequences, true, 4),
    buildSection("referencias", "Referências", mdBullets(input.references), false, 5),
    buildSection("stakeholders", "Stakeholders", mdBullets(input.stakeholders), false, 6),
  ];

  return makeDoc(
    ADRTemplate,
    `ADR — ${input.title}`,
    sections,
    makeMetadata({ projectName: input.title, status: input.status }),
  );
}

/** Gera a documentação de API a partir dos endpoints fornecidos. */
export function generateAPIDocs(input: {
  title: string;
  description: string;
  endpoints: APIEndpoint[];
}): GeneratedDoc {
  const required = input.endpoints.filter((e) => e.authRequired).length;
  const authSummary = [
    `**Total de endpoints:** ${input.endpoints.length}`,
    `**Requerem autenticação:** ${required}`,
    `**Sem autenticação:** ${input.endpoints.length - required}`,
  ].join("\n");

  const endpointsContent = input.endpoints
    .map((endpoint) => {
      const parts: string[] = [
        `### ${endpoint.method} ${endpoint.path}`,
        `**Resumo:** ${endpoint.summary}`,
        `**Autenticação:** ${endpoint.authRequired ? "Obrigatória" : "Opcional"}`,
      ];
      if (endpoint.rateLimit) parts.push(`**Rate limit:** ${endpoint.rateLimit}`);
      parts.push(`**Tags:** ${endpoint.tags.join(", ") || "—"}`);
      parts.push("", endpoint.description);

      if (endpoint.requestBody) {
        parts.push(
          "",
          "**Request body:**",
          "",
          mdCodeBlock("json", JSON.stringify(endpoint.requestBody.schema, null, 2)),
        );
      }

      parts.push(
        "",
        "**Response body:**",
        "",
        mdCodeBlock("json", JSON.stringify(endpoint.responseBody.schema, null, 2)),
      );

      if (endpoint.errors.length) {
        parts.push(
          "",
          "**Erros:**",
          "",
          mdTable(
            ["Código", "Mensagem", "Descrição", "Resolução"],
            endpoint.errors.map((error) => [
              String(error.code),
              error.message,
              error.description,
              error.resolution,
            ]),
          ),
        );
      }

      if (endpoint.examples.length) {
        parts.push("", "**Exemplos:**");
        for (const example of endpoint.examples) {
          parts.push(`#### ${example.name}`);
          if (example.description) parts.push(example.description);
          if (example.request) {
            parts.push("", "**Request:**", mdCodeBlock("json", example.request));
          }
          parts.push("", "**Response:**", mdCodeBlock("json", example.response));
        }
      }

      return parts.join("\n");
    })
    .join("\n\n");

  // Consolida os códigos de erro sem duplicar por código.
  const seenCodes = new Set<number>();
  const uniqueErrors = input.endpoints
    .flatMap((endpoint) => endpoint.errors)
    .filter((error) => {
      if (seenCodes.has(error.code)) return false;
      seenCodes.add(error.code);
      return true;
    });

  const errorTable = uniqueErrors.length
    ? mdTable(
        ["Código", "Mensagem", "Descrição", "Resolução"],
        uniqueErrors.map((error) => [
          String(error.code),
          error.message,
          error.description,
          error.resolution,
        ]),
      )
    : "Nenhum código de erro documentado.";

  const sections: DocumentSection[] = [
    buildSection("visao-geral", "Visão Geral", input.description, true, 1),
    buildSection("autenticacao", "Autenticação", authSummary, true, 2),
    buildSection("endpoints", "Endpoints", endpointsContent, true, 3),
    buildSection("codigos-erro", "Códigos de Erro", errorTable, true, 4),
  ];

  return makeDoc(
    APIDocsTemplate,
    `API — ${input.title}`,
    sections,
    makeMetadata({ projectName: input.title }),
  );
}

/** Gera a visão geral de arquitetura a partir dos dados de entrada. */
export function generateArchitecture(input: ArchitectureInput): GeneratedDoc {
  const sections: DocumentSection[] = [];

  sections.push(
    buildSection(
      "contexto-sistema",
      "Contexto do Sistema",
      [
        input.description,
        "",
        mdTable(
          ["Nome", "Tipo", "Descrição", "Relacionamento"],
          input.systemContext.map((item) => [
            item.name,
            item.type,
            item.description,
            item.relationship,
          ]),
        ),
      ].join("\n"),
      true,
      1,
    ),
  );

  sections.push(
    buildSection(
      "containers",
      "Containers",
      mdTable(
        ["Nome", "Tecnologia", "Tipo", "Descrição", "Dependências", "Expõe"],
        input.containers.map((container) => [
          container.name,
          container.technology,
          container.type,
          container.description,
          container.dependsOn.join(", ") || "—",
          container.exposes.join(", ") || "—",
        ]),
      ),
      true,
      2,
    ),
  );

  sections.push(
    buildSection(
      "componentes",
      "Componentes",
      mdTable(
        ["Nome", "Container", "Tecnologia", "Responsabilidade", "Dependências", "Estereótipo"],
        input.components.map((component) => [
          component.name,
          component.container,
          component.technology,
          component.responsibility,
          component.dependsOn.join(", ") || "—",
          component.stereotype || "—",
        ]),
      ),
      true,
      3,
    ),
  );

  sections.push(
    buildSection(
      "stack",
      "Stack Tecnológica",
      mdTable(
        ["Categoria", "Nome", "Versão", "Propósito"],
        input.stack.map((tech) => [tech.category, tech.name, tech.version, tech.purpose]),
      ),
      true,
      4,
    ),
  );

  sections.push(
    buildSection(
      "padroes",
      "Padrões Arquiteturais",
      input.architecturalPatterns.length
        ? input.architecturalPatterns
            .map(
              (pattern) =>
                `### ${pattern.name}\n\n${pattern.description}\n\n**Aplicado em:** ${pattern.appliedWhere}\n\n**Racional:** ${pattern.rationale}`,
            )
            .join("\n\n")
        : "Nenhum padrão arquitetural registrado.",
      true,
      5,
    ),
  );

  sections.push(
    buildSection(
      "decisoes",
      "Decisões de Design",
      mdTable(
        ["ID", "Título", "Decisão", "Racional", "Consequências", "ADR"],
        input.designDecisions.map((decision) => [
          decision.id,
          decision.title,
          decision.decision,
          decision.rationale,
          decision.consequences.join("<br/>"),
          decision.adrRef || "—",
        ]),
      ),
      true,
      6,
    ),
  );

  sections.push(
    buildSection(
      "tradeoffs",
      "Trade-offs",
      mdTable(
        ["Aspecto", "Opção A", "Opção B", "Escolhida", "Racional"],
        input.tradeoffs.map((tradeoff) => [
          tradeoff.aspect,
          tradeoff.optionA,
          tradeoff.optionB,
          tradeoff.chosen,
          tradeoff.rationale,
        ]),
      ),
      true,
      7,
    ),
  );

  sections.push(
    buildSection(
      "infraestrutura",
      "Requisitos de Infraestrutura",
      mdTable(
        ["Recurso", "Especificação", "Ambiente", "Custo Estimado", "Escalabilidade"],
        input.infrastructureRequirements.map((infra) => [
          infra.resource,
          infra.specification,
          infra.environment,
          infra.estimatedCost,
          infra.scaling,
        ]),
      ),
      true,
      8,
    ),
  );

  sections.push(
    buildSection(
      "observabilidade",
      "Observabilidade",
      [
        `**Logging:** ${input.observability.logging}`,
        `**Métricas:** ${input.observability.metrics}`,
        `**Tracing:** ${input.observability.tracing}`,
        `**Alertas:** ${input.observability.alerting}`,
        "",
        "**Dashboards:**",
        mdBullets(input.observability.dashboards),
      ].join("\n"),
      true,
      9,
    ),
  );

  sections.push(
    buildSection(
      "seguranca",
      "Segurança",
      [
        `**Autenticação:** ${input.security.authentication}`,
        `**Autorização:** ${input.security.authorization}`,
        `**Criptografia:** ${input.security.encryption}`,
        `**Segmentação de rede:** ${input.security.networkSegmentation}`,
        `**Gestão de segredos:** ${input.security.secretsManagement}`,
        `**Modelo de ameaças:** ${input.security.threatModel}`,
        "",
        "**Compliance:**",
        mdBullets(input.security.compliance),
      ].join("\n"),
      true,
      10,
    ),
  );

  return makeDoc(
    ArchitectureTemplate,
    `Arquitetura — ${input.systemName}`,
    sections,
    makeMetadata({ projectName: input.systemName }),
  );
}

/** Gera o changelog com uma seção por release e subseções de tipo de mudança. */
export function generateChangelog(input: ChangelogInput): GeneratedDoc {
  const sections: DocumentSection[] = input.releases.map((release, index) => {
    const subsectionContent = [
      release.added.length ? `### Added\n\n${mdBullets(release.added)}` : "",
      release.changed.length ? `### Changed\n\n${mdBullets(release.changed)}` : "",
      release.deprecated.length ? `### Deprecated\n\n${mdBullets(release.deprecated)}` : "",
      release.removed.length ? `### Removed\n\n${mdBullets(release.removed)}` : "",
      release.fixed.length ? `### Fixed\n\n${mdBullets(release.fixed)}` : "",
      release.security.length ? `### Security\n\n${mdBullets(release.security)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return buildSection(
      `release-${release.version.replace(/\./g, "-")}`,
      `${release.version} — ${release.date}`,
      subsectionContent || "Sem alterações registradas.",
      false,
      index + 1,
    );
  });

  return makeDoc(
    ChangelogTemplate,
    `Changelog — ${input.projectName}`,
    sections,
    makeMetadata({ projectName: input.projectName }),
  );
}

// ─── Renderização e Exportação ────────────────────────────────────────────

/** Renderiza o documento como Markdown, com seções ordenadas por `order`. */
export function renderDocToMarkdown(doc: GeneratedDoc): string {
  const meta = doc.metadata;
  const lines: string[] = [
    `# ${doc.title}`,
    "",
    `**Autor:** ${meta.author} · **Versão:** ${meta.version} · **Status:** ${meta.status} · **Data:** ${formatDateBR()}`,
  ];

  if (meta.department) lines.push(`**Departamento:** ${meta.department}`);
  if (meta.tags.length) lines.push(`**Tags:** ${meta.tags.join(", ")}`);
  if (meta.stakeholders.length) lines.push(`**Stakeholders:** ${meta.stakeholders.join(", ")}`);
  lines.push("", "---", "");

  const sorted = [...doc.sections].sort((a, b) => a.order - b.order);
  for (const section of sorted) {
    lines.push(`## ${section.title}`, "");
    if (section.content) lines.push(section.content, "");
    for (const subsection of section.subsections) {
      lines.push(`### ${subsection.title}`, "");
      if (subsection.content) lines.push(subsection.content, "");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

/** Renderiza o documento como JSON formatado. */
export function renderDocToJson(doc: GeneratedDoc): string {
  return JSON.stringify(doc, null, 2);
}

/** Escapa caracteres especiais para uso em HTML. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converte uma linha de tabela Markdown em células, respeitando pipes escapados. */
function splitTableCells(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\\" && line[i + 1] === "|") {
      current += "|";
      i++;
    } else if (char === "|") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** Converte um bloco de tabela Markdown em HTML. */
function markdownTableToHtml(block: string): string {
  const lines = block.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) return block;

  const headerCells = splitTableCells(lines[0]);
  const bodyRows = lines.slice(2).map((line) => splitTableCells(line));

  const header = headerCells.map((cell) => `<th>${cell}</th>`).join("");
  const body = bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Converte Markdown básico em HTML (títulos, negrito, código, listas, tabelas e parágrafos). */
function renderMarkdownToHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);

  // Extrai blocos de código primeiro para que seu conteúdo não seja processado.
  const codeBlocks: string[] = [];
  const withPlaceholders = escaped.replace(
    /```([\w-]*)\n([\s\S]*?)```/g,
    (_match: string, _language: string, code: string) => {
      const index = codeBlocks.push(`<pre><code>${code.trimEnd()}</code></pre>`) - 1;
      return `\u0000CODEBLOCK${index}\u0000`;
    },
  );

  const html = withPlaceholders
    .replace(/(?:^\|.+\|\n)+/gm, (block) => markdownTableToHtml(block))
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(?:<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return html.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_match: string, index: string) => {
    return codeBlocks[Number(index)] ?? "";
  });
}

/** Renderiza o documento como HTML completo com estilo minimalista. */
export function renderDocToHtml(doc: GeneratedDoc): string {
  const markdown = renderDocToMarkdown(doc);
  const body = `<p>${renderMarkdownToHtml(markdown)}</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(doc.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; line-height: 1.7;
         color: #111; background: #fff; padding: 40px 48px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; color: #115e59; margin: 24px 0 10px;
       border-bottom: 2px solid #ccfbf1; padding-bottom: 6px; }
  h2 { font-size: 17px; font-weight: 600; color: #134e4a; margin: 20px 0 8px; }
  h3 { font-size: 15px; font-weight: 600; color: #0f766e; margin: 16px 0 6px; }
  p { margin: 8px 0; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 3px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #f0fdfa; color: #115e59; }
  code { font-family: 'JetBrains Mono', monospace; font-size: 12px;
         background: #f0fdfa; color: #115e59; padding: 1px 5px; border-radius: 4px; }
  pre { background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px;
        font-size: 12px; overflow-x: auto; margin: 12px 0; }
  pre code { background: none; color: inherit; padding: 0; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** Exporta o documento no formato solicitado (PDF é retornado como HTML para impressão no navegador). */
export function exportDoc(doc: GeneratedDoc, format: DocFormat): string {
  switch (format) {
    case "json":
      return renderDocToJson(doc);
    case "html":
    case "pdf":
      return renderDocToHtml(doc);
    case "md":
    default:
      return renderDocToMarkdown(doc);
  }
}

// ─── Templates ─────────────────────────────────────────────────────────────

/** Retorna todos os templates de documento disponíveis. */
export function getDocTemplates(): DocumentTemplate[] {
  return [PRDTemplate, ADRTemplate, APIDocsTemplate, ArchitectureTemplate, ChangelogTemplate];
}

/** Retorna o template correspondente à categoria informada, ou `null` se não existir. */
export function getTemplateByCategory(category: DocCategory): DocumentTemplate | null {
  return getDocTemplates().find((template) => template.category === category) ?? null;
}
