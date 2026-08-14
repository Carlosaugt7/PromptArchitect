// Prompt Security Analyzer — Análise de segurança para prompts de IA
// Detecta injeção, PII, viés, toxicidade e padrões de jailbreak.

import { safeUUID } from "../utils";

export interface SecurityIssue {
  id: string;
  type:
    | "injection"
    | "pii"
    | "bias"
    | "toxicity"
    | "jailbreak"
    | "encoding_trick"
    | "role_escape";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  snippet: string;
  position: { start: number; end: number };
}

export interface SecurityReport {
  id: string;
  score: number; // 0-100, quanto maior mais seguro
  issues: SecurityIssue[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  scannedAt: number;
  promptPreview: string;
}

// ---- Padrões de Detecção ----

const INJECTION_PATTERNS: { pattern: RegExp; type: SecurityIssue["type"]; description: string }[] = [
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|directives?|commands?)/gi,
    type: "injection",
    description: "Tentativa de ignorar instruções anteriores (injeção direta)",
  },
  {
    pattern: /you\s+are\s+(now|no\s+longer)\s+a\s+/gi,
    type: "injection",
    description: "Tentativa de redefinir o papel do assistente",
  },
  {
    pattern: /pretend\s+(you\s+are|to\s+be)\s/gi,
    type: "injection",
    description: "Instrução para fingir ser outra entidade",
  },
  {
    pattern: /do\s+not\s+follow\s+(your\s+)?(instructions?|guidelines?|rules?)/gi,
    type: "injection",
    description: "Instrução para desobedecer regras do sistema",
  },
  {
    pattern: /system\s*prompt\s*(:|=|is|was)/gi,
    type: "injection",
    description: "Tentativa de revelar system prompt",
  },
  {
    pattern: /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
    type: "injection",
    description: "Solicitação de revelação de prompt interno",
  },
];

const JAILBREAK_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /\bDAN\b.*\b(do\s+anything\s+now|mode\s+enabled)\b/gi,
    description: "Padrão DAN (Do Anything Now) detectado",
  },
  {
    pattern: /developer\s*mode\s*(activated|enabled|on)/gi,
    description: "Tentativa de ativar Developer Mode",
  },
  {
    pattern: /jailbreak\s*(prompt|mode|attack)/gi,
    description: "Referência explícita a jailbreak",
  },
  {
    pattern: /you\s+have\s+no\s+(restrictions?|limitations?|rules?|ethics?)/gi,
    description: "Tentativa de remover restrições éticas",
  },
  {
    pattern: /bypass\s+(your\s+)?(filter|safety|guidelines?|restrictions?)/gi,
    description: "Tentativa de bypass de filtros de segurança",
  },
];

const ENCODING_TRICK_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /base64\s*(decode|encode)/gi,
    description: "Uso de Base64 para ofuscar instruções",
  },
  {
    pattern: /rot13|caesar\s*cipher/gi,
    description: "Uso de cifra para ofuscar conteúdo",
  },
  {
    pattern: /\\u[0-9a-fA-F]{4}/g,
    description: "Uso de escape Unicode para ofuscar palavras",
  },
  {
    pattern: /&#x?[0-9a-fA-F]+;/g,
    description: "Uso de HTML entities para ofuscar conteúdo",
  },
];

const PII_PATTERNS: { pattern: RegExp; type: string; description: string }[] = [
  {
    pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    type: "CPF",
    description: "CPF detectado no prompt",
  },
  {
    pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    type: "CNPJ",
    description: "CNPJ detectado no prompt",
  },
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    type: "Email",
    description: "Endereço de e-mail detectado",
  },
  {
    pattern: /\b(?:\+\d{1,3}[- ]?)?\(?\d{2,3}\)?[- ]?\d{4,5}[- ]?\d{4}\b/g,
    type: "Telefone",
    description: "Número de telefone detectado",
  },
  {
    pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    type: "Cartão",
    description: "Possível número de cartão de crédito",
  },
];

const BIAS_KEYWORDS: { words: string[]; description: string }[] = [
  {
    words: ["sempre", "nunca", "todos", "nenhum", "jamais"],
    description: "Linguagem absolutista pode indicar viés de generalização",
  },
  {
    words: ["obviamente", "claramente", "naturalmente", "lógico que"],
    description: "Pressuposições não fundamentadas",
  },
  {
    words: ["homem", "mulher", "homens", "mulheres"],
    description: "Potencial viés de gênero — verificar contexto",
  },
];

