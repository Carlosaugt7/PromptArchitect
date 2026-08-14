/**
 * PromptArchitect v5.0 — Role-Based Access Control (RBAC)
 * Sistema de controle de acesso baseado em funções com granularidade por workspace.
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export type Permission =
  | "manage_workspace"
  | "manage_agents"
  | "manage_billing"
  | "view_analytics"
  | "export_data"
  | "delete_content"
  | "invite_members";

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
  VIEWER: 0,
};

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "manage_workspace",
    "manage_agents",
    "manage_billing",
    "view_analytics",
    "export_data",
    "delete_content",
    "invite_members",
  ],
  ADMIN: [
    "manage_workspace",
    "manage_agents",
    "manage_billing",
    "view_analytics",
    "export_data",
    "delete_content",
    "invite_members",
  ],
  MANAGER: [
    "manage_agents",
    "view_analytics",
    "export_data",
    "delete_content",
    "invite_members",
  ],
  MEMBER: [
    "view_analytics",
    "export_data",
  ],
  VIEWER: [
    "view_analytics",
  ],
};

export interface UserRoleAssignment {
  userId: string;
  role: Role;
  assignedAt: number;
  assignedBy: string;
}

const ROLES_STORAGE_KEY = "promptarchitect.rbac.roles";

function loadRoleAssignments(): Record<string, UserRoleAssignment> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistRoleAssignments(assignments: Record<string, UserRoleAssignment>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(assignments));
}

export function getUserRole(userId: string): Role {
  if (!userId) return "VIEWER";
  const assignments = loadRoleAssignments();
  return assignments[userId]?.role ?? "VIEWER";
}

export function setUserRole(
  userId: string,
  role: Role,
  assignedBy: string = "system",
): void {
  if (!userId) return;
  const assignments = loadRoleAssignments();
  assignments[userId] = {
    userId,
    role,
    assignedAt: Date.now(),
    assignedBy,
  };
  persistRoleAssignments(assignments);
}

export function removeUserRole(userId: string): void {
  if (!userId) return;
  const assignments = loadRoleAssignments();
  delete assignments[userId];
  persistRoleAssignments(assignments);
}

export function hasPermission(
  userId: string,
  permission: Permission,
): boolean {
  if (!userId) return false;
  const role = getUserRole(userId);

  // SUPER_ADMIN e ADMIN tem todas as permissões sem verificação adicional
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;

  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

export function hasRole(
  userId: string,
  minimumRole: Role,
): boolean {
  const userRole = getUserRole(userId);
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export function getAllRoles(): Role[] {
  return ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];
}

export function getAllPermissions(): Permission[] {
  return [
    "manage_workspace",
    "manage_agents",
    "manage_billing",
    "view_analytics",
    "export_data",
    "delete_content",
    "invite_members",
  ];
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    MEMBER: "Membro",
    VIEWER: "Visualizador",
  };
  return labels[role];
}

export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    manage_workspace: "Gerenciar Workspace",
    manage_agents: "Gerenciar Agentes",
    manage_billing: "Gerenciar Cobrança",
    view_analytics: "Visualizar Analytics",
    export_data: "Exportar Dados",
    delete_content: "Excluir Conteúdo",
    invite_members: "Convidar Membros",
  };
  return labels[permission];
}

export function listAllUsers(): UserRoleAssignment[] {
  const assignments = loadRoleAssignments();
  return Object.values(assignments);
}

export function getImpersonationLevel(userId: string): number {
  const role = getUserRole(userId);
  return ROLE_HIERARCHY[role];
}
