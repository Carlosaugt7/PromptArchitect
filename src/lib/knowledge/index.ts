/**
 * PromptArchitect v5.0 — Corporate Knowledge Base
 * Barrel export: workspaces, bases, ingestão de documentos e retrieval (RAG).
 */

// ─── Tipos ───
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  KnowledgeBase,
  KnowledgeSource,
  KnowledgeSourceType,
  KnowledgeChunk,
  SearchResult,
  KnowledgeBaseStats,
} from "./types";

// ─── Workspaces ───
export {
  subscribeKnowledge,
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  getWorkspaceMemberRole,
  canReadWorkspace,
  canWriteWorkspace,
  canManageWorkspace,
  getWorkspaceRoleLabel,
} from "./workspace";

// ─── Knowledge Base ───
export {
  createKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
  listKnowledgeBasesByWorkspace,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  refreshChunkCount,
  getKnowledgeBaseStats,
} from "./knowledge-base";

// ─── Ingestão de documentos ───
export {
  getSource,
  listSourcesForKb,
  getChunksForKb,
  chunkText,
  addTextSource,
  addSource,
  updateSource,
  deleteSource,
  rebuildChunksForKb,
} from "./document-ingestion";

// ─── Retrieval ───
export {
  tokenize,
  searchKnowledge,
  searchAcrossWorkspace,
  buildContextBlock,
} from "./retrieval";
