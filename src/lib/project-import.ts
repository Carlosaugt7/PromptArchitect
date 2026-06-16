// Importação de projetos: pasta local ou repositório GitHub público.
// Os arquivos ficam no localStorage (somente metadados + lista de paths +
// conteúdo de arquivos pequenos) para uso como contexto pelas LLMs.

export interface ImportedFile {
  path: string;
  size: number;
  /** conteúdo apenas para arquivos de texto pequenos (<128KB) */
  content?: string;
}

export interface ImportedProject {
  id: string;
  name: string;
  source: "local" | "github";
  url?: string;
  files: ImportedFile[];
  importedAt: number;
}

const KEY = "omniforge.project.current";
const MAX_INLINE = 128 * 1024;
const TEXT_EXT =
  /\.(ts|tsx|js|jsx|json|md|mdx|css|scss|html|yml|yaml|toml|txt|env|gitignore|prettierrc|sh|py|rs|go|java|kt|swift|rb|php|sql|vue|svelte)$/i;

export function loadProject(): ImportedProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImportedProject) : null;
  } catch {
    return null;
  }
}

const LIST_KEY = "omniforge.projects";

export function listSavedProjects(): ImportedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as ImportedProject[]) : [];
  } catch {
    return [];
  }
}

export function saveProject(p: ImportedProject) {
  localStorage.setItem(KEY, JSON.stringify(p));
  
  // Salva também na lista de projetos
  const currentList = listSavedProjects();
  const index = currentList.findIndex(item => item.id === p.id);
  if (index >= 0) {
    currentList[index] = p;
  } else {
    currentList.push(p);
  }
  localStorage.setItem(LIST_KEY, JSON.stringify(currentList));

  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

export function deleteProjectFromList(id: string) {
  const currentList = listSavedProjects();
  const filtered = currentList.filter(item => item.id !== id);
  localStorage.setItem(LIST_KEY, JSON.stringify(filtered));

  const current = loadProject();
  if (current?.id === id) {
    clearProject();
  }
}

export function clearProject() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

async function readAsText(file: File): Promise<string | undefined> {
  if (file.size > MAX_INLINE) return undefined;
  if (!TEXT_EXT.test(file.name)) return undefined;
  try {
    return await file.text();
  } catch {
    return undefined;
  }
}

/** Importa uma pasta local via input[webkitdirectory]. */
export async function importLocalFolder(fileList: FileList): Promise<ImportedProject> {
  const files: ImportedFile[] = [];
  const items = Array.from(fileList);
  // skip node_modules / .git
  const filtered = items.filter((f) => {
    const p = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    return !/(^|\/)(node_modules|\.git|dist|build|\.next|\.turbo)(\/|$)/.test(p);
  });
  for (const f of filtered) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    files.push({ path, size: f.size, content: await readAsText(f) });
  }
  const rootName = files[0]?.path.split("/")[0] ?? "projeto-local";
  const project: ImportedProject = {
    id: crypto.randomUUID(),
    name: rootName,
    source: "local",
    files,
    importedAt: Date.now(),
  };
  saveProject(project);
  return project;
}

/** Parse de URLs do GitHub: https://github.com/owner/repo[.git][/tree/branch] */
export function parseGithubUrl(url: string): { owner: string; repo: string; ref?: string } | null {
  try {
    const u = new URL(url.replace(/\.git$/, ""));
    if (!/github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo, , ref] = parts;
    return { owner, repo, ref };
  } catch {
    return null;
  }
}

/** Clona via API do GitHub (tarball estilo "git ls-tree"). Suporta token privado. */
export async function importFromGithub(url: string, githubToken?: string): Promise<ImportedProject> {
  const parsed = parseGithubUrl(url);
  if (!parsed) throw new Error("URL do GitHub inválida.");
  const { owner, repo, ref } = parsed;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }

  // Descobre branch default se ref não foi passado
  let branch = ref;
  if (!branch) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) throw new Error(`Falha ao acessar ${owner}/${repo} (${r.status}). Verifique se é privado ou se o token está correto.`);
    branch = ((await r.json()) as { default_branch: string }).default_branch;
  }

  // Lista a árvore completa
  const tr = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!tr.ok) throw new Error(`Falha ao listar árvore (${tr.status}).`);
  const tree = (await tr.json()) as { tree: Array<{ path: string; type: string; size?: number }> };

  const blobs = tree.tree
    .filter((n) => n.type === "blob")
    .filter((n) => !/(^|\/)(node_modules|\.git|dist|build|\.next)(\/|$)/.test(n.path));

  const files: ImportedFile[] = [];
  // baixa conteúdo dos arquivos de texto pequenos via API ou raw
  const limit = 60; // mantém leve
  for (const node of blobs.slice(0, limit)) {
    let content: string | undefined;
    if (TEXT_EXT.test(node.path) && (node.size ?? 0) <= MAX_INLINE) {
      try {
        if (githubToken) {
          // Repositórios privados exigem obter via API em base64
          const apiFileRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${node.path}?ref=${branch}`,
            { headers }
          );
          if (apiFileRes.ok) {
            const fileData = await apiFileRes.json();
            // A API do GitHub retorna em Base64
            if (fileData.encoding === "base64" && fileData.content) {
              content = atob(fileData.content.replace(/\s/g, ""));
            }
          }
        } else {
          // Repositórios públicos funcionam diretamente com raw.githubusercontent
          const raw = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${node.path}`
          );
          if (raw.ok) content = await raw.text();
        }
      } catch {
        /* ignore */
      }
    }
    files.push({ path: node.path, size: node.size ?? 0, content });
  }
  // arquivos restantes só com metadados
  for (const node of blobs.slice(limit)) {
    files.push({ path: node.path, size: node.size ?? 0 });
  }

  const project: ImportedProject = {
    id: crypto.randomUUID(),
    name: `${owner}/${repo}`,
    source: "github",
    url,
    files,
    importedAt: Date.now(),
  };
  saveProject(project);
  return project;
}
