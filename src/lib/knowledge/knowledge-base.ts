/**
 * CRUD de Bases de Conhecimento (KnowledgeBase).
 * Cada base pertence a um workspace e agrega fontes + chunks.
 */

import { safeUUID } from "@/lib/utils";
import type { KnowledgeBase, KnowledgeBaseStats } from "./types";
import { getChunksForKb } from "./document-ingestion";
import { getSource } from "./document-ingestion";

const STORAGE_KEY = "promptarchitect.knowledge.bases";
const EVENT = "promptarchitect:knowledge-changed";

function loadBases(): KnowledgeBase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KnowledgeBase[]) : [];
  } catch {
    return [];
  }
}

function persistBases(bases: KnowledgeBase[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bases));
  window.dispatchEvent(new Event(EVENT));
}

export function createKnowledgeBase(
  workspaceId: string,
  name: string,
  description = "",
): KnowledgeBase {
  const now = Date.now();
  const base: KnowledgeBase = {
    id: safeUUID(),
    workspaceId,
    name: name.trim() || "Base sem nome",
    description,
    sourceIds: [],
    chunkCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const bases = loadBases();
  bases.push(base);
  persistBases(bases);
  return base;
}

export function getKnowledgeBase(id: string): KnowledgeBase | null {
  return loadBases().find((b) => b.id === id) ?? null;
}

export function listKnowledgeBases(): KnowledgeBase[] {
  return loadBases().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listKnowledgeBasesByWorkspace(workspaceId: string): KnowledgeBase[] {
  return listKnowledgeBases().filter((b) => b.workspaceId === workspaceId);
}

export function updateKnowledgeBase(
  id: string,
  patch: Partial<Omit<KnowledgeBase, "id" | "createdAt" | "updatedAt">>,
): KnowledgeBase | null {
  const bases = loadBases();
  const index = bases.findIndex((b) => b.id === id);
  if (index < 0) return null;
  const updated: KnowledgeBase = { ...bases[index], ...patch, updatedAt: Date.now() };
  bases[index] = updated;
  persistBases(bases);
  return updated;
}

export function deleteKnowledgeBase(id: string): void {
  persistBases(loadBases().filter((b) => b.id !== id));
}

/** Recalcula e persiste o contador de chunks de uma base. */
export function refreshChunkCount(knowledgeBaseId: string): void {
  const base = getKnowledgeBase(knowledgeBaseId);
  if (!base) return;
  const count = getChunksForKb(knowledgeBaseId).length;
  updateKnowledgeBase(knowledgeBaseId, { chunkCount: count });
}

/** Retorna estatísticas consolidadas de uma base de conhecimento. */
export function getKnowledgeBaseStats(knowledgeBaseId: string): KnowledgeBaseStats {
  const base = getKnowledgeBase(knowledgeBaseId);
  const chunks = getChunksForKb(knowledgeBaseId);
  let totalChars = 0;
  for (const sourceId of base?.sourceIds ?? []) {
    const source = getSource(sourceId);
    if (source) totalChars += source.content.length;
  }
  return {
    sourceCount: base?.sourceIds.length ?? 0,
    chunkCount: chunks.length,
    totalChars,
  };
}
