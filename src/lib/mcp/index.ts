// Barrel export do módulo MCP Ecosystem.
// Reexporta todos os tipos e funções públicas dos submódulos.

// ─── Tipos fundamentais ───
export type {
  McpTransport,
  McpServerCategory,
  McpServerStatus,
  McpTool,
  McpResource,
  McpPrompt,
  McpPromptArgument,
  McpServerDefinition,
  McpToolResult,
} from "./types";

// ─── Gerenciamento de servidores ───
export {
  MCP_CHANGED_EVENT,
  listMcpServers,
  getMcpServer,
  addMcpServer,
  updateMcpServer,
  removeMcpServer,
  toggleMcpServer,
  subscribeMcpServers,
  buildMcpServerFromConfig,
  generateMcpConfigJson,
} from "./mcp-server";

// ─── Cliente de invocação ───
export {
  type McpServerSummary,
  invokeMcpTool,
  listMcpTools,
  describeMcpServer,
} from "./mcp-client";

// ─── Gateway corporativo ───
export {
  type GatewayPolicy,
  type GatewayEvaluation,
  type RateLimitStatus,
  type McpGateway,
  mcpGateway,
  loadGatewayPolicy,
  saveGatewayPolicy,
  evaluateRequest,
  registerCall,
  getRateLimitStatus,
  canInvoke,
} from "./mcp-gateway";

// ─── Registro/marketplace ───
export {
  type McpRegistryEntry,
  MCP_REGISTRY_BUILTINS,
  getRegistryServers,
  searchMcpRegistry,
  installMcpServerFromRegistry,
  getInstalledRegistryIds,
} from "./mcp-registry";
