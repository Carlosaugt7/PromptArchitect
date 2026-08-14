// Gateway corporativo MCP com permissionamento e controle de rate limit.
// Valida políticas (servidores/papéis permitidos) antes de autorizar chamadas
// e registra o histórico recente de chamadas por servidor para limitar a taxa.

/** Política de acesso configurada pelo administrador corporativo. */
export interface GatewayPolicy {
  /** Lista de ids de servidores permitidos (vazio = todos permitidos). */
  allowedServers: string[];
  /** Número máximo de chamadas por minuto por servidor. */
  maxCallsPerMinute: number;
  /** Indica se a execução requer aprovação humana prévia. */
  requireApproval: boolean;
  /** Papéis autorizados a invocar servidores (vazio = todos os papéis). */
  allowedRoles: string[];
}

/** Resultado da avaliação de uma requisição. */
export interface GatewayEvaluation {
  allowed: boolean;
  reason?: string;
}

/** Estado atual de rate limit de um servidor. */
export interface RateLimitStatus {
  serverId: string;
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}

/** Contrato do gateway de servidores MCP. */
export interface McpGateway {
  evaluateRequest(serverId: string, userId: string, role: string): GatewayEvaluation;
  registerCall(serverId: string): void;
  getRateLimitStatus(serverId: string): RateLimitStatus;
}

/** Chave de persistência da política no localStorage. */
const POLICY_KEY = "promptarchitect.mcp.gateway.policy";

/** Chave de persistência do histórico de rate limit no localStorage. */
const RATE_LIMIT_KEY = "promptarchitect.mcp.gateway.ratelimit";

/** Janela de observação do rate limit (1 minuto). */
const RATE_WINDOW_MS = 60_000;

/** Política padrão aplicada quando nada foi configurado. */
const DEFAULT_POLICY: GatewayPolicy = {
  allowedServers: [],
  maxCallsPerMinute: 30,
  requireApproval: false,
  allowedRoles: [],
};

/** Carrega a política do gateway (ou a padrão). */
export function loadGatewayPolicy(): GatewayPolicy {
  if (typeof window === "undefined") return { ...DEFAULT_POLICY };
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    if (!raw) return { ...DEFAULT_POLICY };
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Partial<GatewayPolicy>;
      return {
        allowedServers: Array.isArray(obj.allowedServers) ? obj.allowedServers : [],
        maxCallsPerMinute: typeof obj.maxCallsPerMinute === "number" ? obj.maxCallsPerMinute : 30,
        requireApproval: typeof obj.requireApproval === "boolean" ? obj.requireApproval : false,
        allowedRoles: Array.isArray(obj.allowedRoles) ? obj.allowedRoles : [],
      };
    }
    return { ...DEFAULT_POLICY };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

/** Salva a política do gateway no localStorage. */
export function saveGatewayPolicy(policy: GatewayPolicy): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
}

/** Carrega o mapa de timestamps recentes por servidor. */
function loadRateLimitMap(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const map: Record<string, number[]> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          map[key] = value.filter((item): item is number => typeof item === "number");
        }
      }
      return map;
    }
    return {};
  } catch {
    return {};
  }
}

/** Persiste o mapa de timestamps no localStorage. */
function saveRateLimitMap(map: Record<string, number[]>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(map));
}

/** Remove timestamps fora da janela de observação. */
function pruneTimestamps(timestamps: number[]): number[] {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  return timestamps.filter((timestamp) => timestamp >= cutoff);
}

/** Avalia uma requisição contra a política (servidores e papéis permitidos). */
export function evaluateRequest(serverId: string, _userId: string, role: string): GatewayEvaluation {
  const policy = loadGatewayPolicy();

  if (policy.allowedServers.length > 0 && !policy.allowedServers.includes(serverId)) {
    return { allowed: false, reason: "Servidor não autorizado pela política do gateway." };
  }

  if (policy.allowedRoles.length > 0 && !policy.allowedRoles.includes(role)) {
    return { allowed: false, reason: `Papel "${role}" não autorizado para este servidor.` };
  }

  if (policy.requireApproval) {
    return { allowed: true, reason: "Requer aprovação humana antes da execução." };
  }

  return { allowed: true };
}

/** Registra uma chamada para efeito de rate limit. */
export function registerCall(serverId: string): void {
  const map = loadRateLimitMap();
  const timestamps = pruneTimestamps(map[serverId] ?? []);
  timestamps.push(Date.now());
  map[serverId] = timestamps;
  saveRateLimitMap(map);
}

/** Retorna o estado atual de rate limit de um servidor. */
export function getRateLimitStatus(serverId: string): RateLimitStatus {
  const policy = loadGatewayPolicy();
  const limit = policy.maxCallsPerMinute;
  const used = pruneTimestamps(loadRateLimitMap()[serverId] ?? []).length;

  // Limite <= 0 é interpretado como "sem limite".
  const allowed = limit <= 0 || used < limit;
  return {
    serverId,
    limit,
    used,
    remaining: limit <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
    allowed,
  };
}

/** Instância concreta do gateway (para uso via interface). */
export const mcpGateway: McpGateway = {
  evaluateRequest,
  registerCall,
  getRateLimitStatus,
};

/** Valida política + rate limit sem registrar a chamada. */
export function canInvoke(serverId: string, userId: string, role: string): boolean {
  const evaluation = evaluateRequest(serverId, userId, role);
  if (!evaluation.allowed) return false;
  return getRateLimitStatus(serverId).allowed;
}
