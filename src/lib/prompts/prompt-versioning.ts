// Prompt Version Control — Controle de versão semântico para prompts de IA
// Armazena versões, diffs e metadados no localStorage

import { safeUUID } from "../utils";

export interface PromptVersion {
  id: string;
  promptId: string;
  version: string; // semver: major.minor.patch
  content: string;
  changelog: string;
  author: string;
  createdAt: number;
  isActive: boolean;
}

export interface PromptEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  currentVersion: string;
  versions: PromptVersion[];
  usageCount: number;
  createdAt: number;
  updatedAt: number;
  /** ID do prompt do qual este foi forkado, se aplicável */
  forkedFrom?: string;
}

export interface DiffResult {
  additions: { line: number; content: string }[];
  removals: { line: number; content: string }[];
  modifications: { lineA: number; lineB: number; contentA: string; contentB: string }[];
  stats: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    totalChanges: number;
  };
}

// ---- localStorage helpers ----

const STORAGE_KEY = "omniforge.prompts.entries";

function loadEntries(): PromptEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as PromptEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: PromptEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("omniforge.prompts.changed"));
}

/** Escuta mudanças no localStorage de prompts */
export function subscribePrompts(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("omniforge.prompts.changed", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("omniforge.prompts.changed", h);
    window.removeEventListener("storage", h);
  };
}

