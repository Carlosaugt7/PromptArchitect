/**
 * PromptArchitect v5.0 — Compliance Automation (LGPD/GDPR)
 * Detecção de dados pessoais (PII), sanitização e rastreamento de direitos LGPD.
 * Padrões brasileiros: CPF, CNPJ, telefone, email, cartão de crédito.
 */

export type PiiType = "cpf" | "cnpj" | "email" | "phone" | "credit_card" | "cep" | "rg";

export interface PiiMatch {
  type: PiiType;
  value: string;
  index: number;
  length: number;
  masked: string;
}

export type SensitivityLevel = "public" | "internal" | "confidential" | "restricted";

export interface LgpdRequest {
  id: string;
  type: "access" | "deletion" | "correction" | "portability";
  userId: string;
  email: string;
  status: "pending" | "processing" | "completed" | "denied";
  createdAt: number;
  resolvedAt: number | null;
  notes: string;
}

// ─── Padrões de PII para contexto brasileiro ───

const PII_PATTERNS: { type: PiiType; pattern: RegExp; mask: (v: string) => string }[] = [
  {
    // CPF: 000.000.000-00 ou 00000000000
    type: "cpf",
    pattern: /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g,
    mask: (v) => `***.${v.slice(-4, -2)}${v.slice(-2)}-**`,
  },
  {
    // CNPJ: 00.000.000/0000-00 ou 00000000000000
    type: "cnpj",
    pattern: /\b\d{2}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-/]?\d{4}[.\s-]?\d{2}\b/g,
    mask: () => "**.***.***/****-**",
  },
  {
    // Email
    type: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    mask: (v) => {
      const [local, domain] = v.split("@");
      const maskedLocal = local.length > 3
        ? local[0] + "***" + local.slice(-1)
        : "***";
      return `${maskedLocal}@${domain}`;
    },
  },
  {
    // Telefone brasileiro: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX ou XXXXXXXXXX/XXXXXXXXXXX
    type: "phone",
    pattern: /\(?\d{2}\)?\s?[.\s-]?\d{4,5}[.\s-]?\d{4}\b/g,
    mask: (v) => {
      const digits = v.replace(/\D/g, "");
      if (digits.length >= 11) return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
      if (digits.length >= 10) return `(${digits.slice(0, 2)}) ****-${digits.slice(-4)}`;
      return "***";
    },
  },
  {
    // Cartão de crédito: 4111 1111 1111 1111 (16 dígitos com ou sem separadores)
    type: "credit_card",
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    mask: (v) => {
      const digits = v.replace(/\D/g, "");
      if (digits.length >= 13 && digits.length <= 19) {
        // Verificar se parece cartão (algoritmo de Luhn para filtrar falso-positivos)
        if (luhnCheck(digits)) {
          return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
        }
      }
      return v;
    },
  },
  {
    // CEP: 00000-000 ou 00000000
    type: "cep",
    pattern: /\b\d{5}[.\s-]?\d{3}\b/g,
    mask: () => "*****-***",
  },
  {
    // RG: XX.XXX.XXX-X (padrão comum)
    type: "rg",
    pattern: /\b\d{1,2}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?[\dxX]\b/g,
    mask: () => "**.***.***-*",
  },
];

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ─── Detecção de PII ───

export function detectPII(text: string): PiiMatch[] {
  if (!text) return [];

  const matches: PiiMatch[] = [];

  for (const { type, pattern, mask } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];

      // Evitar duplicatas na mesma posição
      const alreadyExists = matches.some(
        (m) => m.index === match!.index && m.length === value.length,
      );
      if (alreadyExists) continue;

      // Filtrar falsos positivos do cartão de crédito
      if (type === "credit_card") {
        const masked = mask(value);
        if (masked === value) continue; // Não passou no Luhn
        matches.push({
          type,
          value,
          index: match.index,
          length: value.length,
          masked,
        });
      } else {
        matches.push({
          type,
          value,
          index: match.index,
          length: value.length,
          masked: mask(value),
        });
      }
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

export function sanitizePII(text: string): string {
  if (!text) return text;

  const matches = detectPII(text);
  // Substituir do final para o início para preservar índices
  let sanitized = text;
  const sorted = [...matches].sort((a, b) => b.index - a.index);

  for (const match of sorted) {
    sanitized =
      sanitized.substring(0, match.index) +
      `[${match.type.toUpperCase()}]` +
      sanitized.substring(match.index + match.length);
  }

  return sanitized;
}

export function maskPII(text: string): string {
  if (!text) return text;

  const matches = detectPII(text);
  let masked = text;
  const sorted = [...matches].sort((a, b) => b.index - a.index);

  for (const match of sorted) {
    masked =
      masked.substring(0, match.index) +
      match.masked +
      masked.substring(match.index + match.length);
  }

  return masked;
}

// ─── Classificação de sensibilidade ───

const SENSITIVITY_KEYWORDS: Record<SensitivityLevel, RegExp[]> = {
  restricted: [
    /\b(senha|password|token|segredo|secret|credencial|credential)\b/i,
    /\b(cart.o\s*(de\s*)?cr.dito|credit\s*card|cvv|cvc)\b/i,
    /\b(chave\s*(privada|pessoal)|private\s*key)\b/i,
    /\b(biometria|biometric|impress.o\s*digital|facial)\b/i,
  ],
  confidential: [
    /\b(CPF|CNPJ|RG|passaporte|passport)\b/i,
    /\b(sal.rio|salary|renda|income|financeiro|financial)\b/i,
    /\b(contrato|contract|acordo|agreement|NDA)\b/i,
    /\b(endere.o|address|telefone|phone|celular)\b/i,
    /\b(nome\s*(completo|da\s*m.e)|nome\s*(da\s*m.e|do\s*pai|da\s*filha))\b/i,
  ],
  internal: [
    /\b(interno|internal|backlog|roadmap|sprint)\b/i,
    /\b(dashboard|m.trica|metric|KPI|OKR)\b/i,
    /\b(reuni.o|meeting|ata|minutes)\b/i,
    /\b(estrat.gia|strategy|planejamento|planning)\b/i,
  ],
  public: [],
};

export function classifySensitivity(text: string): SensitivityLevel {
  if (!text) return "public";

  // Verificar primeiro se há PII detectável
  const piiMatches = detectPII(text);
  if (piiMatches.length > 0) return "confidential";

  // Verificar por palavras-chave em ordem decrescente de severidade
  for (const level of ["restricted", "confidential", "internal"] as SensitivityLevel[]) {
    for (const pattern of SENSITIVITY_KEYWORDS[level]) {
      if (pattern.test(text)) return level;
    }
  }

  return "public";
}

// ─── Rastreamento de direitos LGPD ───

const LGPD_STORAGE_KEY = "promptarchitect.lgpd.requests";
const LGPD_EVENT = "promptarchitect:lgpd-changed";

function loadLgpdRequests(): LgpdRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LGPD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLgpdRequests(requests: LgpdRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LGPD_STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event(LGPD_EVENT));
}

