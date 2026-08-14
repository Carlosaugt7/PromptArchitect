// Plugin Registry — Registro e instalação de plugins do marketplace.
// Persistência client-side via localStorage; eventos para sincronizar a UI.

import type { PluginCategory, PluginManifest, PluginRating, PluginRatingSummary } from "./types";

const PLUGINS_KEY = "promptarchitect.marketplace.plugins";
const RATINGS_KEY = "promptarchitect.marketplace.ratings";
const MARKETPLACE_EVENT = "promptarchitect:marketplace-changed";

/** Plugins oficiais disponíveis no registry (somente manifesto, sem arquivos). */
export const PLUGIN_REGISTRY_BUILTINS: PluginManifest[] = [
  {
    id: "prompt-doctor",
    name: "Prompt Doctor",
    description: "Analisa e otimiza prompts existentes com técnicas de clareza, compressão e structured outputs.",
    version: "1.2.0",
    author: "PromptArchitect",
    category: "prompting",
    tags: ["otimização", "clareza", "structured-output"],
    homepage: "https://example.com/prompt-doctor",
    icon: "🧑‍⚕️",
    enabled: false,
  },
  {
    id: "mcp-github-server",
    name: "MCP GitHub Server",
    description: "Conecta o chat a repositórios GitHub via MCP para ler issues, PRs e arquivos.",
    version: "0.9.1",
    author: "PromptArchitect",
    category: "mcp",
    tags: ["github", "mcp", "integração"],
    homepage: "https://example.com/mcp-github",
    icon: "🐙",
    requires: ["github-token"],
    enabled: false,
  },
  {
    id: "code-review-agent",
    name: "Agente de Code Review",
    description: "Agente especialista em revisão de código com checklist de qualidade, segurança e performance.",
    version: "2.0.0",
    author: "PromptArchitect",
    category: "agents",
    tags: ["code-review", "qualidade", "segurança"],
    icon: "🔍",
    enabled: false,
  },
  {
    id: "secure-deploy-workflow",
    name: "Workflow de Deploy Seguro",
    description: "Workflow passo a passo com gates de aprovação, rollback e observabilidade pós-deploy.",
    version: "1.0.0",
    author: "PromptArchitect",
    category: "workflows",
    tags: ["deploy", "ci-cd", "rollback"],
    icon: "🚀",
    enabled: false,
  },
  {
    id: "slack-integration",
    name: "Integração Slack",
    description: "Publica resumos de conversas e alertas diretamente em canais do Slack.",
    version: "1.3.0",
    author: "PromptArchitect",
    category: "integrations",
    tags: ["slack", "notificações"],
    homepage: "https://example.com/slack",
    icon: "💬",
    requires: ["slack-webhook"],
    enabled: false,
  },
  {
    id: "dark-pro-theme",
    name: "Tema Dark Pro",
    description: "Tema escuro premium com contraste otimizado e paleta corporativa.",
    version: "1.1.0",
    author: "PromptArchitect",
    category: "themes",
    tags: ["tema", "dark", "ui"],
    icon: "🌙",
    enabled: false,
  },
  {
    id: "legal-skills-pack",
    name: "Pacote de Skills Jurídicas",
    description: "Skills prontas para revisão de contratos, LGPD e documentos administrativos.",
    version: "1.0.0",
    author: "PromptArchitect",
    category: "skills",
    tags: ["jurídico", "contratos", "lgpd"],
    icon: "⚖️",
    enabled: false,
  },
  {
    id: "productivity-kit",
    name: "Kit Produtividade",
    description: "Conjunto de skills para resumos, atas, listas de tarefas e priorização.",
    version: "1.4.0",
    author: "PromptArchitect",
    category: "productivity",
    tags: ["produtividade", "resumos", "atas"],
    icon: "✅",
    enabled: false,
  },
];

/** Carrega os plugins instalados do localStorage. */
function loadInstalled(): PluginManifest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PLUGINS_KEY) ?? "[]") as PluginManifest[];
  } catch {
    return [];
  }
}

/** Persiste os plugins instalados e notifica os ouvintes. */
function persistInstalled(plugins: PluginManifest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
  window.dispatchEvent(new Event(MARKETPLACE_EVENT));
}

