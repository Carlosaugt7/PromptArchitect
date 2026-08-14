/**
 * System Design Canvas e documentos de arquitetura (Architecture Designer).
 * Persistência client-side via localStorage.
 */

import { safeUUID } from "@/lib/utils";
import type {
  ArchitectureDocument,
  SystemDesignCanvas,
  TechStackEntry,
} from "./types";

const DESIGNS_KEY = "promptarchitect.architecture.designs";
const DOCS_KEY = "promptarchitect.architecture.docs";
const DESIGNS_EVENT = "promptarchitect:architecture-designs-changed";
const DOCS_EVENT = "promptarchitect:architecture-docs-changed";

type Listener = () => void;

function loadDesigns(): SystemDesignCanvas[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DESIGNS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SystemDesignCanvas[];
  } catch {
    return [];
  }
}

function persistDesigns(designs: SystemDesignCanvas[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  window.dispatchEvent(new Event(DESIGNS_EVENT));
}

function loadDocs(): ArchitectureDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ArchitectureDocument[];
  } catch {
    return [];
  }
}

function persistDocs(docs: ArchitectureDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(DOCS_EVENT));
}

// ---------------------------------------------------------------------------
// System Design Canvas
// ---------------------------------------------------------------------------

/** Cria um novo System Design Canvas vazio. */
export function createSystemDesign(name: string, description = ""): SystemDesignCanvas {
  const design: SystemDesignCanvas = {
    id: safeUUID(),
    name: name.trim() || "Canvas sem nome",
    description,
    contexts: [],
    constraints: [],
    decisions: [],
    qualities: [],
    risks: [],
    alternatives: [],
  };
  const designs = loadDesigns();
  designs.push(design);
  persistDesigns(designs);
  return design;
}

/** Lista os System Design Canvas. */
export function listSystemDesigns(): SystemDesignCanvas[] {
  return loadDesigns();
}

/** Retorna um System Design Canvas pelo id, ou null se não existir. */
export function getSystemDesign(id: string): SystemDesignCanvas | null {
  return loadDesigns().find((d) => d.id === id) ?? null;
}

/** Atualiza os campos de um System Design Canvas. */
export function updateSystemDesign(
  id: string,
  patch: Partial<Omit<SystemDesignCanvas, "id">>,
): SystemDesignCanvas | null {
  const designs = loadDesigns();
  const index = designs.findIndex((d) => d.id === id);
  if (index < 0) return null;
  designs[index] = { ...designs[index], ...patch };
  persistDesigns(designs);
  return designs[index];
}

/** Remove um System Design Canvas. */
export function deleteSystemDesign(id: string): void {
  persistDesigns(loadDesigns().filter((d) => d.id !== id));
}

/** Assina mudanças no armazenamento de designs (evento local + "storage"). */
export function subscribeSystemDesigns(cb: Listener): () => void {
  const handler = () => cb();
  window.addEventListener(DESIGNS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(DESIGNS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// ---------------------------------------------------------------------------
// Documentos de Arquitetura
// ---------------------------------------------------------------------------

/** Cria um novo documento de arquitetura vazio. */
export function createArchitectureDocument(
  name: string,
  description = "",
): ArchitectureDocument {
  const now = Date.now();
  const doc: ArchitectureDocument = {
    id: safeUUID(),
    name: name.trim() || "Documento sem nome",
    description,
    c4Models: [],
    techStack: [],
    patterns: [],
    createdAt: now,
    updatedAt: now,
  };
  const docs = loadDocs();
  docs.push(doc);
  persistDocs(docs);
  return doc;
}

/** Lista os documentos de arquitetura ordenados por atualização. */
export function listArchitectureDocuments(): ArchitectureDocument[] {
  return loadDocs().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Retorna um documento de arquitetura pelo id, ou null se não existir. */
export function getArchitectureDocument(id: string): ArchitectureDocument | null {
  return loadDocs().find((d) => d.id === id) ?? null;
}

/** Atualiza os campos de um documento de arquitetura. */
export function updateArchitectureDocument(
  id: string,
  patch: Partial<Omit<ArchitectureDocument, "id" | "createdAt" | "updatedAt">>,
): ArchitectureDocument | null {
  const docs = loadDocs();
  const index = docs.findIndex((d) => d.id === id);
  if (index < 0) return null;
  docs[index] = { ...docs[index], ...patch, updatedAt: Date.now() };
  persistDocs(docs);
  return docs[index];
}

/** Remove um documento de arquitetura. */
export function deleteArchitectureDocument(id: string): void {
  persistDocs(loadDocs().filter((d) => d.id !== id));
}

/** Assina mudanças no armazenamento de documentos (evento local + "storage"). */
export function subscribeArchitectureDocuments(cb: Listener): () => void {
  const handler = () => cb();
  window.addEventListener(DOCS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(DOCS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Adiciona (ou substitui, se já existir com o mesmo nome) uma entrada na
 * stack tecnológica de um documento.
 */
export function addTechStackEntry(
  docId: string,
  entry: TechStackEntry,
): ArchitectureDocument | null {
  return updateArchitectureDocument(docId, {
    techStack: [
      ...(getArchitectureDocument(docId)?.techStack ?? []).filter(
        (e) => e.name !== entry.name,
      ),
      entry,
    ],
  });
}

/** Remove uma entrada da stack tecnológica de um documento pelo nome. */
export function removeTechStackEntry(
  docId: string,
  entryName: string,
): ArchitectureDocument | null {
  return updateArchitectureDocument(docId, {
    techStack: (getArchitectureDocument(docId)?.techStack ?? []).filter(
      (e) => e.name !== entryName,
    ),
  });
}

/** Vincula um modelo C4 a um documento (sem duplicar o vínculo). */
export function linkC4ModelToDocument(
  docId: string,
  c4ModelId: string,
): ArchitectureDocument | null {
  const current = getArchitectureDocument(docId)?.c4Models ?? [];
  if (current.includes(c4ModelId)) {
    return getArchitectureDocument(docId);
  }
  return updateArchitectureDocument(docId, { c4Models: [...current, c4ModelId] });
}
