/**
 * Sistema de Governança e Versionamento Semântico de Prompts
 * Gerencia versões, changelog e rastreabilidade de prompts/documentos
 */

export interface VersionedArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  version: SemanticVersion;
  content: string;
  metadata: ArtifactMetadata;
  changelog: ChangelogEntry[];
  testCases: TestCase[];
  dependencies: Dependency[];
}

export type ArtifactType =
  | "system_prompt"
  | "prd"
  | "trd"
  | "mcp_manifest"
  | "api_spec"
  | "design_system"
  | "test_suite";

export interface SemanticVersion {
  major: number; // Breaking changes
  minor: number; // New features (backward compatible)
  patch: number; // Bug fixes
  toString(): string;
}

export interface ArtifactMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  status: "draft" | "review" | "approved" | "deprecated";
  approvedBy?: string;
  approvedAt?: Date;
  tags: string[];
  segment: string; // Business segment
  targetModel?: string[]; // Compatible LLM models
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: Change[];
  breakingChanges: string[];
  author: string;
  reason: string; // Why this change was made
}

export interface Change {
  type: "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";
  description: string;
  impactedSections: string[];
}

export interface TestCase {
  id: string;
  name: string;
  type: "happy_path" | "edge_case" | "error_handling";
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  status: "pending" | "passed" | "failed";
  lastRun?: Date;
}

export interface Dependency {
  artifactId: string;
  artifactType: ArtifactType;
  version: string;
  relationship: "requires" | "extends" | "references";
}

/**
 * Cria uma nova versão semântica
 */
export function createVersion(major: number, minor: number, patch: number): SemanticVersion {
  return {
    major,
    minor,
    patch,
    toString() {
      return `v${this.major}.${this.minor}.${this.patch}`;
    },
  };
}

/**
 * Incrementa versão baseado no tipo de mudança
 */
export function incrementVersion(
  current: SemanticVersion,
  changeType: "major" | "minor" | "patch"
): SemanticVersion {
  switch (changeType) {
    case "major":
      return createVersion(current.major + 1, 0, 0);
    case "minor":
      return createVersion(current.major, current.minor + 1, 0);
    case "patch":
      return createVersion(current.major, current.minor, current.patch + 1);
  }
}

/**
 * Determina automaticamente o tipo de incremento baseado nas mudanças
 */
export function determineVersionIncrement(changes: Change[]): "major" | "minor" | "patch" {
  // Se há mudanças que quebram compatibilidade, é major
  if (
    changes.some(
      (c) =>
        c.type === "removed" ||
        (c.type === "changed" && c.description.toLowerCase().includes("breaking"))
    )
  ) {
    return "major";
  }

  // Se há novos recursos, é minor
  if (changes.some((c) => c.type === "added")) {
    return "minor";
  }

  // Caso contrário, é patch (fixes, security)
  return "patch";
}

/**
 * Valida compatibilidade entre versões
 */
export function isCompatible(required: SemanticVersion, current: SemanticVersion): boolean {
  // Major version deve ser exatamente igual (breaking changes)
  if (required.major !== current.major) {
    return false;
  }

  // Minor e patch podem ser iguais ou maiores (backward compatible)
  if (current.minor < required.minor) {
    return false;
  }

  if (current.minor === required.minor && current.patch < required.patch) {
    return false;
  }

  return true;
}

/**
 * Gera changelog formatado
 */
export function generateChangelog(entries: ChangelogEntry[]): string {
  const sortedEntries = entries.sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  let changelog = "# Changelog\n\n";
  changelog += "Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.\n\n";
  changelog +=
    "O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),\n";
  changelog += "e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).\n\n";

  sortedEntries.forEach((entry) => {
    changelog += `## [${entry.version}] - ${entry.date.toISOString().split("T")[0]}\n\n`;

    if (entry.reason) {
      changelog += `**Motivação:** ${entry.reason}\n\n`;
    }

    if (entry.breakingChanges.length > 0) {
      changelog += "### ⚠️ BREAKING CHANGES\n\n";
      entry.breakingChanges.forEach((bc) => {
        changelog += `- ${bc}\n`;
      });
      changelog += "\n";
    }

    // Agrupa mudanças por tipo
    const byType = new Map<string, Change[]>();
    entry.changes.forEach((change) => {
      if (!byType.has(change.type)) {
        byType.set(change.type, []);
      }
      byType.get(change.type)!.push(change);
    });

    const typeLabels: Record<string, string> = {
      added: "### 🆕 Adicionado",
      changed: "### 🔄 Modificado",
      deprecated: "### ⚠️ Descontinuado",
      removed: "### 🗑️ Removido",
      fixed: "### 🐛 Corrigido",
      security: "### 🔒 Segurança",
    };

    byType.forEach((changes, type) => {
      changelog += `${typeLabels[type] || `### ${type}`}\n\n`;
      changes.forEach((change) => {
        changelog += `- ${change.description}`;
        if (change.impactedSections.length > 0) {
          changelog += ` (Afeta: ${change.impactedSections.join(", ")})`;
        }
        changelog += "\n";
      });
      changelog += "\n";
    });

    changelog += `**Autor:** ${entry.author}\n\n`;
    changelog += "---\n\n";
  });

  return changelog;
}

/**
 * Valida se um artefato está pronto para produção
 */