const TOXICITY_PATTERNS: { pattern: RegExp; weight: number; category: string }[] = [
  { pattern: /\b(idiota|imbecil|estúpido|burro|retardado)\b/gi, weight: 2, category: "Insulto" },
  { pattern: /\b(maldito|desgraçado|miserável)\b/gi, weight: 2, category: "Ofensa" },
  { pattern: /\b(odeio|detesto|abomino)\b/gi, weight: 1, category: "Discurso de ódio" },
  { pattern: /\b(matar|matar-se|suicídio|suicida)\b/gi, weight: 3, category: "Violência" },
  { pattern: /\b(discriminação|discriminar|racista|machista|homofóbico)\b/gi, weight: 3, category: "Discriminação" },
];

// ---- Funções de Detecção ----

function findMatches(
  text: string,
  patterns: { pattern: RegExp; description: string }[],
  type: SecurityIssue["type"],
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const { pattern, description } of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex = regex.lastIndex + 1; // previne loop infinito em regex zero-width
      }
      issues.push({
        id: safeUUID().slice(0, 8),
        type,
        severity: type === "injection" || type === "jailbreak" ? "critical" : "high",
        description,
        snippet: match[0],
        position: { start: match.index, end: match.index + match[0].length },
      });
      if (issues.length >= 50) return issues; // limite para performance
    }
  }
  return issues;
}

function detectInjection(text: string): SecurityIssue[] {
  return findMatches(text, INJECTION_PATTERNS, "injection");
}

function detectJailbreak(text: string): SecurityIssue[] {
  return findMatches(text, JAILBREAK_PATTERNS, "jailbreak");
}

function detectEncodingTricks(text: string): SecurityIssue[] {
  return findMatches(text, ENCODING_TRICK_PATTERNS, "encoding_trick");
}

function detectPII(text: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const { pattern, type, description } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex = regex.lastIndex + 1;
      }
      issues.push({
        id: safeUUID().slice(0, 8),
        type: "pii",
        severity: type === "Cartão" ? "critical" : type === "CPF" ? "high" : "medium",
        description: `${description} (${type})`,
        snippet: maskPII(match[0], type),
        position: { start: match.index, end: match.index + match[0].length },
      });
      if (issues.length >= 50) return issues;
    }
  }
  return issues;
}

function maskPII(value: string, type: string): string {
  if (type === "CPF") return "***." + value.slice(4, 7) + ".***-**";
  if (type === "Email") {
    const [local, domain] = value.split("@");
    return (local ? local[0] + "***" : "***") + "@" + (domain || "***");
  }
  if (type === "Telefone") return value.replace(/\d/g, "*").replace(/\*{3,}$/, "***");
  if (type === "Cartão") return "****-****-****-" + value.slice(-4);
  if (value.length > 4) return value[0] + "***" + value.slice(-1);
  return "***";
}

function detectBias(text: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lower = text.toLowerCase();
  for (const { words, description } of BIAS_KEYWORDS) {
    for (const word of words) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(lower)) !== null) {
        if (match.index === regex.lastIndex) {
          regex.lastIndex = regex.lastIndex + 1;
        }
        issues.push({
          id: safeUUID().slice(0, 8),
          type: "bias",
          severity: "low",
          description: `${description}: "${match[0]}"`,
          snippet: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
        if (issues.length >= 50) return issues;
      }
    }
  }
  return issues;
}

function detectToxicity(text: string): { issues: SecurityIssue[]; score: number } {
  const issues: SecurityIssue[] = [];
  let totalWeight = 0;
  for (const { pattern, weight, category } of TOXICITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      totalWeight += weight * matches.length;
      for (const m of matches) {
        issues.push({
          id: safeUUID().slice(0, 8),
          type: "toxicity",
          severity: weight >= 3 ? "high" : weight >= 2 ? "medium" : "low",
          description: `${category}: "${m}"`,
          snippet: m,
          position: { start: text.indexOf(m), end: text.indexOf(m) + m.length },
        });
      }
    }
  }
  // Score de toxicidade: 0 = sem toxicidade, 1 = máxima
  const score = Math.min(1, totalWeight / 15);
  return { issues, score: 1 - score };
}

