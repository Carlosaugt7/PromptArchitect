// Contador local de tokens consumidos pelas LLMs. Como cada provider tem seu
// próprio formato de "usage", chamamos addTokens(provider, usage) após cada
// resposta. Persistido em localStorage por período (mês corrente).

export interface TokenBudget {
  /** limite mensal configurado pelo usuário (0 = sem limite) */
  monthlyLimit: number;
  /** tokens consumidos no período atual */
  used: number;
  /** custo acumulado em USD no período atual */
  costUsd: number;
  /** ISO yyyy-mm do período corrente */
  period: string;
  updatedAt: number;
}

const KEY = "omniforge.tokens.usage";
const EVENT = "omniforge:tokens-changed";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function loadTokens(): TokenBudget {
  const fallback: TokenBudget = {
    monthlyLimit: 1_000_000,
    used: 0,
    costUsd: 0,
    period: currentPeriod(),
    updatedAt: 0,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<TokenBudget>;
    if (data.period !== currentPeriod()) {
      return { ...fallback, monthlyLimit: data.monthlyLimit ?? fallback.monthlyLimit };
    }
    return { ...fallback, ...data };
  } catch {
    return fallback;
  }
}

function persist(b: TokenBudget) {
  localStorage.setItem(KEY, JSON.stringify(b));
  window.dispatchEvent(new Event(EVENT));
}

export function addTokens(amount: number, costUsd = 0) {
  if (!amount || amount < 0) return;
  const b = loadTokens();
  persist({
    ...b,
    used: b.used + Math.round(amount),
    costUsd: b.costUsd + Math.max(0, costUsd),
    updatedAt: Date.now(),
  });
}

export function setMonthlyLimit(limit: number) {
  const b = loadTokens();
  persist({ ...b, monthlyLimit: Math.max(0, Math.round(limit)) });
}

export function resetTokens() {
  persist({ ...loadTokens(), used: 0, costUsd: 0, updatedAt: Date.now() });
}

export function subscribeTokens(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
