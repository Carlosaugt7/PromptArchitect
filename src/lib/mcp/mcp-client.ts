// Cliente para invocação de tools MCP.
// Suporta chamada real via HTTP (streamable_http/sse) com fallback para
// simulação local quando o servidor roda via stdio (runtime local).

import { safeUUID } from "@/lib/utils";
import { getMcpServer } from "./mcp-server";
import type {
  McpServerDefinition,
  McpServerStatus,
  McpTool,
  McpToolResult,
} from "./types";

/** Resumo descritivo de um servidor MCP (usado em listagens e painéis). */
export interface McpServerSummary {
  id: string;
  name: string;
  description: string;
  transport: McpServerDefinition["transport"];
  category: McpServerDefinition["category"];
  enabled: boolean;
  status: McpServerStatus;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
}

/** Extrai o conteúdo textual de um resultado JSON-RPC do MCP. */
function extractTextContent(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const obj = result as { content?: unknown };
    if (Array.isArray(obj.content)) {
      const texts = obj.content
        .map((item) => {
          if (item && typeof item === "object" && "text" in (item as object)) {
            return String((item as { text: unknown }).text);
          }
          return "";
        })
        .filter((text) => text.length > 0);
      if (texts.length > 0) return texts.join("\n");
    }
    return JSON.stringify(result, null, 2);
  }
  return String(result ?? "");
}

/** Interpreta uma resposta em formato Server-Sent Events (SSE). */
function parseSseResult(text: string): string {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed && typeof parsed === "object") {
        const obj = parsed as { error?: unknown; result?: unknown };
        if ("error" in obj) return `Erro remoto: ${JSON.stringify(obj.error)}`;
        if ("result" in obj) return extractTextContent(obj.result);
      }
    } catch {
      // Linha SSE que não é JSON — ignora.
    }
  }
  return text;
}

/** Executa a chamada HTTP real (JSON-RPC) contra um endpoint streamable_http. */
async function callRemoteTool(
  url: string,
  toolName: string,
  args: Record<string, unknown> | undefined,
  headers?: Record<string, string>,
): Promise<McpToolResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(headers ?? {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: safeUUID(),
        method: "tools/call",
        params: { name: toolName, arguments: args ?? {} },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return { content: parseSseResult(await response.text()) };
    }

    const data: unknown = await response.json();
    if (data && typeof data === "object") {
      const obj = data as { error?: unknown; result?: unknown };
      if ("error" in obj) {
        return { content: `Erro remoto: ${JSON.stringify(obj.error)}`, isError: true };
      }
      if ("result" in obj) {
        return { content: extractTextContent(obj.result) };
      }
    }
    return { content: JSON.stringify(data, null, 2) };
  } catch (error) {
    // Fallback: em caso de falha de rede/HTTP, retorna resultado simulado.
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: `Falha na chamada remota (${message}) — execução simulada localmente.`,
      isError: true,
    };
  }
}

/** Gera o resultado simulado para servidores sem endpoint HTTP (stdio). */
function simulateToolCall(
  serverName: string,
  toolName: string,
  args: Record<string, unknown> | undefined,
): McpToolResult {
  return {
    content: JSON.stringify(
      {
        simulated: true,
        server: serverName,
        tool: toolName,
        arguments: args ?? {},
        message:
          "Execução simulada — para servidores stdio a execução real ocorre no runtime local (npx/uvx).",
      },
      null,
      2,
    ),
  };
}

/** Calcula o status operacional simples de um servidor. */
function computeStatus(server: McpServerDefinition): McpServerStatus {
  if (!server.enabled) return "disabled";
  return "available";
}

/** Invoca uma tool de um servidor MCP (chamada real HTTP ou simulação). */
export async function invokeMcpTool(
  serverId: string,
  toolName: string,
  args?: Record<string, unknown>,
): Promise<McpToolResult> {
  const server = getMcpServer(serverId);
  if (!server) {
    return { content: `Erro: servidor MCP "${serverId}" não encontrado.`, isError: true };
  }
  if (!server.enabled) {
    return { content: `Erro: servidor MCP "${server.name}" está desabilitado.`, isError: true };
  }

  const tool = server.tools.find((item) => item.name === toolName);
  if (!tool) {
    return {
      content: `Erro: ferramenta "${toolName}" não encontrada no servidor "${server.name}".`,
      isError: true,
    };
  }

  if (server.url) {
    return callRemoteTool(server.url, toolName, args, server.headers);
  }
  return simulateToolCall(server.name, toolName, args);
}

/** Lista as tools expostas por um servidor MCP. */
export function listMcpTools(serverId: string): McpTool[] {
  return getMcpServer(serverId)?.tools ?? [];
}

/** Retorna um resumo descritivo de um servidor MCP (ou null). */
export function describeMcpServer(serverId: string): McpServerSummary | null {
  const server = getMcpServer(serverId);
  if (!server) return null;
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    transport: server.transport,
    category: server.category,
    enabled: server.enabled,
    status: computeStatus(server),
    toolCount: server.tools.length,
    resourceCount: server.resources.length,
    promptCount: server.prompts.length,
  };
}
