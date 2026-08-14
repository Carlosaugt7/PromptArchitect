/**
 * PromptArchitect v5.0 — Cost Governor (Controlador de Custos)
 * Rastreamento de uso de tokens e custo com limites por tarefa, sessão e mês.
 * Integra-se com token-usage.ts e cost-estimate.ts existentes.
 * Alertas progressivos: 50% (aviso), 80% (atenção), 100% (bloqueio).
 */

import { estimateCostUsd, priceFor } from "../llm-pricing";
import { addTokens, loadTokens } from "../token-usage";

export type BudgetAlertLevel = "ok" | "warning" | "critical" | "blocked";

export interface BudgetStatus {
  level: BudgetAlertLevel;
  taskUsed: number;
  taskLimit: number;
  taskPercent: number;
  sessionUsed: number;
  sessionLimit: number;
  sessionPercent: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyPercent: number;
  message: string;
}

export interface CostGovernorConfig {
  taskLimitUsd: number;
  sessionLimitUsd: number;
  monthlyLimitUsd: number;
  sessionId: string;
}

const CONFIG_KEY = "promptarchitect.cost.config";
const SESSION_KEY_PREFIX = "promptarchitect.cost.session.";
const TASK_KEY_PREFIX = "promptarchitect.cost.task.";

const DEFAULT_TASK_LIMIT_USD = 0.5;
const DEFAULT_SESSION_LIMIT_USD = 5.0;
const DEFAULT_MONTHLY_LIMIT_USD = 50.0;

export function loadCostGovernorConfig(): CostGovernorConfig {
  const defaults: CostGovernorConfig = {
    taskLimitUsd: DEFAULT_TASK_LIMIT_USD,
    sessionLimitUsd: DEFAULT_SESSION_LIMIT_USD,
    monthlyLimitUsd: DEFAULT_MONTHLY_LIMIT_USD,
    sessionId: generateSessionId(),
  };

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      saveCostGovernorConfig(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return {
      taskLimitUsd: parsed.taskLimitUsd ?? DEFAULT_TASK_LIMIT_USD,
      sessionLimitUsd: parsed.sessionLimitUsd ?? DEFAULT_SESSION_LIMIT_USD,
      monthlyLimitUsd: parsed.monthlyLimitUsd ?? DEFAULT_MONTHLY_LIMIT_USD,
      sessionId: parsed.sessionId ?? generateSessionId(),
    };
  } catch {
    saveCostGovernorConfig(defaults);
    return defaults;
  }
}

