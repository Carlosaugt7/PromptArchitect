/**
 * PromptArchitect v5.0 — Audit Trail (Trilha de Auditoria Imutável)
 * Registro imutável de todas as ações críticas do sistema.
 * Persistência dual: localStorage (offline) + Firestore (cloud).
 * Auto-purge de entradas expiradas conforme retention configurável.
 */

import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, limit, type Firestore } from "firebase/firestore";
import { db } from "../firebase-config";
import { safeUUID } from "../utils";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.role_change"
  | "workspace.create"
  | "workspace.update"
  | "workspace.delete"
  | "workspace.member_add"
  | "workspace.member_remove"
  | "agent.create"
  | "agent.update"
  | "agent.delete"
  | "agent.execute"
  | "prompt.create"
  | "prompt.update"
  | "prompt.delete"
  | "billing.change"
  | "billing.limit_reached"
  | "data.export"
  | "data.import"
  | "data.delete"
  | "config.change"
  | "security.alert"
  | "compliance.lgpd_access"
  | "compliance.lgpd_delete";

export type AuditResource =
  | "user"
  | "workspace"
  | "agent"
  | "prompt"
  | "billing"
  | "data"
  | "config"
  | "security"
  | "compliance";

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: string;
  metadata?: Record<string, string>;
  ip: string;
  userAgent: string;
}

export interface AuditFilter {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export interface AuditConfig {
  retentionDays: number;
  maxLocalEntries: number;
  enabledActions: AuditAction[];
}

const STORAGE_KEY = "promptarchitect.audit.trail";
const EVENT = "promptarchitect:audit-changed";
const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_MAX_LOCAL_ENTRIES = 10000;
const CONFIG_KEY = "promptarchitect.audit.config";

let firestoreActive = false;

async function getFirestore(): Promise<Firestore | null> {
  if (!db) return null;
  if (firestoreActive) return db;

  try {
    firestoreActive = true;
    return db;
  } catch {
    return null;
  }
}

export function loadAuditConfig(): AuditConfig {
  const defaults: AuditConfig = {
    retentionDays: DEFAULT_RETENTION_DAYS,
    maxLocalEntries: DEFAULT_MAX_LOCAL_ENTRIES,
    enabledActions: [],
  };

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      retentionDays: parsed.retentionDays ?? DEFAULT_RETENTION_DAYS,
      maxLocalEntries: parsed.maxLocalEntries ?? DEFAULT_MAX_LOCAL_ENTRIES,
      enabledActions: parsed.enabledActions ?? [],
    };
  } catch {
    return defaults;
  }
}

export function saveAuditConfig(config: Partial<AuditConfig>): AuditConfig {
  const current = loadAuditConfig();
  const updated: AuditConfig = {
    retentionDays: config.retentionDays ?? current.retentionDays,
    maxLocalEntries: config.maxLocalEntries ?? current.maxLocalEntries,
    enabledActions: config.enabledActions ?? current.enabledActions,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  }

  return updated;
}

function loadLocalEntries(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

function persistLocalEntries(entries: AuditEntry[]): void {
  if (typeof window === "undefined") return;
  const config = loadAuditConfig();
  if (entries.length > config.maxLocalEntries) {
    entries = entries.slice(-config.maxLocalEntries);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(EVENT));
}

function getDeviceInfo(): { ip: string; userAgent: string } {
  if (typeof window === "undefined") return { ip: "server", userAgent: "server" };
  return {
    ip: "client",
    userAgent: navigator.userAgent.substring(0, 256),
  };
}

export async function logAction(entry: Omit<AuditEntry, "id" | "timestamp" | "ip" | "userAgent">): Promise<AuditEntry> {
  const device = getDeviceInfo();
  const fullEntry: AuditEntry = {
    ...entry,
    id: safeUUID(),
    timestamp: Date.now(),
    ip: device.ip,
    userAgent: device.userAgent,
  };

  // Verificar se a ação está configurada como enabled (vazio = todas habilitadas)
  const config = loadAuditConfig();
  if (config.enabledActions.length > 0 && !config.enabledActions.includes(entry.action)) {
    return fullEntry;
  }

  // Persistência local
  const localEntries = loadLocalEntries();
  localEntries.push(fullEntry);
  persistLocalEntries(localEntries);

  // Persistência Firestore (background, não bloqueia)
  const firestore = await getFirestore();
  if (firestore) {
    try {
      const sanitized = JSON.parse(JSON.stringify(fullEntry));
      await setDoc(doc(firestore, "audit_trail", fullEntry.id), sanitized);
    } catch (e) {
      console.warn("[Audit] Firestore sync failed:", e);
    }
  }

  return fullEntry;
}

export async function getAuditTrail(filters?: AuditFilter): Promise<AuditEntry[]> {
  let entries = loadLocalEntries();

  // Tentar mesclar com Firestore se disponível
  const firestore = await getFirestore();
  if (firestore) {
    try {
      const constraints: ReturnType<typeof where>[] = [];

      if (filters?.userId) {
        constraints.push(where("userId", "==", filters.userId));
      }
      if (filters?.action) {
        constraints.push(where("action", "==", filters.action));
      }
      if (filters?.resource) {
        constraints.push(where("resource", "==", filters.resource));
      }

      constraints.push(orderBy("timestamp", "desc"));
      constraints.push(limit(500));

      const q = query(collection(firestore, "audit_trail"), ...constraints);
      const snapshot = await getDocs(q);
      const remoteEntries = snapshot.docs.map((d) => d.data() as AuditEntry);

      // Mesclar local + remoto, deduplicando por ID
      const merged = new Map<string, AuditEntry>();
      for (const e of remoteEntries) merged.set(e.id, e);
      for (const e of entries) {
        if (!merged.has(e.id) || e.timestamp > (merged.get(e.id)?.timestamp ?? 0)) {
          merged.set(e.id, e);
        }
      }

      entries = Array.from(merged.values());
    } catch (e) {
      console.warn("[Audit] Firestore query failed, using local only:", e);
    }
  }

  // Ordenar por timestamp descendente
  entries.sort((a, b) => b.timestamp - a.timestamp);

  // Aplicar filtros
  if (filters) {
    if (filters.startDate) {
      const startTs = filters.startDate.getTime();
      entries = entries.filter((e) => e.timestamp >= startTs);
    }
    if (filters.endDate) {
      const endTs = filters.endDate.getTime();
      entries = entries.filter((e) => e.timestamp <= endTs);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.details.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.userId.toLowerCase().includes(q),
      );
    }
  }

  return entries;
}

