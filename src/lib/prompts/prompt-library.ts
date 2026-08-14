// Prompt Library — Biblioteca corporativa de prompts em pt-BR
import { safeUUID } from "../utils";
export { PROMT_LIBRARY_BUILTINS } from "./prompt-library-data";

export const PROMPT_CATEGORIES = [
  "customer_service","code_generation","content_creation","data_analysis",
  "security","documentation","architecture","education","business","creative",
] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  customer_service: "Atendimento ao Cliente", code_generation: "Geracao de Codigo",
  content_creation: "Criacao de Conteudo", data_analysis: "Analise de Dados",
  security: "Seguranca", documentation: "Documentacao", architecture: "Arquitetura",
  education: "Educacao", business: "Negocios", creative: "Criativo",
};

export interface LibraryPrompt {
  id: string; name: string; description: string; category: PromptCategory;
  tags: string[]; content: string; author: string;
  rating: number; ratingCount: number; usageCount: number;
  createdAt: number; updatedAt: number; isBuiltIn: boolean;
}

const LIBRARY_KEY = "omniforge.prompt-library";
const SEEDED_KEY = "omniforge.prompt-library.seeded";

function loadLibrary(): LibraryPrompt[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]") as LibraryPrompt[]; }
  catch { return []; }
}
function saveLibrary(prompts: LibraryPrompt[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(prompts));
  window.dispatchEvent(new Event("omniforge.prompt-library.changed"));
}
export function subscribeLibrary(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("omniforge.prompt-library.changed", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("omniforge.prompt-library.changed", h);
    window.removeEventListener("storage", h);
  };
}

function seedLibrary(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEEDED_KEY)) return;
  const existing = loadLibrary();
  if (existing.length > 0) { localStorage.setItem(SEEDED_KEY, "1"); return; }
  (async () => {
    const { PROMT_LIBRARY_BUILTINS } = await import("./prompt-library-data");
    const now = Date.now();
    const builtins: LibraryPrompt[] = PROMT_LIBRARY_BUILTINS.map((b, i) => ({
      ...b, id: safeUUID(), createdAt: now, updatedAt: now,
      rating: 4.0 + Math.random() * 1.0,
      ratingCount: Math.floor(50 + Math.random() * 250), usageCount: 0,
    }));
    saveLibrary(builtins);
    localStorage.setItem(SEEDED_KEY, "1");
  })();
}

export function getLibraryPrompts(category?: PromptCategory): LibraryPrompt[] {
  seedLibrary();
  const all = loadLibrary();
  if (category) return all.filter((p) => p.category === category);
  return all;
}

export function getPromptById(id: string): LibraryPrompt | null {
  seedLibrary();
  return loadLibrary().find((p) => p.id === id) ?? null;
}

export function addToLibrary(
  prompt: Omit<LibraryPrompt, "id"|"createdAt"|"updatedAt"|"usageCount"|"rating"|"ratingCount"|"isBuiltIn">
): LibraryPrompt {
  const now = Date.now();
  const entry: LibraryPrompt = { ...prompt, id: safeUUID(), createdAt: now, updatedAt: now,
    usageCount: 0, rating: 0, ratingCount: 0, isBuiltIn: false };
  const all = loadLibrary();
  all.unshift(entry);
  saveLibrary(all);
  return entry;
}

export function removeFromLibrary(id: string): boolean {
  const all = loadLibrary();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  saveLibrary(filtered);
  return true;
}

export function ratePrompt(id: string, rating: number): boolean {
  if (rating < 0 || rating > 5) return false;
  const all = loadLibrary();
  const prompt = all.find((p) => p.id === id);
  if (!prompt) return false;
  prompt.rating = ((prompt.rating * prompt.ratingCount) + rating) / (prompt.ratingCount + 1);
  prompt.ratingCount++;
  saveLibrary(all);
  return true;
}

export function incrementPromptUsage(id: string): void {
  const all = loadLibrary();
  const p = all.find((x) => x.id === id);
  if (p) { p.usageCount = (p.usageCount || 0) + 1; saveLibrary(all); }
}

export function searchLibrary(query: string): LibraryPrompt[] {
  seedLibrary();
  const q = query.toLowerCase().trim();
  if (!q) return loadLibrary();
  return loadLibrary().filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.tags.some((t) => t.toLowerCase().includes(q)) ||
    p.category.toLowerCase().includes(q)
  );
}

export function exportLibrary(): string {
  return JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), prompts: loadLibrary() }, null, 2);
}

export function importLibrary(json: string): { success: boolean; imported: number; error?: string } {
  try {
    const data = JSON.parse(json) as { prompts?: LibraryPrompt[] };
    if (!data.prompts || !Array.isArray(data.prompts)) return { success: false, imported: 0, error: "Formato invalido: array 'prompts' nao encontrado." };
    const existing = loadLibrary();
    const existingIds = new Set(existing.map((e) => e.id));
    let imported = 0;
    for (const p of data.prompts) {
      if (!p.id || !p.name) continue;
      if (existingIds.has(p.id)) { const idx = existing.findIndex((e) => e.id === p.id);
        if (idx !== -1) { existing[idx] = { ...existing[idx], ...p, updatedAt: Date.now() }; imported++; } }
      else { existing.push({ ...p, updatedAt: Date.now() }); existingIds.add(p.id); imported++; }
    }
    saveLibrary(existing);
    return { success: true, imported };
  } catch { return { success: false, imported: 0, error: "JSON invalido." }; }
}

export function resetLibrary(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LIBRARY_KEY);
  localStorage.removeItem(SEEDED_KEY);
  seedLibrary();
}
