/**
 * PromptArchitect v5.0 — Corporate Knowledge Base
 * Tipos do domínio: workspaces, bases de conhecimento, fontes e chunks.
 */

/** Papel de um membro dentro de um workspace. */
export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: number;
}

/** Unidade de isolamento e permissão da Knowledge Base corporativa. */
export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: number;
  updatedAt: number;
}

/** Base de conhecimento pertencente a um workspace. */
export interface KnowledgeBase {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  sourceIds: string[];
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

/** Tipo de fonte ingerida. */
export type KnowledgeSourceType = "text" | "file" | "url";

export interface KnowledgeSource {
  id: string;
  knowledgeBaseId: string;
  type: KnowledgeSourceType;
  title: string;
  /** Conteúdo bruto (para text/url; para file, texto extraído). */
  content: string;
  /** Metadados opcionais (nome do arquivo, URL, autor, etc.). */
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/** Pedaço de texto indexável gerado a partir de uma fonte. */
export interface KnowledgeChunk {
  id: string;
  knowledgeBaseId: string;
  sourceId: string;
  index: number;
  content: string;
  createdAt: number;
}

/** Resultado de uma busca semântica (TF-IDF) na base. */
export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
  source: KnowledgeSource | null;
  knowledgeBase: KnowledgeBase | null;
}

/** Resumo de estatísticas de uma base de conhecimento. */
export interface KnowledgeBaseStats {
  sourceCount: number;
  chunkCount: number;
  totalChars: number;
}