/** Carrega as avaliações do localStorage. */
function loadRatings(): PluginRating[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? "[]") as PluginRating[];
  } catch {
    return [];
  }
}

/** Persiste as avaliações e notifica os ouvintes. */
function persistRatings(ratings: PluginRating[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  window.dispatchEvent(new Event(MARKETPLACE_EVENT));
}

/** Copia um manifesto evitando referências compartilhadas. */
function cloneManifest(m: PluginManifest): PluginManifest {
  return {
    ...m,
    tags: [...m.tags],
    requires: m.requires ? [...m.requires] : undefined,
  };
}

/** Retorna a lista de plugins do registry. */
export function getRegistryPlugins(): PluginManifest[] {
  return PLUGIN_REGISTRY_BUILTINS.map(cloneManifest);
}

/** Busca plugins no registry por nome, descrição, tags ou categoria. */
export function searchRegistryPlugins(query: string): PluginManifest[] {
  const q = query.toLowerCase().trim();
  if (!q) return getRegistryPlugins();
  return PLUGIN_REGISTRY_BUILTINS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)),
  ).map(cloneManifest);
}

/** Retorna um plugin do registry pelo id. */
export function getRegistryPlugin(id: string): PluginManifest | null {
  const found = PLUGIN_REGISTRY_BUILTINS.find((p) => p.id === id);
  return found ? cloneManifest(found) : null;
}

/** Lista os plugins instalados. */
export function listInstalledPlugins(): PluginManifest[] {
  return loadInstalled().map(cloneManifest);
}

/** Retorna um plugin instalado pelo id. */
export function getInstalledPlugin(id: string): PluginManifest | null {
  const found = loadInstalled().find((p) => p.id === id);
  return found ? cloneManifest(found) : null;
}

/** Instala um plugin do registry (copia o manifesto para a lista instalada). */
export function installPlugin(pluginId: string): PluginManifest | null {
  const manifest = getRegistryPlugin(pluginId);
  if (!manifest) return null;
  const installed = loadInstalled();
  const existing = installed.find((p) => p.id === pluginId);
  if (existing) {
    existing.enabled = true;
    existing.installedAt = existing.installedAt ?? Date.now();
    persistInstalled(installed);
    return cloneManifest(existing);
  }
  const copy = cloneManifest(manifest);
  copy.enabled = true;
  copy.installedAt = Date.now();
  installed.push(copy);
  persistInstalled(installed);
  return cloneManifest(copy);
}

/** Desinstala um plugin. Retorna true se foi removido. */
export function uninstallPlugin(pluginId: string): boolean {
  const installed = loadInstalled();
  const filtered = installed.filter((p) => p.id !== pluginId);
  if (filtered.length === installed.length) return false;
  persistInstalled(filtered);
  return true;
}

/** Ativa/desativa um plugin instalado. Retorna true se encontrado. */
export function togglePlugin(pluginId: string, enabled: boolean): boolean {
  const installed = loadInstalled();
  const plugin = installed.find((p) => p.id === pluginId);
  if (!plugin) return false;
  plugin.enabled = enabled;
  persistInstalled(installed);
  return true;
}

/** Registra (ou atualiza) a avaliação de um usuário e retorna a média do plugin. */
export function ratePlugin(
  pluginId: string,
  userId: string,
  rating: number,
  comment?: string,
): number {
  const clamped = Math.min(5, Math.max(0, rating));
  const ratings = loadRatings();
  const existing = ratings.find((r) => r.pluginId === pluginId && r.userId === userId);
  if (existing) {
    existing.rating = clamped;
    if (comment !== undefined) existing.comment = comment;
    existing.createdAt = Date.now();
  } else {
    ratings.push({ pluginId, userId, rating: clamped, comment, createdAt: Date.now() });
  }
  persistRatings(ratings);
  return getPluginRating(pluginId).average;
}

/** Retorna a média e a contagem de avaliações de um plugin. */
export function getPluginRating(pluginId: string): PluginRatingSummary {
  const ratings = loadRatings().filter((r) => r.pluginId === pluginId);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / ratings.length, count: ratings.length };
}

/** Assina mudanças no marketplace (evento próprio + storage cross-tab). */
export function subscribeMarketplace(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(MARKETPLACE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(MARKETPLACE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}


