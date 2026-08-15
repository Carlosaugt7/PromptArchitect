/**
 * Orquestrador Principal do PromptArchitect
 * Integra Discovery → Geração de Documentos → Versionamento → Validação
 */

import { classifySegment, formatDiscoveryPrompt, type DiscoveryResponse } from "../discovery/segment-classifier";
import { generatePRDTemplate, type BusinessSegment } from "../docs/templates/prd-template";
import { generateTRDTemplate } from "../docs/templates/trd-template";
import { generateMCPManifestTemplate } from "../docs/templates/mcp-manifest-template";
import {
  createArtifactTemplate,
  createVersion,
  validateProductionReadiness,
  checkModelCompatibility,
  generateChangelog,
  type VersionedArtifact,
  type TestCase,
} from "../governance/version-control";

export interface OrchestratorRequest {
  userInput: string;
  projectName: string;
  author: string;
  targetModel?: string;
  mode: "discovery" | "generate" | "refine" | "validate";
  discoveryAnswers?: Record<string, string>;
}

export interface OrchestratorResponse {
  phase: "discovery" | "generation" | "validation" | "complete";
  discoveryResult?: DiscoveryResponse;
  discoveryPrompt?: string;
  generatedDocuments?: GeneratedDocument[];
  artifacts?: VersionedArtifact[];
  validationReport?: ValidationReport;
  nextSteps?: string[];
  estimatedProgress?: number; // 0-100
}

export interface GeneratedDocument {
  type: "PRD" | "TRD" | "MCP_MANIFEST" | "SYSTEM_PROMPT" | "API_SPEC";
  content: string;
  version: string;
  mandatory: boolean;
}