// ---- Funções Principais ----

export function scanPrompt(prompt: string): SecurityReport {
  const text = prompt.trim();
  if (!text) {
    return {
      id: safeUUID(),
      score: 100,
      issues: [],
      riskLevel: "low",
      recommendations: [],
      scannedAt: Date.now(),
      promptPreview: "",
    };
  }

  const injectionIssues = detectInjection(text);
  const jailbreakIssues = detectJailbreak(text);
  const encodingIssues = detectEncodingTricks(text);
  const piiIssues = detectPII(text);
  const biasIssues = detectBias(text);
  const { issues: toxicityIssues, score: toxicityScore } = detectToxicity(text);

  const allIssues = [
    ...injectionIssues,
    ...jailbreakIssues,
    ...encodingIssues,
    ...piiIssues,
    ...biasIssues,
    ...toxicityIssues,
  ];

  // Calcular score de segurança (0-100)
  const hasCritical = allIssues.some((i) => i.severity === "critical");
  const hasHigh = allIssues.some((i) => i.severity === "high");
  const hasMedium = allIssues.some((i) => i.severity === "medium");

  let baseScore = 100;
  baseScore -= allIssues.filter((i) => i.severity === "critical").length * 25;
  baseScore -= allIssues.filter((i) => i.severity === "high").length * 10;
  baseScore -= allIssues.filter((i) => i.severity === "medium").length * 5;
  baseScore -= allIssues.filter((i) => i.severity === "low").length * 2;

  // Fator de toxicidade
  baseScore = baseScore * (0.3 + 0.7 * toxicityScore);

  const score = Math.max(0, Math.min(100, Math.round(baseScore)));

  let riskLevel: SecurityReport["riskLevel"] = "low";
  if (hasCritical || score < 30) riskLevel = "critical";
  else if (hasHigh || score < 60) riskLevel = "high";
  else if (hasMedium || score < 85) riskLevel = "medium";

  // Gerar recomendações
  const recommendations: string[] = [];
  if (injectionIssues.length > 0) {
    recommendations.push(
      "Remova instruções que tentem subverter o comportamento do assistente (injeção de prompt detectada).",
    );
  }
  if (jailbreakIssues.length > 0) {
    recommendations.push(
      "Elimine padrões de jailbreak que buscam contornar restrições de segurança do modelo.",
    );
  }
  if (encodingIssues.length > 0) {
    recommendations.push(
      "Evite codificações ofuscadas (Base64, Unicode escapes, HTML entities) — use texto claro.",
    );
  }
  if (piiIssues.length > 0) {
    recommendations.push(
      "Remova dados pessoais (CPF, e-mail, telefone, cartão) do prompt. Use placeholders anonimizados.",
    );
  }
  if (biasIssues.length > 0) {
    recommendations.push(
      "Revise linguagem absolutista e pressuposições que possam introduzir viés no output.",
    );
  }
  if (toxicityIssues.length > 0) {
    recommendations.push(
      "Remova linguagem ofensiva, insultos ou conteúdo violento do prompt.",
    );
  }
  if (allIssues.length === 0) {
    recommendations.push("Nenhum problema de segurança detectado. O prompt parece seguro.");
  }

  return {
    id: safeUUID(),
    score,
    issues: allIssues,
    riskLevel,
    recommendations,
    scannedAt: Date.now(),
    promptPreview: text.length > 120 ? text.slice(0, 117) + "..." : text,
  };
}

export function isPromptSafe(prompt: string): boolean {
  const report = scanPrompt(prompt);
  return report.riskLevel === "low" && report.score >= 85;
}

// ---- Histórico de scans ----

const SCAN_HISTORY_KEY = "omniforge.prompt-security.history";

export function getScanHistory(): SecurityReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) ?? "[]") as SecurityReport[];
  } catch {
    return [];
  }
}

export function saveScanReport(report: SecurityReport): void {
  if (typeof window === "undefined") return;
  const history = getScanHistory().filter((h) => h.id !== report.id);
  history.unshift(report);
  localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function clearScanHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SCAN_HISTORY_KEY);
}
