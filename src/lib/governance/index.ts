/**
 * PromptArchitect v5.0 — Governance & Enterprise Layer
 * Barrel export: todos os módulos de governança corporativa.
 */

// ─── RBAC ───
export {
  type Role,
  type Permission,
  type UserRoleAssignment,
  getUserRole,
  setUserRole,
  removeUserRole,
  hasPermission,
  hasRole,
  getAllRoles,
  getAllPermissions,
  getPermissionsForRole,
  getRoleLabel,
  getPermissionLabel,
  listAllUsers,
  getImpersonationLevel,
} from "./rbac";

// ─── Audit Trail ───
export {
  type AuditAction,
  type AuditResource,
  type AuditEntry,
  type AuditFilter,
  type AuditConfig,
  logAction,
  getAuditTrail,
  exportAuditTrail,
  clearAuditTrail,
  purgeExpiredEntries,
  subscribeAuditTrail,
  loadAuditConfig,
  saveAuditConfig,
  getActionLabel,
  getResourceLabel,
} from "./audit-trail";

// ─── Cost Governor ───
export {
  type BudgetAlertLevel,
  type BudgetStatus,
  type CostGovernorConfig,
  checkBudget,
  recordUsage,
  loadCostGovernorConfig,
  saveCostGovernorConfig,
  loadTaskCost,
  loadSessionCost,
  loadMonthlyCost,
  resetTaskCost,
  resetSessionCost,
  getAlertDescription,
  formatBudgetAmount,
  getCostHistory,
} from "./cost-governor";

// ─── Compliance ───
export {
  type PiiType,
  type PiiMatch,
  type SensitivityLevel,
  type LgpdRequest,
  detectPII,
  sanitizePII,
  maskPII,
  classifySensitivity,
  logAccessRequest,
  logDeletionRequest,
  logCorrectionRequest,
  logPortabilityRequest,
  resolveLgpdRequest,
  getLgpdRequests,
  subscribeLgpdRequests,
  getPiiTypeLabel,
  getSensitivityLabel,
  getSensitivityColor,
  getLgpdStatusLabel,
} from "./compliance";
