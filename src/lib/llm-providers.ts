// Configuração e detecção de modelos para provedores de LLM (client-side).
// Todas as chamadas são feitas direto do browser; chaves ficam em localStorage.

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "openrouter"
  | "custom";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  defaultBaseUrl: string;
  needsBaseUrl?: boolean;
  helpUrl: string;
  keyPlaceholder: string;
}

export const PROVIDERS: ProviderConfig[] = [
  { id: "openai",     name: "OpenAI",         defaultBaseUrl: "https://api.openai.com/v1",                  helpUrl: "https://platform.openai.com/api-keys",    keyPlaceholder: "sk-..." },
  { id: "anthropic",  name: "Anthropic",      defaultBaseUrl: "https://api.anthropic.com/v1",               helpUrl: "https://console.anthropic.com/settings/keys", keyPlaceholder: "sk-ant-..." },
  { id: "google",     name: "Google Gemini",  defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", helpUrl: "https://aistudio.google.com/apikey",  keyPlaceholder: "AIza..." },
  { id: "deepseek",   name: "DeepSeek",       defaultBaseUrl: "https://api.deepseek.com",                   helpUrl: "https://platform.deepseek.com/api_keys",  keyPlaceholder: "sk-..." },
  { id: "openrouter", name: "OpenRouter",     defaultBaseUrl: "https://openrouter.ai/api/v1",               helpUrl: "https://openrouter.ai/keys",              keyPlaceholder: "sk-or-..." },
  { id: "custom",     name: "Personalizado",  defaultBaseUrl: "",                  needsBaseUrl: true,      helpUrl: "",                                        keyPlaceholder: "sua-chave" },
];

export interface SavedProvider {
  apiKey: string;
  baseUrl: string;
  models: string[];
  /** modelos marcados pelo usuário para aparecer no seletor da tela de dev */
  enabled?: string[];
  updatedAt: number;
}

export type ProvidersState = Partial<Record<ProviderId, SavedProvider>>;

const STORAGE_KEY = "omniforge.llm.providers";
const SELECTION_KEY = "omniforge.llm.selection";

export interface ModelSelection { provider: ProviderId; model: string; }

export function loadProviders(): ProvidersState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as ProvidersState;
  } catch {
    return {};
  }
}

export function saveProviders(state: ProvidersState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSelection(): ModelSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    return raw ? (JSON.parse(raw) as ModelSelection) : null;
  } catch { return null; }
}

export function saveSelection(sel: ModelSelection | null) {
  if (!sel) localStorage.removeItem(SELECTION_KEY);
  else localStorage.setItem(SELECTION_KEY, JSON.stringify(sel));
}

/** Retorna todos os pares (provider, model) habilitados pelo usuário. */
export function listEnabledModels(state: ProvidersState = loadProviders()): ModelSelection[] {
  const out: ModelSelection[] = [];
  for (const p of PROVIDERS) {
    const saved = state[p.id];
    if (!saved?.apiKey) continue;
    const enabled = saved.enabled?.length ? saved.enabled : saved.models;
    for (const m of enabled) out.push({ provider: p.id, model: m });
  }
  return out;
}

/* ---------------- Discovery ---------------- */
// Chama um proxy server-side para evitar problemas de CORS com endpoints
// que não liberam o navegador (custom URLs, DeepSeek, OpenRouter, etc.).

export async function fetchModels(
  provider: ProviderId,
  apiKey: string,
  baseUrl: string,
): Promise<string[]> {
  const res = await fetch("/api/llm-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey, baseUrl }),
  });
  const data = (await res.json().catch(() => ({}))) as { models?: string[]; error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  }
  return data.models ?? [];
}