export interface ValidationReport {
  productionReady: boolean;
  blockers: string[];
  warnings: string[];
  testResults: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
  modelCompatibility?: {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Ponto de entrada principal do orquestrador
 */
export async function orchestrate(request: OrchestratorRequest): Promise<OrchestratorResponse> {
  switch (request.mode) {
    case "discovery":
      return handleDiscovery(request);

    case "generate":
      return handleGeneration(request);

    case "refine":
      return handleRefinement(request);

    case "validate":
      return handleValidation(request);

    default:
      throw new Error(`Modo não suportado: ${request.mode}`);
  }
}

/**
 * Fase 1: Discovery Estruturado
 */
function handleDiscovery(request: OrchestratorRequest): OrchestratorResponse {
  const discoveryResult = classifySegment(request.userInput);
  const discoveryPrompt = formatDiscoveryPrompt(discoveryResult);

  return {
    phase: "discovery",
    discoveryResult,
    discoveryPrompt,
    nextSteps: [
      "Responda às perguntas de qualificação acima",
      "Revisar suposições assumidas",
      "Prosseguir para geração de documentos (mode: 'generate')",
    ],
    estimatedProgress: 20,
  };
}

/**
 * Fase 2: Geração de Documentos
 */
function handleGeneration(request: OrchestratorRequest): OrchestratorResponse {
  if (!request.discoveryAnswers) {
    throw new Error("discoveryAnswers é obrigatório no modo 'generate'");
  }

  const segment = (request.discoveryAnswers.segment as BusinessSegment) || "Custom";
  const documents: GeneratedDocument[] = [];
  const artifacts: VersionedArtifact[] = [];

  // 1. Gera PRD
  const prdContent = generatePRDTemplate(request.projectName, segment, request.userInput);
  documents.push({
    type: "PRD",
    content: prdContent,
    version: "v1.0.0",
    mandatory: true,
  });

  const prdArtifact = createArtifactTemplate("prd", `${request.projectName} - PRD`, segment, request.author);
  prdArtifact.content = prdContent;
  artifacts.push(prdArtifact);

  // 2. Gera TRD (se mandatório para o segmento)
  const mandatoryDocs = getMandatoryDocuments(segment);
  if (mandatoryDocs.includes("TRD")) {
    const trdContent = generateTRDTemplate(
      request.projectName,
      "PRD v1.0.0",
      extractStackFromAnswers(request.discoveryAnswers)
    );
    documents.push({
      type: "TRD",
      content: trdContent,
      version: "v1.0.0",
      mandatory: true,
    });

    const trdArtifact = createArtifactTemplate("trd", `${request.projectName} - TRD`, segment, request.author);
    trdArtifact.content = trdContent;
    trdArtifact.dependencies = [
      {
        artifactId: prdArtifact.id,
        artifactType: "prd",
        version: "v1.0.0",
        relationship: "requires",
      },
    ];
    artifacts.push(trdArtifact);
  }

  // 3. Gera MCP Manifest (se o projeto tem agentes/IA)
  if (
    mandatoryDocs.includes("MCP_MANIFEST") ||
    request.userInput.toLowerCase().includes("agente") ||
    request.userInput.toLowerCase().includes("chatbot") ||
    request.userInput.toLowerCase().includes("ia")
  ) {
    const mcpContent = generateMCPManifestTemplate(request.projectName, request.userInput);
    documents.push({
      type: "MCP_MANIFEST",
      content: mcpContent,
      version: "v1.0.0",
      mandatory: segment === "WhatsApp Automation",
    });

    const mcpArtifact = createArtifactTemplate(
      "mcp_manifest",
      `${request.projectName} - MCP Manifest`,
      segment,
      request.author
    );
    mcpArtifact.content = mcpContent;
    artifacts.push(mcpArtifact);
  }

  // 4. Gera System Prompt (se tem agente)
  if (mandatoryDocs.includes("SYSTEM_PROMPT")) {
    const systemPrompt = generateSystemPrompt(request.projectName, segment, request.discoveryAnswers);
    documents.push({
      type: "SYSTEM_PROMPT",
      content: systemPrompt,
      version: "v1.0.0",
      mandatory: true,
    });

    const promptArtifact = createArtifactTemplate(
      "system_prompt",
      `${request.projectName} - System Prompt`,
      segment,
      request.author
    );
    promptArtifact.content = systemPrompt;
    promptArtifact.testCases = generateDefaultTestCases(segment);
    if (request.targetModel) {
      promptArtifact.metadata.targetModel = [request.targetModel];
    }
    artifacts.push(promptArtifact);
  }

  return {
    phase: "generation",
    generatedDocuments: documents,
    artifacts,
    nextSteps: [
      "Revisar documentos gerados",
      "Ajustar conforme necessário",
      "Adicionar casos de teste customizados",
      "Prosseguir para validação (mode: 'validate')",
    ],
    estimatedProgress: 70,
  };
}

/**
 * Fase 3: Refinamento
 */
function handleRefinement(request: OrchestratorRequest): OrchestratorResponse {
  // TODO: Implementar lógica de refinamento iterativo
  return {
    phase: "generation",
    nextSteps: ["Refinamento em desenvolvimento"],
    estimatedProgress: 75,
  };
}

/**
 * Fase 4: Validação
 */
function handleValidation(request: OrchestratorRequest): OrchestratorResponse {
  if (!request.discoveryAnswers?.artifacts) {
    throw new Error("Artefatos não fornecidos para validação");
  }

  const artifacts = JSON.parse(request.discoveryAnswers.artifacts) as VersionedArtifact[];
  const validationReports: ValidationReport[] = [];

  artifacts.forEach((artifact) => {
    const productionCheck = validateProductionReadiness(artifact);
    let modelCompatibilityCheck = undefined;

    if (request.targetModel && artifact.type === "system_prompt") {
      modelCompatibilityCheck = checkModelCompatibility(artifact, request.targetModel);
    }

    const testResults = {
      total: artifact.testCases.length,
      passed: artifact.testCases.filter((t) => t.status === "passed").length,
      failed: artifact.testCases.filter((t) => t.status === "failed").length,
      pending: artifact.testCases.filter((t) => t.status === "pending").length,
    };

    validationReports.push({
      productionReady: productionCheck.ready,
      blockers: productionCheck.blockers,
      warnings: productionCheck.warnings,
      testResults,
      modelCompatibility: modelCompatibilityCheck,
    });
  });

  // Consolida relatórios
  const consolidatedReport: ValidationReport = {
    productionReady: validationReports.every((r) => r.productionReady),
    blockers: validationReports.flatMap((r) => r.blockers),
    warnings: validationReports.flatMap((r) => r.warnings),
    testResults: {
      total: validationReports.reduce((sum, r) => sum + r.testResults.total, 0),
      passed: validationReports.reduce((sum, r) => sum + r.testResults.passed, 0),
      failed: validationReports.reduce((sum, r) => sum + r.testResults.failed, 0),
      pending: validationReports.reduce((sum, r) => sum + r.testResults.pending, 0),
    },
    modelCompatibility: validationReports.find((r) => r.modelCompatibility)?.modelCompatibility,
  };

  const nextSteps: string[] = [];
  if (consolidatedReport.productionReady) {
    nextSteps.push("✅ Todos os artefatos prontos para produção!");
    nextSteps.push("Próximos passos: Deploy, monitoramento, coleta de feedback");
  } else {
    nextSteps.push("❌ Bloqueadores encontrados. Resolva antes de prosseguir:");
    nextSteps.push(...consolidatedReport.blockers.map((b) => `  - ${b}`));
  }

  if (consolidatedReport.warnings.length > 0) {
    nextSteps.push("⚠️ Avisos (não bloqueiam produção, mas recomendado resolver):");
    nextSteps.push(...consolidatedReport.warnings.map((w) => `  - ${w}`));
  }

  return {
    phase: consolidatedReport.productionReady ? "complete" : "validation",
    validationReport: consolidatedReport,
    nextSteps,
    estimatedProgress: consolidatedReport.productionReady ? 100 : 90,
  };
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

function getMandatoryDocuments(segment: BusinessSegment): string[] {
  const mandatoryMap: Record<BusinessSegment, string[]> = {
    ERP: ["PRD", "TRD", "API_SPEC", "SECURITY_DOC", "RUNBOOK"],
    "WhatsApp Automation": ["PRD", "TRD", "MCP_MANIFEST", "SYSTEM_PROMPT"],
    "SaaS B2B": ["PRD", "TRD", "API_SPEC", "SECURITY_DOC"],
    "IPTV/Streaming": ["PRD", "TRD", "API_SPEC", "RUNBOOK"],
    "EAD/LMS": ["PRD", "TRD", "API_SPEC"],
    "SaaS B2C": ["PRD", "TRD"],
    Marketplace: ["PRD", "TRD", "API_SPEC"],
    "Mobile App": ["PRD", "TRD"],
    "E-commerce": ["PRD", "TRD", "API_SPEC"],
    Fintech: ["PRD", "TRD", "API_SPEC", "SECURITY_DOC"],
    HealthTech: ["PRD", "TRD", "API_SPEC", "SECURITY_DOC"],
    AgriTech: ["PRD", "TRD"],
    PropTech: ["PRD", "TRD", "API_SPEC", "SECURITY_DOC"],
    LegalTech: ["PRD", "TRD", "API_SPEC", "SECURITY_DOC", "QA_PLAN"],
    EdTech: ["PRD", "TRD", "API_SPEC", "DESIGN_SYSTEM"],
    Custom: ["PRD", "TRD"],
  };

  return mandatoryMap[segment] || ["PRD", "TRD"];
}

function extractStackFromAnswers(answers: Record<string, string>): any {
  return {
    frontend: {
      framework: answers.frontend_framework || "[PREENCHER]",
      stateManagement: answers.state_management || "[PREENCHER]",
      styling: "Tailwind CSS v4",
      uiLibrary: "shadcn/ui + Radix",
      buildTool: "Vite",
      testing: ["Vitest", "Playwright"],
    },
    backend: {
      runtime: answers.backend_runtime || "[PREENCHER]",
      framework: answers.backend_framework || "[PREENCHER]",
      language: answers.language || "[PREENCHER]",
      testing: ["Jest"],
    },
    database: {
      primary: answers.database || "PostgreSQL",
    },
    infrastructure: {
      hosting: answers.hosting || "[PREENCHER]",
      ci_cd: "GitHub Actions",
    },
  };
}

function generateSystemPrompt(
  projectName: string,
  segment: BusinessSegment,
  answers: Record<string, string>
): string {
  const escalationRules = answers.human_escalation || "[PREENCHER: condições de escalonamento]";
  const businessHours = answers.business_hours || "Segunda a Sexta, 9h-18h";

  return `# System Prompt: ${projectName}

## Identidade

**Nome:** [PREENCHER: nome do agente]
**Papel:** Assistente de ${segment}
**Tom:** Profissional, prestativo e empático

## Objetivo

[PREENCHER: objetivo principal do agente]

## Capacidades

- [PREENCHER: capacidade 1]
- [PREENCHER: capacidade 2]
- [PREENCHER: capacidade 3]

## Restrições

- NUNCA compartilhe dados pessoais de outros usuários
- NUNCA execute ações que não foram explicitamente solicitadas
- Se não souber a resposta, admita e escale para humano
- [PREENCHER: restrições específicas do domínio]

## Regras de Escalonamento

${escalationRules}

**Horário Comercial:** ${businessHours}
- **Dentro do horário:** Atendimento normal
- **Fora do horário:** Responder com previsão de retorno

## Formato de Resposta

- Mensagens claras e objetivas
- Use bullet points para listas
- Sempre confirme ações antes de executar
- Termine com pergunta aberta se problema não resolvido

## Exemplos

### Exemplo 1: Cenário Feliz
**Usuário:** [PREENCHER]
**Assistente:** [PREENCHER: resposta ideal]

### Exemplo 2: Escalonamento
**Usuário:** [PREENCHER: situação que exige escalonamento]
**Assistente:** [PREENCHER: como escalar graciosamente]

### Exemplo 3: Fora do Escopo
**Usuário:** [PREENCHER: pergunta fora do domínio]
**Assistente:** [PREENCHER: como recusar educadamente]

---

**Versão:** 1.0.0
**Última Atualização:** ${new Date().toISOString().split("T")[0]}
**Compatível com:** [PREENCHER: modelos LLM testados]
`;
}

function generateDefaultTestCases(segment: BusinessSegment): TestCase[] {
  const cases: TestCase[] = [
    {
      id: "test_happy_1",
      name: "Cenário feliz: Requisição válida",
      type: "happy_path",
      input: "[PREENCHER: exemplo de input válido]",
      expectedOutput: "[PREENCHER: resposta esperada]",
      status: "pending",
    },
    {
      id: "test_edge_1",
      name: "Edge case: Input ambíguo",
      type: "edge_case",
      input: "[PREENCHER: input ambíguo]",
      expectedOutput: "[PREENCHER: como o agente deve pedir clarificação]",
      status: "pending",
    },
    {
      id: "test_error_1",
      name: "Error handling: Requisição inválida",
      type: "error_handling",
      input: "[PREENCHER: input inválido]",
      expectedOutput: "[PREENCHER: mensagem de erro amigável]",
      status: "pending",
    },
  ];

  // Casos específicos por segmento
  if (segment === "WhatsApp Automation") {
    cases.push({
      id: "test_escalation",
      name: "Escalonamento para humano",
      type: "edge_case",
      input: "Quero falar com um atendente",
      expectedOutput: "Vou transferir você para um atendente humano. Aguarde um momento.",
      status: "pending",
    });

    cases.push({
      id: "test_out_of_hours",
      name: "Fora do horário comercial",
      type: "edge_case",
      input: "[mensagem às 23h]",
      expectedOutput:
        "No momento estamos fora do horário de atendimento (Segunda a Sexta, 9h-18h). Retornaremos amanhã às 9h.",
      status: "pending",
    });
  }

  return cases;
}