export async function purgeExpiredEntries(): Promise<number> {
  const config = loadAuditConfig();
  const cutoff = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;

  // Local
  const localEntries = loadLocalEntries();
  const kept = localEntries.filter((e) => e.timestamp >= cutoff);
  const removedCount = localEntries.length - kept.length;
  if (removedCount > 0) {
    persistLocalEntries(kept);
  }

  // Firestore
  const firestore = await getFirestore();
  if (firestore) {
    try {
      const q = query(collection(firestore, "audit_trail"), where("timestamp", "<", cutoff), limit(500));
      const snapshot = await getDocs(q);
      const batch: Promise<void>[] = [];
      snapshot.docs.forEach((docSnap) => {
        batch.push(deleteDoc(doc(firestore, "audit_trail", docSnap.id)));
      });
      await Promise.allSettled(batch);
    } catch (e) {
      console.warn("[Audit] Firestore purge failed:", e);
    }
  }

  return removedCount;
}

export async function exportAuditTrail(
  format: "json" | "csv",
  filters?: AuditFilter,
): Promise<string> {
  const entries = await getAuditTrail(filters);

  if (format === "json") {
    return JSON.stringify(entries, null, 2);
  }

  // CSV
  const headers = ["id", "timestamp", "userId", "action", "resource", "resourceId", "details", "ip", "userAgent"];
  const csvRows = [headers.join(",")];

  for (const entry of entries) {
    const row = [
      entry.id,
      entry.timestamp.toString(),
      entry.userId,
      entry.action,
      entry.resource,
      entry.resourceId ?? "",
      `"${entry.details.replace(/"/g, '""')}"`,
      entry.ip,
      `"${entry.userAgent.replace(/"/g, '""')}"`,
    ];
    csvRows.push(row.join(","));
  }

  return csvRows.join("\n");
}

export function subscribeAuditTrail(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export async function clearAuditTrail(): Promise<void> {
  persistLocalEntries([]);

  const firestore = await getFirestore();
  if (firestore) {
    try {
      const q = query(collection(firestore, "audit_trail"), limit(500));
      const snapshot = await getDocs(q);
      const batch: Promise<void>[] = [];
      snapshot.docs.forEach((docSnap) => {
        batch.push(deleteDoc(doc(firestore, "audit_trail", docSnap.id)));
      });
      await Promise.allSettled(batch);
    } catch (e) {
      console.warn("[Audit] Firestore clear failed:", e);
    }
  }
}

export function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    "user.login": "Login de usuário",
    "user.logout": "Logout de usuário",
    "user.role_change": "Alteração de cargo",
    "workspace.create": "Criação de workspace",
    "workspace.update": "Atualização de workspace",
    "workspace.delete": "Exclusão de workspace",
    "workspace.member_add": "Adição de membro",
    "workspace.member_remove": "Remoção de membro",
    "agent.create": "Criação de agente",
    "agent.update": "Atualização de agente",
    "agent.delete": "Exclusão de agente",
    "agent.execute": "Execução de agente",
    "prompt.create": "Criação de prompt",
    "prompt.update": "Atualização de prompt",
    "prompt.delete": "Exclusão de prompt",
    "billing.change": "Alteração de cobrança",
    "billing.limit_reached": "Limite de cobrança atingido",
    "data.export": "Exportação de dados",
    "data.import": "Importação de dados",
    "data.delete": "Exclusão de dados",
    "config.change": "Alteração de configuração",
    "security.alert": "Alerta de segurança",
    "compliance.lgpd_access": "Solicitação LGPD - Acesso",
    "compliance.lgpd_delete": "Solicitação LGPD - Exclusão",
  };
  return labels[action] ?? action;
}

export function getResourceLabel(resource: AuditResource): string {
  const labels: Record<AuditResource, string> = {
    user: "Usuário",
    workspace: "Workspace",
    agent: "Agente",
    prompt: "Prompt",
    billing: "Cobrança",
    data: "Dados",
    config: "Configuração",
    security: "Segurança",
    compliance: "Compliance",
  };
  return labels[resource] ?? resource;
}