export function logAccessRequest(
  userId: string,
  email: string,
  notes: string = "",
): LgpdRequest {
  const requests = loadLgpdRequests();
  const newRequest: LgpdRequest = {
    id: crypto.randomUUID?.() ?? `lgpd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "access",
    userId,
    email,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
    notes,
  };
  requests.push(newRequest);
  persistLgpdRequests(requests);
  return newRequest;
}

export function logDeletionRequest(
  userId: string,
  email: string,
  notes: string = "",
): LgpdRequest {
  const requests = loadLgpdRequests();
  const newRequest: LgpdRequest = {
    id: crypto.randomUUID?.() ?? `lgpd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "deletion",
    userId,
    email,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
    notes,
  };
  requests.push(newRequest);
  persistLgpdRequests(requests);
  return newRequest;
}

export function logCorrectionRequest(
  userId: string,
  email: string,
  notes: string = "",
): LgpdRequest {
  const requests = loadLgpdRequests();
  const newRequest: LgpdRequest = {
    id: crypto.randomUUID?.() ?? `lgpd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "correction",
    userId,
    email,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
    notes,
  };
  requests.push(newRequest);
  persistLgpdRequests(requests);
  return newRequest;
}

export function logPortabilityRequest(
  userId: string,
  email: string,
  notes: string = "",
): LgpdRequest {
  const requests = loadLgpdRequests();
  const newRequest: LgpdRequest = {
    id: crypto.randomUUID?.() ?? `lgpd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "portability",
    userId,
    email,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
    notes,
  };
  requests.push(newRequest);
  persistLgpdRequests(requests);
  return newRequest;
}

export function resolveLgpdRequest(
  requestId: string,
  status: LgpdRequest["status"],
): LgpdRequest | null {
  const requests = loadLgpdRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) return null;
  requests[idx] = {
    ...requests[idx],
    status,
    resolvedAt: Date.now(),
  };
  persistLgpdRequests(requests);
  return requests[idx];
}

export function getLgpdRequests(
  filter?: { type?: LgpdRequest["type"]; status?: LgpdRequest["status"] },
): LgpdRequest[] {
  let requests = loadLgpdRequests();

  if (filter?.type) {
    requests = requests.filter((r) => r.type === filter.type);
  }
  if (filter?.status) {
    requests = requests.filter((r) => r.status === filter.status);
  }

  return requests.sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribeLgpdRequests(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(LGPD_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(LGPD_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// ─── Utilitários de exibição ───

export function getPiiTypeLabel(type: PiiType): string {
  const labels: Record<PiiType, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "E-mail",
    phone: "Telefone",
    credit_card: "Cartão de Crédito",
    cep: "CEP",
    rg: "RG",
  };
  return labels[type];
}

export function getSensitivityLabel(level: SensitivityLevel): string {
  const labels: Record<SensitivityLevel, string> = {
    public: "Público",
    internal: "Interno",
    confidential: "Confidencial",
    restricted: "Restrito",
  };
  return labels[level];
}

export function getSensitivityColor(level: SensitivityLevel): string {
  const colors: Record<SensitivityLevel, string> = {
    public: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    internal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    confidential: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    restricted: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[level];
}

export function getLgpdStatusLabel(status: LgpdRequest["status"]): string {
  const labels: Record<LgpdRequest["status"], string> = {
    pending: "Pendente",
    processing: "Em processamento",
    completed: "Concluído",
    denied: "Negado",
  };
  return labels[status];
}
