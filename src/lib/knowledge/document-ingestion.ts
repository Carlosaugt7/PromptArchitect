/**
 * Ingestão de documentos: adiciona fontes (texto/arquivo/url) e gera chunks.
 * Chunking com sobreposição para melhorar a recuperação por TF-IDF.
 */

import { safeUUID } from "@/lib/utils";
import type { KnowledgeChunk, KnowledgeSource, KnowledgeSourceType } from "./types";
import { getKnowledgeBase, refreshChunkCount } from "./knowledge-base";

const SOURCES_KEY = "promptarchitect.knowledge.sources";
const CHUNKS_KEY = "promptarchitect.knowledge.chunks";
const EVENT = "promptarchitect:knowledge-changed";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

function loadSources(): KnowledgeSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SOURCES_KEY);
    return raw ? (JSON.parse(raw) as KnowledgeSource[]) : [];
  } catch {
    return [];
  }
}

function persistSources(sources: KnowledgeSource[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
  window.dispatchEvent(new Event(EVENT));
}

function loadChunks(): KnowledgeChunk[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHUNKS_KEY);
    return raw ? (JSON.parse(raw) as KnowledgeChunk[]) : [];
  } catch {
    return [];
  }
}

function persistChunks(chunks: KnowledgeChunk[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHUNKS_KEY, JSON.stringify(chunks));
  window.dispatchEvent(new Event(EVENT));
}

export function getSource(id: string): KnowledgeSource | null {
  return loadSources().find((s) => s.id === id) ?? null;
}

export function listSourcesForKb(knowledgeBaseId: string): KnowledgeSource[] {
  return loadSources()
    .filter((s) => s.knowledgeBaseId === knowledgeBaseId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function getChunksForKb(knowledgeBaseId: string): KnowledgeChunk[] {
  return loadChunks()
    .filter((c) => c.knowledgeBaseId === knowledgeBaseId)
    .sort((a, b) => a.index - b.index);
}

/**
 * Divide um texto em chunks com sobreposição, tentando quebrar em limites de
 * parágrafo para preservar o sentido.
 */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= size) return [normalized];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);
    // Evita cortar no meio de uma palavra: recua até o último espaço.
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      const lastNewline = normalized.lastIndexOf("\n", end);
      const cut = Math.max(lastSpace, lastNewline);
      if (cut > start + size * 0.5) end = cut;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

/** Gera e persiste chunks para uma fonte, removendo os anteriores. */
function buildChunksForSource(source: KnowledgeSource): KnowledgeChunk[] {
  const parts = chunkText(source.content);
  const now = Date.now();
  const existing = loadChunks().filter((c) => c.sourceId !== source.id);
  const next = parts.map((content, i) => ({
    id: safeUUID(),
    knowledgeBaseId: source.knowledgeBaseId,
    sourceId: source.id,
    index: i,
    content,
    createdAt: now,
  }));
  persistChunks([...existing, ...next]);
  return next;
}

/**
 * Adiciona uma fonte a partir de texto simples. Cria a fonte, gera os chunks e
 * atualiza os contadores da base.
 */
export function addTextSource(
  knowledgeBaseId: string,
  title: string,
  content: string,
  type: KnowledgeSourceType = "text",
  metadata: Record<string, string> = {},
): KnowledgeSource {
  const now = Date.now();
  const source: KnowledgeSource = {
    id: safeUUID(),
    knowledgeBaseId,
    type,
    title: title.trim() || "Sem título",
    content,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
  const sources = loadSources();
  sources.push(source);
  persistSources(sources);
  buildChunksForSource(source);

  const base = getKnowledgeBase(knowledgeBaseId);
  if (base) {
    base.sourceIds = [...base.sourceIds, source.id];
    refreshChunkCount(knowledgeBaseId);
  }
  return source;
}

/** Alias semântico de addTextSource para uso externo. */
export function addSource(
  knowledgeBaseId: string,
  title: string,
  content: string,
  type: KnowledgeSourceType = "text",
  metadata: Record<string, string> = {},
): KnowledgeSource {
  return addTextSource(knowledgeBaseId, title, content, type, metadata);
}

/** Atualiza o conteúdo de uma fonte e regenera seus chunks. */
export function updateSource(
  sourceId: string,
  patch: Partial<Omit<KnowledgeSource, "id" | "createdAt" | "updatedAt">>,
): KnowledgeSource | null {
  const sources = loadSources();
  const index = sources.findIndex((s) => s.id === sourceId);
  if (index < 0) return null;
  const updated: KnowledgeSource = { ...sources[index], ...patch, updatedAt: Date.now() };
  sources[index] = updated;
  persistSources(sources);
  if (patch.content !== undefined) {
    buildChunksForSource(updated);
    refreshChunkCount(updated.knowledgeBaseId);
  }
  return updated;
}

/** Remove uma fonte e seus chunks, atualizando a base. */
export function deleteSource(sourceId: string): void {
  const source = getSource(sourceId);
  if (source) {
    persistSources(loadSources().filter((s) => s.id !== sourceId));
    persistChunks(loadChunks().filter((c) => c.sourceId !== sourceId));
    const base = getKnowledgeBase(source.knowledgeBaseId);
    if (base) {
      base.sourceIds = base.sourceIds.filter((id) => id !== sourceId);
      refreshChunkCount(source.knowledgeBaseId);
    }
  }
}

/** Regenera todos os chunks de uma base a partir de suas fontes. */
export function rebuildChunksForKb(knowledgeBaseId: string): number {
  const sources = listSourcesForKb(knowledgeBaseId);
  const otherChunks = loadChunks().filter((c) => c.knowledgeBaseId !== knowledgeBaseId);
  const newChunks: KnowledgeChunk[] = [];
  for (const source of sources) {
    const parts = chunkText(source.content);
    const now = Date.now();
    parts.forEach((content, i) => {
      newChunks.push({
        id: safeUUID(),
        knowledgeBaseId,
        sourceId: source.id,
        index: i,
        content,
        createdAt: now,
      });
    });
  }
  persistChunks([...otherChunks, ...newChunks]);
  refreshChunkCount(knowledgeBaseId);
  return newChunks.length;
}