export function saveCostGovernorConfig(config: Partial<CostGovernorConfig>): CostGovernorConfig {
  const current = loadCostGovernorConfig();
  const updated: CostGovernorConfig = {
    taskLimitUsd: config.taskLimitUsd ?? current.taskLimitUsd,
    sessionLimitUsd: config.sessionLimitUsd ?? current.sessionLimitUsd,
    monthlyLimitUsd: config.monthlyLimitUsd ?? current.monthlyLimitUsd,
    sessionId: config.sessionId ?? current.sessionId,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  }

  return updated;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function getSessionKey(): string {
  const config = loadCostGovernorConfig();
  return `${SESSION_KEY_PREFIX}${config.sessionId}`;
}

function getTaskKey(): string {
  return `${TASK_KEY_PREFIX}current`;
}

export function loadSessionCost(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseFloat(localStorage.getItem(getSessionKey()) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function persistSessionCost(cost: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSessionKey(), cost.toFixed(6));
}

export function loadTaskCost(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseFloat(localStorage.getItem(getTaskKey()) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function persistTaskCost(cost: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getTaskKey(), cost.toFixed(6));
}

export function loadMonthlyCost(): number {
  const budget = loadTokens();
  return budget.costUsd;
}

export function resetTaskCost(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getTaskKey());
}

export function resetSessionCost(): void {
  if (typeof window === "undefined") return;
  const config = loadCostGovernorConfig();
  // Armazenar a sessão anterior para histórico
  const sessionKey = getSessionKey();
  const currentCost = parseFloat(localStorage.getItem(sessionKey) ?? "0") || 0;
  if (currentCost > 0) {
    const historyKey = `promptarchitect.cost.history.${config.sessionId}`;
    localStorage.setItem(historyKey, currentCost.toFixed(6));
  }
  // Gerar nova sessão
  config.sessionId = generateSessionId();
  saveCostGovernorConfig(config);
  localStorage.removeItem(sessionKey);
}

export function checkBudget(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number = 800,
): BudgetStatus {
  const config = loadCostGovernorConfig();
  const estimatedCost = estimateCostUsd(model, estimatedInputTokens, estimatedOutputTokens);

  const taskUsed = loadTaskCost();
  const taskLimit = config.taskLimitUsd;
  const taskPercent = taskLimit > 0 ? (taskUsed / taskLimit) * 100 : 0;

  const sessionUsed = loadSessionCost();
  const sessionLimit = config.sessionLimitUsd;
  const sessionPercent = sessionLimit > 0 ? (sessionUsed / sessionLimit) * 100 : 0;

  const monthlyUsed = loadMonthlyCost();
  const monthlyLimit = config.monthlyLimitUsd;
  const monthlyPercent = monthlyLimit > 0 ? (monthlyUsed / monthlyLimit) * 100 : 0;

  // Determinar o nível agregado (pior caso entre os 3 limites)
  const maxPercent = Math.max(taskPercent, sessionPercent, monthlyPercent);

  let level: BudgetAlertLevel = "ok";
  let message = "Dentro do orçamento.";

  if (maxPercent >= 100) {
    level = "blocked";
    message = "Orçamento excedido. Solicitação bloqueada.";
  } else if (maxPercent >= 80) {
    level = "critical";
    message = "Atenção crítica: 80% do orçamento consumido.";
  } else if (maxPercent >= 50) {
    level = "warning";
    message = "Aviso: 50% do orçamento consumido.";
  }

  return {
    level,
    taskUsed,
    taskLimit,
    taskPercent,
    sessionUsed,
    sessionLimit,
    sessionPercent,
    monthlyUsed,
    monthlyLimit,
    monthlyPercent,
    message,
  };
}

export function recordUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
): BudgetStatus {
  const cost = estimateCostUsd(model, inputTokens, outputTokens);

  // Incrementar custo da tarefa atual
  const taskCost = loadTaskCost() + cost;
  persistTaskCost(taskCost);

  // Incrementar custo da sessão
  const sessionCost = loadSessionCost() + cost;
  persistSessionCost(sessionCost);

  // Incrementar no contador mensal (via token-usage.ts)
  addTokens(inputTokens + outputTokens, cost);

  // Retornar status pós-uso
  return checkBudget(model, 0, 0);
}

export function getAlertDescription(level: BudgetAlertLevel): string {
  const descriptions: Record<BudgetAlertLevel, string> = {
    ok: "Dentro dos limites de orçamento.",
    warning: "Consumo atingiu 50% do limite de orçamento.",
    critical: "Consumo atingiu 80% do limite de orçamento. Considere revisar o uso.",
    blocked: "Limite de orçamento excedido. Ações bloqueadas até o próximo ciclo.",
  };
  return descriptions[level];
}

export function formatBudgetAmount(usd: number): string {
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(3)}`;
}

export function getCostHistory(): { sessionId: string; cost: number; date: number }[] {
  if (typeof window === "undefined") return [];

  const history: { sessionId: string; cost: number; date: number }[] = [];
  const prefix = "promptarchitect.cost.history.";

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const sessionId = key.replace(prefix, "");
      const cost = parseFloat(localStorage.getItem(key) ?? "0") || 0;
      history.push({
        sessionId,
        cost,
        date: Date.now(),
      });
    }
  }

  // Incluir sessão atual se tiver custo
  const config = loadCostGovernorConfig();
  const currentCost = loadSessionCost();
  if (currentCost > 0) {
    history.push({
      sessionId: config.sessionId,
      cost: currentCost,
      date: Date.now(),
    });
  }

  return history.sort((a, b) => b.date - a.date).slice(0, 50);
}
