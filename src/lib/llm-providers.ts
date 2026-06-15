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
  updatedAt: number;
}

export type ProvidersState = Partial<Record<ProviderId, SavedProvider>>;

const STORAGE_KEY = "omniforge.llm.providers";

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

/* ---------------- Discovery ---------------- */

export async function fetchModels(
  provider: ProviderId,
  apiKey: string,
  baseUrl: string,
): Promise<string[]> {
  const url = baseUrl.replace(/\/$/, "");

  if (provider === "anthropic") {
    const res = await fetch(`${url}/models`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
    if (!res.ok) throw new Error(await readError(res));
    const json = (await res.json()) as { data: { id: string }[] };
    return json.data.map((m) => m.id).sort();
  }

  if (provider === "google") {
    const res = await fetch(`${url}/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) throw new Error(await readError(res));
    const json = (await res.json()) as { models: { name: string; supportedGenerationMethods?: string[] }[] };
    return json.models
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .sort();
  }

  // OpenAI-compatível: OpenAI, DeepSeek, OpenRouter, Custom
  const res = await fetch(`${url}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as { data: { id: string }[] };
  return json.data.map((m) => m.id).sort();
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return `${res.status} ${res.statusText}: ${text.slice(0, 200)}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