export function validateProductionReadiness(artifact: VersionedArtifact): {
  ready: boolean;
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Status deve ser "approved"
  if (artifact.metadata.status !== "approved") {
    blockers.push(
      `Status atual: ${artifact.metadata.status}. Deve estar "approved" antes de ir para produção.`
    );
  }

  // Deve ter aprovação formal
  if (!artifact.metadata.approvedBy) {
    blockers.push("Falta aprovação formal de um revisor.");
  }

  // Para system prompts, deve ter casos de teste
  if (artifact.type === "system_prompt") {
    if (artifact.testCases.length === 0) {
      blockers.push("System prompts devem ter pelo menos 3 casos de teste.");
    }

    const failedTests = artifact.testCases.filter((t) => t.status === "failed");
    if (failedTests.length > 0) {
      blockers.push(
        `${failedTests.length} casos de teste falhando: ${failedTests.map((t) => t.name).join(", ")}`
      );
    }

    const pendingTests = artifact.testCases.filter((t) => t.status === "pending");
    if (pendingTests.length > 0) {
      warnings.push(
        `${pendingTests.length} casos de teste não executados ainda.`
      );
    }

    // Edge cases obrigatórios
    const hasEdgeCases = artifact.testCases.some((t) => t.type === "edge_case");
    if (!hasEdgeCases) {
      warnings.push("Recomendado adicionar casos de teste para edge cases.");
    }

    // Error handling obrigatório
    const hasErrorHandling = artifact.testCases.some((t) => t.type === "error_handling");
    if (!hasErrorHandling) {
      warnings.push("Recomendado adicionar casos de teste para tratamento de erros.");
    }
  }

  // Changelog deve ter justificativa
  const latestChangelog = artifact.changelog[0];
  if (!latestChangelog?.reason) {
    warnings.push("Última versão não tem justificativa de mudança documentada.");
  }

  // Dependências devem ser compatíveis
  artifact.dependencies.forEach((dep) => {
    // Aqui você faria verificação real contra os artefatos dependentes
    // Por simplicidade, apenas validamos que estão declaradas
    if (!dep.version) {
      warnings.push(`Dependência ${dep.artifactId} sem versão especificada.`);
    }
  });

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Gera relatório de compatibilidade de modelo
 */
export function checkModelCompatibility(
  artifact: VersionedArtifact,
  targetModel: string
): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!artifact.metadata.targetModel) {
    issues.push("Compatibilidade de modelo não especificada no artefato.");
    return { compatible: false, issues, recommendations };
  }

  // Verifica se o modelo está na lista de compatíveis
  if (!artifact.metadata.targetModel.includes(targetModel)) {
    issues.push(
      `Este artefato foi otimizado para ${artifact.metadata.targetModel.join(", ")}. Pode não funcionar bem em ${targetModel}.`
    );
  }

  // Recomendações específicas por modelo
  const modelRecommendations: Record<string, string[]> = {
    "gpt-4": [
      "GPT-4 prefere instruções XML-tagged para parsing estruturado",
      "Use few-shot examples para calibrar tom e formato",
    ],
    "claude-3": [
      "Claude prefere XML tags para seções (<context>, <instructions>)",
      "Separe claramente: identidade → regras → formato → exemplos",
    ],
    "gemini-2.0": [
      "Gemini funciona bem com Markdown puro",
      "Chain-of-thought explícito melhora raciocínio",
    ],
    deepseek: [
      "DeepSeek é sensível a instruções muito longas",
      "Priorize clareza e concisão sobre detalhamento excessivo",
    ],
  };

  if (modelRecommendations[targetModel]) {
    recommendations.push(...modelRecommendations[targetModel]);
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Cria template de novo artefato versionado
 */
export function createArtifactTemplate(
  type: ArtifactType,
  name: string,
  segment: string,
  author: string
): VersionedArtifact {
  return {
    id: `${type}_${Date.now()}`,
    type,
    name,
    version: createVersion(1, 0, 0),
    content: "", // Será preenchido
    metadata: {
      author,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "draft",
      tags: [segment.toLowerCase()],
      segment,
    },
    changelog: [
      {
        version: "v1.0.0",
        date: new Date(),
        changes: [
          {
            type: "added",
            description: "Versão inicial",
            impactedSections: [],
          },
        ],
        breakingChanges: [],
        author,
        reason: "Criação inicial do artefato",
      },
    ],
    testCases: [],
    dependencies: [],
  };
}

/**
 * Exporta artefato em formato JSON estruturado
 */
export function exportArtifact(artifact: VersionedArtifact): string {
  return JSON.stringify(
    artifact,
    (key, value) => {
      // Converte datas para ISO string
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    2
  );
}

/**
 * Importa artefato de JSON
 */
export function importArtifact(json: string): VersionedArtifact {
  const parsed = JSON.parse(json);

  // Reconverte strings ISO para Date
  parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);
  parsed.metadata.updatedAt = new Date(parsed.metadata.updatedAt);
  if (parsed.metadata.approvedAt) {
    parsed.metadata.approvedAt = new Date(parsed.metadata.approvedAt);
  }

  parsed.changelog.forEach((entry: any) => {
    entry.date = new Date(entry.date);
  });

  parsed.testCases.forEach((test: any) => {
    if (test.lastRun) {
      test.lastRun = new Date(test.lastRun);
    }
  });

  return parsed as VersionedArtifact;
}