/** Gera o próximo número de versão com base no changelog */
function bumpVersion(current: string, changelog: string): string {
  const parts = current.split(".").map(Number);
  if (parts.length !== 3) return "1.0.0";

  const lower = changelog.toLowerCase();
  // Breaking change → major
  if (
    lower.includes("breaking") ||
    lower.includes("quebra") ||
    lower.includes("incompatível") ||
    lower.includes("reestrutura")
  ) {
    return `${parts[0] + 1}.0.0`;
  }
  // Nova funcionalidade → minor
  if (
    lower.includes("adiciona") ||
    lower.includes("novo") ||
    lower.includes("feature") ||
    lower.includes("funcionalidade") ||
    lower.includes("inclui")
  ) {
    return `${parts[0]}.${parts[1] + 1}.0`;
  }
  // Ajuste/correção → patch
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

// ---- CRUD ----

export function createPrompt(
  name: string,
  description: string,
  category: string,
  tags: string[] = [],
  initialContent: string = "",
): PromptEntry {
  const id = safeUUID();
  const now = Date.now();
  const version: PromptVersion = {
    id: safeUUID(),
    promptId: id,
    version: "1.0.0",
    content: initialContent,
    changelog: "Versão inicial",
    author: "PromptArchitect",
    createdAt: now,
    isActive: true,
  };

  const entry: PromptEntry = {
    id,
    name: name.trim(),
    description: description.trim(),
    category,
    tags,
    currentVersion: "1.0.0",
    versions: [version],
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  return entry;
}

export function saveVersion(
  promptId: string,
  content: string,
  changelog: string,
  author: string = "PromptArchitect",
): PromptVersion | null {
  const entries = loadEntries();
  const idx = entries.findIndex((e) => e.id === promptId);
  if (idx === -1) return null;

  const entry = entries[idx];

  // Desativar versão atual
  entry.versions.forEach((v) => (v.isActive = false));

  const newVersionStr = bumpVersion(entry.currentVersion, changelog);
  const newVersion: PromptVersion = {
    id: safeUUID(),
    promptId,
    version: newVersionStr,
    content,
    changelog: changelog.trim() || "Atualização sem descrição",
    author,
    createdAt: Date.now(),
    isActive: true,
  };

  entry.versions.push(newVersion);
  entry.currentVersion = newVersionStr;
  entry.updatedAt = Date.now();

  entries[idx] = entry;
  saveEntries(entries);
  return newVersion;
}

export function getPrompt(id: string): PromptEntry | null {
  return loadEntries().find((e) => e.id === id) ?? null;
}

export function listPrompts(filters?: {
  category?: string;
  tags?: string[];
  search?: string;
}): PromptEntry[] {
  let entries = loadEntries();

  if (filters?.category) {
    entries = entries.filter((e) => e.category === filters.category);
  }
  if (filters?.tags?.length) {
    entries = entries.filter((e) =>
      filters.tags!.some((t) => e.tags.some((et) => et.toLowerCase().includes(t.toLowerCase()))),
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function searchPrompts(query: string): PromptEntry[] {
  if (!query.trim()) return listPrompts();
  const q = query.toLowerCase();
  return loadEntries()
    .filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        e.versions.some((v) => v.content.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deletePrompt(id: string): boolean {
  const entries = loadEntries();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  saveEntries(filtered);
  return true;
}

export function forkPrompt(id: string): PromptEntry | null {
  const source = getPrompt(id);
  if (!source) return null;

  const activeVersion = source.versions.find((v) => v.isActive);
  const content = activeVersion?.content ?? source.versions[0]?.content ?? "";

  const fork = createPrompt(
    `${source.name} (cópia)`,
    source.description,
    source.category,
    [...source.tags],
    content,
  );

  fork.forkedFrom = id;
  const entries = loadEntries();
  const idx = entries.findIndex((e) => e.id === fork.id);
  if (idx !== -1) {
    entries[idx] = fork;
    saveEntries(entries);
  }

  return fork;
}

export function incrementUsage(promptId: string): void {
  const entries = loadEntries();
  const entry = entries.find((e) => e.id === promptId);
  if (!entry) return;
  entry.usageCount = (entry.usageCount || 0) + 1;
  saveEntries(entries);
}

export function setActiveVersion(promptId: string, versionId: string): boolean {
  const entries = loadEntries();
  const entry = entries.find((e) => e.id === promptId);
  if (!entry) return false;

  const version = entry.versions.find((v) => v.id === versionId);
  if (!version) return false;

  entry.versions.forEach((v) => (v.isActive = v.id === versionId));
  entry.currentVersion = version.version;
  entry.updatedAt = Date.now();
  saveEntries(entries);
  return true;
}

export function updatePromptMeta(
  id: string,
  updates: Partial<Pick<PromptEntry, "name" | "description" | "category" | "tags">>,
): boolean {
  const entries = loadEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return false;

  if (updates.name !== undefined) entry.name = updates.name.trim();
  if (updates.description !== undefined) entry.description = updates.description.trim();
  if (updates.category !== undefined) entry.category = updates.category;
  if (updates.tags !== undefined) entry.tags = updates.tags;
  entry.updatedAt = Date.now();
  saveEntries(entries);
  return true;
}

// ---- Diff ----

export function diffVersions(v1: PromptVersion, v2: PromptVersion): DiffResult {
  const lines1 = v1.content.split("\n");
  const lines2 = v2.content.split("\n");

  const additions: DiffResult["additions"] = [];
  const removals: DiffResult["removals"] = [];
  const modifications: DiffResult["modifications"] = [];

  // Algoritmo LCS simplificado para diff linha a linha
  const maxLen = Math.max(lines1.length, lines2.length);
  let i = 0;
  let j = 0;

  while (i < lines1.length || j < lines2.length) {
    if (i >= lines1.length) {
      // Linhas restantes em v2 são adições
      while (j < lines2.length) {
        additions.push({ line: j + 1, content: lines2[j] });
        j++;
      }
      break;
    }
    if (j >= lines2.length) {
      // Linhas restantes em v1 são remoções
      while (i < lines1.length) {
        removals.push({ line: i + 1, content: lines1[i] });
        i++;
      }
      break;
    }

    if (lines1[i] === lines2[j]) {
      i++;
      j++;
      continue;
    }

    // Busca a próxima ocorrência da linha atual de v1 em v2
    const nextInV2 = lines2.indexOf(lines1[i], j);
    const nextInV1 = lines1.indexOf(lines2[j], i);

    if (
      nextInV2 !== -1 &&
      (nextInV1 === -1 || nextInV2 - j <= nextInV1 - i)
    ) {
      // Linhas em v2 antes do match são adições
      while (j < nextInV2) {
        additions.push({ line: j + 1, content: lines2[j] });
        j++;
      }
    } else if (
      nextInV1 !== -1 &&
      (nextInV2 === -1 || nextInV1 - i < nextInV2 - j)
    ) {
      // Linhas em v1 antes do match são remoções
      while (i < nextInV1) {
        removals.push({ line: i + 1, content: lines1[i] });
        i++;
      }
    } else {
      // Modificação direta
      modifications.push({
        lineA: i + 1,
        lineB: j + 1,
        contentA: lines1[i],
        contentB: lines2[j],
      });
      i++;
      j++;
    }
  }

  return {
    additions,
    removals,
    modifications,
    stats: {
      linesAdded: additions.length,
      linesRemoved: removals.length,
      linesModified: modifications.length,
      totalChanges: additions.length + removals.length + modifications.length,
    },
  };
}

// ---- Export/Import ----

export function exportPrompts(): string {
  const entries = loadEntries();
  return JSON.stringify(
    {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      entries,
    },
    null,
    2,
  );
}

export function importPrompts(json: string): { success: boolean; imported: number; error?: string } {
  try {
    const data = JSON.parse(json) as { version?: string; entries?: PromptEntry[]; exportedAt?: string };
    if (!data.entries || !Array.isArray(data.entries)) {
      return { success: false, imported: 0, error: "Formato inválido: array 'entries' não encontrado." };
    }

    const existing = loadEntries();
    const existingIds = new Set(existing.map((e) => e.id));
    let imported = 0;

    for (const entry of data.entries) {
      if (!entry.id || !entry.name) continue;

      if (existingIds.has(entry.id)) {
        // Atualiza existente
        const idx = existing.findIndex((e) => e.id === entry.id);
        if (idx !== -1) {
          existing[idx] = { ...existing[idx], ...entry, updatedAt: Date.now() };
          imported++;
        }
      } else {
        // Adiciona novo
        existing.push({ ...entry, updatedAt: Date.now() });
        existingIds.add(entry.id);
        imported++;
      }
    }

    saveEntries(existing);
    return { success: true, imported };
  } catch {
    return { success: false, imported: 0, error: "JSON inválido ou corrompido." };
  }
}
