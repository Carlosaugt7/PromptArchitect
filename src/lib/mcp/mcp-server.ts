// Gerenciamento e registro de servidores MCP.
// Responsável pelo CRUD, importação/exportação de configuração e persistência
// client-side (localStorage) com notificação reativa.

import { safeUUID } from "@/lib/utils";
import type { McpServerCategory, McpServerDefinition } from "./types";

/** Chave usada no localStorage para persistir os servidores. */
const STORAGE_KEY = "promptarchitect.mcp.servers";

/** Nome do evento disparado quando a lista de servidores muda. */
export const MCP_CHANGED_EVENT = "promptarchitect:mcp-changed";

/** Carrega a lista de servidores persistida (retorna [] em caso de erro). */
function loadServers(): McpServerDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as McpServerDefinition[]) : [];
  } catch {
    return [];
  }
}

/** Persiste a lista e notifica os assinantes. */
function persistServers(servers: McpServerDefinition[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  window.dispatchEvent(new Event(MCP_CHANGED_EVENT));
}

/** Lista todos os servidores MCP registrados. */
export function listMcpServers(): McpServerDefinition[] {
  return loadServers();
}

/** Retorna um servidor pelo id (ou null se não existir). */
export function getMcpServer(id: string): McpServerDefinition | null {
  return loadServers().find((server) => server.id === id) ?? null;
}

/** Adiciona um novo servidor, gerando um id interno e retornando a definição criada. */
export function addMcpServer(def: Omit<McpServerDefinition, "id">): McpServerDefinition {
  const server: McpServerDefinition = { ...def, id: safeUUID() };
  persistServers([...loadServers(), server]);
  return server;
}

/** Atualiza parcialmente um servidor; retorna a definição atualizada (ou null). */
export function updateMcpServer(
  id: string,
  partial: Partial<Omit<McpServerDefinition, "id">>,
): McpServerDefinition | null {
  const servers = loadServers();
  const index = servers.findIndex((server) => server.id === id);
  if (index === -1) return null;
  const updated: McpServerDefinition = { ...servers[index], ...partial, id };
  servers[index] = updated;
  persistServers(servers);
  return updated;
}

/** Remove um servidor pelo id; retorna true se foi removido. */
export function removeMcpServer(id: string): boolean {
  const servers = loadServers();
  const filtered = servers.filter((server) => server.id !== id);
  if (filtered.length === servers.length) return false;
  persistServers(filtered);
  return true;
}

/** Habilita ou desabilita um servidor; retorna a definição atualizada (ou null). */
export function toggleMcpServer(id: string, enabled: boolean): McpServerDefinition | null {
  return updateMcpServer(id, { enabled });
}

/** Assina mudanças na lista (evento local + evento "storage"). */
export function subscribeMcpServers(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(MCP_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(MCP_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// ─── Importação/exportação do formato padrão { mcpServers: {...} } ───

/** Estrutura crua de uma entrada `mcpServers` em uma config JSON. */
interface RawMcpConfigEntry {
  command?: unknown;
  args?: unknown;
  url?: unknown;
  headers?: unknown;
}

/** Estrutura crua de uma config MCP padrão. */
interface RawMcpConfig {
  mcpServers?: Record<string, RawMcpConfigEntry>;
}

/** Palavras-chave usadas para inferir a categoria a partir do nome do servidor. */
const CATEGORY_KEYWORDS: Array<{ category: McpServerCategory; keywords: string[] }> = [
  { category: "filesystem", keywords: ["file", "fs", "arquivo", "filesystem"] },
  { category: "database", keywords: ["postgres", "mysql", "sql", "database", "db", "supabase", "neon", "mongodb", "redis"] },
  { category: "search", keywords: ["search", "busca", "brave", "tavily", "exa", "perplexity"] },
  { category: "browser", keywords: ["playwright", "puppeteer", "browser", "chrome", "navegador"] },
  { category: "memory", keywords: ["memory", "qdrant", "vector", "pinecone", "chroma"] },
  { category: "code", keywords: ["context7", "serena", "github", "git", "code", "shadcn", "npm", "sentry", "docs"] },
  { category: "productivity", keywords: ["calendar", "gmail", "slack", "notion", "linear", "todo", "jira"] },
  { category: "api", keywords: ["api", "rest", "graphql", "stripe"] },
];

/** Converte um nome em slug para uso como id. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "mcp-server";
}

/** Infere a categoria do servidor a partir do nome. */
function inferCategory(name: string): McpServerCategory {
  const lower = name.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) return entry.category;
  }
  return "custom";
}

/** Infere tags do servidor a partir do nome. */
function inferTags(name: string): string[] {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const words = normalized.split(/[\s-]+/).filter((word) => word.length > 2);
  return [...new Set(words)].slice(0, 5);
}

/** Garante que um valor desconhecido seja um array de strings. */
function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item): item is string => typeof item === "string");
  return result;
}

/** Verifica se um valor desconhecido é um mapa de strings. */
function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

/** Converte uma config JSON (string ou objeto) em uma lista de definições MCP. */
export function buildMcpServerFromConfig(raw: string | object): McpServerDefinition[] {
  let config: RawMcpConfig;
  if (typeof raw === "string") {
    try {
      config = JSON.parse(raw) as RawMcpConfig;
    } catch {
      return [];
    }
  } else {
    config = raw as RawMcpConfig;
  }

  const entries = config?.mcpServers;
  if (!entries || typeof entries !== "object") return [];

  const usedIds = new Set<string>();
  const result: McpServerDefinition[] = [];

  for (const [name, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== "object") continue;

    const baseId = slugify(name);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const url = typeof entry.url === "string" && entry.url.trim() !== "" ? entry.url : undefined;
    const command = typeof entry.command === "string" && entry.command.trim() !== "" ? entry.command : undefined;
    const headers = isStringRecord(entry.headers) ? entry.headers : undefined;

    result.push({
      id,
      name,
      description: `Servidor MCP "${name}" importado de configuração.`,
      version: "1.0.0",
      transport: url ? "streamable_http" : "stdio",
      command,
      args: asStringArray(entry.args),
      url,
      headers,
      tools: [],
      resources: [],
      prompts: [],
      enabled: true,
      tags: inferTags(name),
      author: "",
      category: inferCategory(name),
    });
  }

  return result;
}

/** Exporta as definições no formato padrão `{ mcpServers: {...} }` como JSON. */
export function generateMcpConfigJson(servers: McpServerDefinition[]): string {
  const mcpServers: Record<string, Record<string, unknown>> = {};
  for (const server of servers) {
    const entry: Record<string, unknown> = {};
    if (server.url) {
      entry.url = server.url;
      if (server.headers && Object.keys(server.headers).length > 0) {
        entry.headers = server.headers;
      }
    }
    if (server.command) entry.command = server.command;
    if (server.args && server.args.length > 0) entry.args = server.args;
    mcpServers[server.name] = entry;
  }
  return JSON.stringify({ mcpServers }, null, 2);
}
