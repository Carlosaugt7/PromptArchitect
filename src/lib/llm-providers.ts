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
  { id: "deepseek",   name: "DeepSeek",       defaultBaseUrl: "https://api.deepseek.com/v1",                helpUrl: "https://platform.deepseek.com/api_keys",  keyPlaceholder: "sk-..." },
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
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as ProvidersState;
    // Migração: DeepSeek precisa de /v1 no baseUrl (OpenAI-compatível).
    if (state.deepseek && /^https:\/\/api\.deepseek\.com\/?$/.test(state.deepseek.baseUrl)) {
      state.deepseek.baseUrl = "https://api.deepseek.com/v1";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    return state;
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

export interface ChatUsage { prompt: number; completion: number; total: number }
export interface ChatResult { text: string; usage: ChatUsage }

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export interface WireMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
}

/** Envia uma mensagem ao provedor selecionado e devolve texto + uso real de tokens. */
export async function sendChat(
  selection: ModelSelection,
  messages: WireMessage[],
  system?: string,
): Promise<ChatResult> {
  const state = loadProviders();
  const saved = state[selection.provider];
  if (!saved?.apiKey) throw new Error("Configure o provedor em Configurações → LLM");
  const res = await fetch("/api/llm-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: selection.provider, apiKey: saved.apiKey, baseUrl: saved.baseUrl,
      model: selection.model, system, messages,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ChatResult> & { error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return { text: data.text ?? "", usage: data.usage ?? { prompt: 0, completion: 0, total: 0 } };
}

/** Versão streaming. Suporta AbortSignal para cancelamento. */
export async function sendChatStream(
  selection: ModelSelection,
  messages: WireMessage[],
  onDelta: (chunk: string) => void,
  opts: { system?: string; signal?: AbortSignal } = {},
): Promise<ChatResult> {
  const state = loadProviders();
  const saved = state[selection.provider];
  if (!saved?.apiKey) throw new Error("Configure o provedor em Configurações → LLM");
  const res = await fetch("/api/llm-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({
      provider: selection.provider, apiKey: saved.apiKey, baseUrl: saved.baseUrl,
      model: selection.model, system: opts.system, messages, stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `${res.status} ${res.statusText}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  let usage: ChatUsage = { prompt: 0, completion: 0, total: 0 };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        const j = JSON.parse(line) as { delta?: string; usage?: ChatUsage; error?: string };
        if (j.error) throw new Error(j.error);
        if (j.delta) { text += j.delta; onDelta(j.delta); }
        if (j.usage) usage = j.usage;
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return { text, usage };
    throw e;
  }
  return { text, usage };
}



