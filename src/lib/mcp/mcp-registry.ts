// Registro/marketplace de servidores MCP conhecidos.
// Catálogo embutido com servidores reais populares + servidores do usuário.

import { addMcpServer, listMcpServers } from "./mcp-server";
import type { McpServerCategory, McpServerDefinition } from "./types";

/** Entrada do marketplace/registro de servidores MCP. */
export interface McpRegistryEntry {
  id: string;
  name: string;
  description: string;
  category: McpServerCategory;
  tags: string[];
  transport: McpServerDefinition["transport"];
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  author: string;
  version: string;
  /** Indica se a entrada faz parte do catálogo embutido. */
  builtIn: boolean;
  /** Indica se o servidor já está instalado pelo usuário. */
  installed: boolean;
}

/** Entrada embutida (antes de computar os flags de instalação). */
type McpRegistryBuiltin = Omit<McpRegistryEntry, "builtIn" | "installed">;

/** Catálogo embutido de servidores MCP reais e populares. */
export const MCP_REGISTRY_BUILTINS: McpRegistryBuiltin[] = [
  {
    id: "context7",
    name: "Context7",
    description:
      "Fornece documentação atualizada de bibliotecas e frameworks para apoiar geração de código com contexto real.",
    category: "code",
    tags: ["documentacao", "bibliotecas", "upstash", "docs"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp"],
    author: "Upstash",
    version: "1.0.0",
  },
  {
    id: "shadcn",
    name: "shadcn",
    description:
      "Integração com o ecossistema shadcn/ui para adicionar componentes e temas diretamente no projeto.",
    category: "code",
    tags: ["ui", "componentes", "react", "tailwind"],
    transport: "stdio",
    command: "npx",
    args: ["shadcn@latest", "mcp"],
    author: "shadcn",
    version: "1.0.0",
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description:
      "Acesso controlado ao sistema de arquivos local: leitura, escrita, listagem e busca de arquivos.",
    category: "filesystem",
    tags: ["arquivos", "filesystem", "local"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
    author: "Model Context Protocol",
    version: "1.0.0",
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Operações em repositórios GitHub: issues, pull requests, branches e arquivos. Requer token de acesso.",
    category: "code",
    tags: ["git", "github", "repositorios", "pr"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    author: "GitHub",
    version: "1.0.0",
  },
  {
    id: "serena",
    name: "Serena",
    description:
      "Ferramentas de código com entendimento semântico: navegação por símbolos, refatoração e análise de projetos.",
    category: "code",
    tags: ["semantico", "refatoracao", "codigo", "simbolos"],
    transport: "stdio",
    command: "uvx",
    args: ["serena-agent"],
    author: "Serena",
    version: "1.0.0",
  },
  {
    id: "playwright",
    name: "Playwright",
    description:
      "Automação de navegador via Playwright: navegação, captura de telas, preenchimento de formulários e testes E2E.",
    category: "browser",
    tags: ["browser", "automacao", "testes", "e2e"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    author: "Microsoft",
    version: "1.0.0",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description:
      "Busca web e local via Brave Search API para consultas em tempo real. Requer chave de API.",
    category: "search",
    tags: ["busca", "web", "search", "brave"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    author: "Brave",
    version: "1.0.0",
  },
  {
    id: "memory",
    name: "Memory",
    description:
      "Grafo de memória persistente baseado em conhecimento, permitindo armazenar e recuperar entidades e relações.",
    category: "memory",
    tags: ["memoria", "grafo", "conhecimento", "persistencia"],
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    author: "Model Context Protocol",
    version: "1.0.0",
  },
];

/** Converte uma definição de servidor do usuário em entrada do registry. */
function toRegistryEntry(server: McpServerDefinition): McpRegistryEntry {
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    category: server.category,
    tags: server.tags,
    transport: server.transport,
    command: server.command,
    args: server.args,
    url: server.url,
    headers: server.headers,
    author: server.author,
    version: server.version,
    builtIn: false,
    installed: true,
  };
}

/** Retorna os ids dos servidores embutidos já instalados pelo usuário. */
export function getInstalledRegistryIds(): string[] {
  const serverNames = new Set(listMcpServers().map((server) => server.name.toLowerCase().trim()));
  return MCP_REGISTRY_BUILTINS.filter((builtin) =>
    serverNames.has(builtin.name.toLowerCase().trim()),
  ).map((builtin) => builtin.id);
}

/** Retorna o catálogo embutido + servidores personalizados do usuário. */
export function getRegistryServers(): McpRegistryEntry[] {
  const installedIds = new Set(getInstalledRegistryIds());

  const builtins: McpRegistryEntry[] = MCP_REGISTRY_BUILTINS.map((builtin) => ({
    ...builtin,
    builtIn: true,
    installed: installedIds.has(builtin.id),
  }));

  const builtinNames = new Set(MCP_REGISTRY_BUILTINS.map((builtin) => builtin.name.toLowerCase().trim()));
  const customServers: McpRegistryEntry[] = listMcpServers()
    .filter((server) => !builtinNames.has(server.name.toLowerCase().trim()))
    .map((server) => toRegistryEntry(server));

  return [...builtins, ...customServers];
}

/** Busca no registry por nome, descrição, tags ou categoria. */
export function searchMcpRegistry(query: string): McpRegistryEntry[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return getRegistryServers();
  return getRegistryServers().filter(
    (entry) =>
      entry.name.toLowerCase().includes(normalized) ||
      entry.description.toLowerCase().includes(normalized) ||
      entry.category.toLowerCase().includes(normalized) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(normalized)),
  );
}

/** Instala um servidor embutido copiando-o para a lista do usuário. */
export function installMcpServerFromRegistry(registryId: string): McpServerDefinition | null {
  const builtin = MCP_REGISTRY_BUILTINS.find((entry) => entry.id === registryId);
  if (!builtin) return null;

  const existing = listMcpServers().find(
    (server) => server.name.toLowerCase().trim() === builtin.name.toLowerCase().trim(),
  );
  if (existing) return existing;

  return addMcpServer({
    name: builtin.name,
    description: builtin.description,
    version: builtin.version,
    transport: builtin.transport,
    command: builtin.command,
    args: builtin.args,
    url: builtin.url,
    headers: builtin.headers,
    tools: [],
    resources: [],
    prompts: [],
    enabled: true,
    tags: [...builtin.tags],
    author: builtin.author,
    category: builtin.category,
  });
}
