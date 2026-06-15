// Estimativa local (sem rede) de tokens e custo para mostrar antes do envio.
import { priceFor } from "./llm-pricing";

/** Aproximação grosseira: ~4 chars/token (média latim+pt-BR). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimatePromptCostUsd(
  model: string,
  promptTokens: number,
  expectedCompletion = 400,
): number {
  const p = priceFor(model);
  if (!p) return 0;
  return (promptTokens / 1_000_000) * p.in + (expectedCompletion / 1_000_000) * p.out;
}
