/**
 * CRUD de Workspaces + controle de acesso por membro.
 * Persistência client-side via localStorage.
 */

import { safeUUID } from "@/lib/utils";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "./types";

const STORAGE_KEY = "promptarchitect.knowledge.workspaces";
const EVENT = "promptarchitect:knowledge-changed";

function loadWorkspaces(): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Workspace[]) : [];
  } catch {
    return [];
  }
}

function persistWorkspaces(workspaces: Workspace[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  window.dispatchEvent(new Event(EVENT));
}

/** Assina mudanças na Knowledge Base (evento local + evento "storage"). */
export function subscribeKnowledge(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function createWorkspace(
  name: string,
  description = "",
  ownerId = "local-user",
): Workspace {
  const now = Date.now();
  const owner: WorkspaceMember = { userId: ownerId, role: "owner", joinedAt: now };
  const workspace: Workspace = {
    id: safeUUID(),
    name: name.trim() || "Workspace sem nome",
    description,
    ownerId,
    members: [owner],
    createdAt: now,
    updatedAt: now,
  };
  const workspaces = loadWorkspaces();
  workspaces.push(workspace);
  persistWorkspaces(workspaces);
  return workspace;
}

export function getWorkspace(id: string): Workspace | null {
  return loadWorkspaces().find((w) => w.id === id) ?? null;
}

export function listWorkspaces(): Workspace[] {
  return loadWorkspaces().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updateWorkspace(
  id: string,
  patch: Partial<Omit<Workspace, "id" | "createdAt" | "updatedAt">>,
): Workspace | null {
  const workspaces = loadWorkspaces();
  const index = workspaces.findIndex((w) => w.id === id);
  if (index < 0) return null;
  const updated: Workspace = { ...workspaces[index], ...patch, updatedAt: Date.now() };
  workspaces[index] = updated;
  persistWorkspaces(workspaces);
  return updated;
}

export function deleteWorkspace(id: string): void {
  persistWorkspaces(loadWorkspaces().filter((w) => w.id !== id));
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------

export function addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): void {
  if (!userId) return;
  const workspaces = loadWorkspaces();
  const index = workspaces.findIndex((w) => w.id === workspaceId);
  if (index < 0) return;
  const workspace = workspaces[index];
  const existing = workspace.members.find((m) => m.userId === userId);
  if (existing) {
    workspace.members = workspace.members.map((m) =>
      m.userId === userId ? { ...m, role } : m,
    );
  } else {
    workspace.members.push({ userId, role, joinedAt: Date.now() });
  }
  workspace.updatedAt = Date.now();
  workspaces[index] = workspace;
  persistWorkspaces(workspaces);
}

export function removeWorkspaceMember(workspaceId: string, userId: string): void {
  const workspaces = loadWorkspaces();
  const index = workspaces.findIndex((w) => w.id === workspaceId);
  if (index < 0) return;
  const workspace = workspaces[index];
  // Owner não pode ser removido.
  if (workspace.ownerId === userId) return;
  workspace.members = workspace.members.filter((m) => m.userId !== userId);
  workspace.updatedAt = Date.now();
  workspaces[index] = workspace;
  persistWorkspaces(workspaces);
}

export function getWorkspaceMemberRole(workspaceId: string, userId: string): WorkspaceRole | null {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return null;
  if (workspace.ownerId === userId) return "owner";
  return workspace.members.find((m) => m.userId === userId)?.role ?? null;
}

// ---------------------------------------------------------------------------
// Permissões
// ---------------------------------------------------------------------------

const ROLE_LEVEL: Record<WorkspaceRole, number> = { owner: 3, editor: 2, viewer: 1 };

export function canReadWorkspace(workspaceId: string, userId: string): boolean {
  return getWorkspaceMemberRole(workspaceId, userId) !== null;
}

export function canWriteWorkspace(workspaceId: string, userId: string): boolean {
  const role = getWorkspaceMemberRole(workspaceId, userId);
  if (!role) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL.editor;
}

export function canManageWorkspace(workspaceId: string, userId: string): boolean {
  const role = getWorkspaceMemberRole(workspaceId, userId);
  if (!role) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL.owner;
}

export function getWorkspaceRoleLabel(role: WorkspaceRole): string {
  const labels: Record<WorkspaceRole, string> = {
    owner: "Proprietário",
    editor: "Editor",
    viewer: "Visualizador",
  };
  return labels[role];
}
