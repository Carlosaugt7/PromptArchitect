// Tipos fundamentais do módulo MCP (Model Context Protocol).
// Centraliza as estruturas de dados usadas em todo o ecossistema MCP.

/** Transporte usado pelo servidor MCP para comunicação. */
export type McpTransport = "stdio" | "streamable_http" | "sse";

/** Categoria usada para classificar servidores MCP no marketplace corporativo. */
export type McpServerCategory =
  | "filesystem"
  | "database"
  | "api"
  | "search"
  | "browser"
  | "memory"
  | "code"
  | "productivity"
  | "custom";

/** Estado operacional de um servidor MCP. */
export type McpServerStatus = "available" | "offline" | "error" | "disabled";

/** Ferramenta (tool) exposta por um servidor MCP. */
export interface McpTool {
  /** Nome único da ferramenta dentro do servidor. */
  name: string;
  /** Descrição em linguagem natural do que a ferramenta faz. */
  description: string;
  /** JSON Schema (ou mapa simples) dos parâmetros de entrada. */
  inputSchema?: Record<string, unknown>;
  /** JSON Schema opcional da saída produzida pela ferramenta. */
  outputSchema?: Record<string, unknown>;
  /** Anotações adicionais (ex.: readOnlyHint, destructiveHint). */
  annotations?: Record<string, unknown>;
}

/** Recurso (recurso exposto) por um servidor MCP. */
export interface McpResource {
  /** URI canônica do recurso (ex.: file:///docs/readme). */
  uri: string;
  /** Nome amigável do recurso. */
  name: string;
  /** Descrição do conteúdo do recurso. */
  description: string;
  /** MIME type opcional do conteúdo. */
  mimeType?: string;
}

/** Argumento aceito por um prompt MCP. */
export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

/** Prompt reutilizável fornecido por um servidor MCP. */
export interface McpPrompt {
  /** Nome único do prompt dentro do servidor. */
  name: string;
  /** Descrição do propósito do prompt. */
  description: string;
  /** Argumentos que o template aceita. */
  arguments?: McpPromptArgument[];
  /** Template textual do prompt (com placeholders opcionais). */
  template: string;
}

/** Definição completa de um servidor MCP registrado na aplicação. */
export interface McpServerDefinition {
  /** Identificador único gerado internamente. */
  id: string;
  /** Nome amigável do servidor. */
  name: string;
  /** Descrição do que o servidor fornece. */
  description: string;
  /** Versão semântica do servidor. */
  version: string;
  /** Transporte utilizado para comunicação. */
  transport: McpTransport;
  /** Comando de inicialização (para transporte stdio). */
  command?: string;
  /** Argumentos do comando (para transporte stdio). */
  args?: string[];
  /** URL do endpoint (para streamable_http/sse). */
  url?: string;
  /** Headers HTTP adicionais enviados em chamadas remotas. */
  headers?: Record<string, string>;
  /** Ferramentas expostas pelo servidor. */
  tools: McpTool[];
  /** Recursos expostos pelo servidor. */
  resources: McpResource[];
  /** Prompts fornecidos pelo servidor. */
  prompts: McpPrompt[];
  /** Indica se o servidor está habilitado para uso. */
  enabled: boolean;
  /** Tags para busca e organização. */
  tags: string[];
  /** Autor/mantenedor do servidor. */
  author: string;
  /** Categoria do servidor. */
  category: McpServerCategory;
}

/** Resultado de uma invocação de tool MCP. */
export interface McpToolResult {
  /** Conteúdo textual retornado pela ferramenta. */
  content: string;
  /** Indica se a execução resultou em erro. */
  isError?: boolean;
}
