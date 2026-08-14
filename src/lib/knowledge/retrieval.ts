/**
 * Retrieval (RAG) sobre a Knowledge Base.
 * Implementação manual de TF-IDF (sem dependências externas) com tokenização
 * em pt-BR, ranking por similaridade e geração de bloco de contexto.
 */

import type { KnowledgeChunk, SearchResult } from "./types";
import { getChunksForKb } from "./document-ingestion";
import { getKnowledgeBase, listKnowledgeBasesByWorkspace } from "./knowledge-base";
import { getSource } from "./document-ingestion";

const STOPWORDS = new Set([
  "a", "o", "e", "é", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas", "para", "por", "com", "sem", "sobre", "entre", "como",
  "que", "se", "não", "nao", "mais", "mas", "ou", "ao", "aos", "à", "às", "pelo",
  "pela", "pelos", "pelas", "este", "esta", "estes", "estas", "esse", "essa", "esses",
  "essas", "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo", "the",
  "and", "or", "of", "to", "in", "for", "is", "are", "was", "were", "it", "this",
  "that", "with", "from", "as", "by", "on", "at", "be", "an", "a", "do", "does",
]);

/** Normaliza acentos para facilitar a comparação de termos. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Tokeniza um texto em termos relevantes (remove stopwords e tokens curtos). */
export function tokenize(text: string): string[] {
  const normalized = normalize(text ?? "");
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

interface TfIdfDoc {
  chunk: KnowledgeChunk;
  /** termo -> frequência normalizada */
  tf: Map<string, number>;
}

/** Calcula a frequência do termo (TF) normalizada por documento. */
function computeTf(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  const tf = new Map<string, number>();
  const total = tokens.length || 1;
  for (const [term, count] of counts) tf.set(term, count / total);
  return tf;
}

/** Monta o índice TF-IDF para um conjunto de chunks. */
function buildIndex(chunks: KnowledgeChunk[]): TfIdfDoc[] {
  const docs = chunks.map((chunk) => ({
    chunk,
    tf: computeTf(tokenize(chunk.content)),
  }));
  return docs;
}

/** Calcula o IDF (Inverse Document Frequency) para um termo. */
function computeIdf(docs: TfIdfDoc[], term: string): number {
  const containing = docs.filter((d) => d.tf.has(term)).length;
  return Math.log((docs.length + 1) / (containing + 1)) + 1;
}

/**
 * Busca por relevância em uma base de conhecimento.
 * Retorna resultados ordenados por score (TF-IDF cosseno-like) com fonte e base.
 */
export function searchKnowledge(
  knowledgeBaseId: string,
  query: string,
  topK = 5,
): SearchResult[] {
  const chunks = getChunksForKb(knowledgeBaseId);
  if (!chunks.length) return [];

  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const docs = buildIndex(chunks);
  const idf = new Map<string, number>();
  for (const term of queryTokens) idf.set(term, computeIdf(docs, term));

  const base = getKnowledgeBase(knowledgeBaseId);
  const scored: SearchResult[] = docs.map((doc) => {
    let score = 0;
    for (const term of queryTokens) {
      const tf = doc.tf.get(term) ?? 0;
      score += tf * (idf.get(term) ?? 0);
    }
    return {
      chunk: doc.chunk,
      score,
      source: getSource(doc.chunk.sourceId),
      knowledgeBase: base,
    };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Busca em todas as bases de um workspace, agregando os resultados. */
export function searchAcrossWorkspace(
  workspaceId: string,
  query: string,
  topK = 8,
): SearchResult[] {
  const bases = listKnowledgeBasesByWorkspace(workspaceId);
  const results: SearchResult[] = [];
  for (const base of bases) {
    results.push(...searchKnowledge(base.id, query, topK));
  }
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Formata resultados de busca em um bloco de contexto para injetar em prompts. */
export function buildContextBlock(results: SearchResult[], maxChars = 4000): string {
  if (!results.length) return "";
  const lines: string[] = ["### Contexto recuperado da Knowledge Base"];
  let total = 0;
  for (const result of results) {
    const title = result.source?.title ?? "Fonte";
    const excerpt = result.chunk.content.trim();
    const entry = `\n[${title}] (score ${result.score.toFixed(3)})\n${excerpt}`;
    if (total + entry.length > maxChars) break;
    lines.push(entry);
    total += entry.length;
  }
  return lines.join("\n");
}
