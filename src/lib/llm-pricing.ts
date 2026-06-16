// Tabela de preços (USD por 1M tokens) para estimar custo das chamadas.
// Valores aproximados em jun/2026 — edite conforme novos modelos.

export interface Price {
  in: number;
  out: number;
} // USD por 1M tokens

const TABLE: Record<string, Price> = {
  // OpenAI
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4.1": { in: 2, out: 8 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gpt-4.1-nano": { in: 0.1, out: 0.4 },
  "o3-mini": { in: 1.1, out: 4.4 },
  "o1-mini": { in: 1.1, out: 4.4 },
  // Anthropic
  "claude-3-5-sonnet": { in: 3, out: 15 },
  "claude-3-5-haiku": { in: 0.8, out: 4 },
  "claude-3-opus": { in: 15, out: 75 },
  "claude-sonnet-4": { in: 3, out: 15 },
  // Google
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-1.5-pro": { in: 1.25, out: 5 },
  "gemini-1.5-flash": { in: 0.075, out: 0.3 },
  // DeepSeek
  "deepseek-chat": { in: 0.27, out: 1.1 },
  "deepseek-reasoner": { in: 0.55, out: 2.19 },
};

/** Procura preço pelo nome do modelo (match por prefixo). */
export function priceFor(model: string): Price | null {
  const m = model.toLowerCase();
  for (const [k, v] of Object.entries(TABLE)) {
    if (m.includes(k)) return v;
  }
  return null;
}

export function estimateCostUsd(model: string, prompt: number, completion: number): number {
  const p = priceFor(model);
  if (!p) return 0;
  return (prompt / 1_000_000) * p.in + (completion / 1_000_000) * p.out;
}

export function formatUsd(n: number): string {
  if (n === 0) return "—";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}
