// Gerenciamento de projetos locais via File System Access API.
// Usa showDirectoryPicker() para abrir pastas reais e IndexedDB para persistir handles.

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

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileNode[];
}

const KEY = "omniforge.project.current";
const MAX_INLINE = 128 * 1024;
const TEXT_EXT =
  /\.(ts|tsx|js|jsx|json|md|mdx|css|scss|html|yml|yaml|toml|txt|env|gitignore|prettierrc|sh|py|rs|go|java|kt|swift|rb|php|sql|vue|svelte)$/i;

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".output",
  ".tanstack",
  ".wrangler",
  "dist",
  "build",
  ".next",
  ".lovable",
  ".turbo",
  "__pycache__",
]);

// ---------- IndexedDB para persistir FileSystemDirectoryHandle ----------

const DB_NAME = "omniforge-handles";
const STORE_NAME = "directory-handles";

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(id: string, handle: FileSystemDirectoryHandle) {
  const db = await openHandleDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDirectoryHandle(id: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDirectoryHandle(id: string) {
  const db = await openHandleDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Ler árvore de diretório via FileSystemDirectoryHandle ----------

export async function readDirectoryTree(
  handle: FileSystemDirectoryHandle,
  relativePath = "",
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];

  for await (const [name, entryHandle] of (handle as any).entries()) {
    if (IGNORE_DIRS.has(name)) continue;
    if (name.startsWith(".") && name !== ".env") continue;

    const path = relativePath ? `${relativePath}/${name}` : name;

    if (entryHandle.kind === "directory") {
      const children = await readDirectoryTree(entryHandle as FileSystemDirectoryHandle, path);
      nodes.push({ name, path, type: "directory", children });
    } else {
      let size = 0;
      try {
        const file = await (entryHandle as FileSystemFileHandle).getFile();
        size = file.size;
      } catch {
        /* ignore */
      }
      nodes.push({ name, path, type: "file", size });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFileContent(
  handle: FileSystemDirectoryHandle,
  filePath: string,
): Promise<string> {
  const parts = filePath.split("/");
  let current: FileSystemDirectoryHandle = handle;

  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i]);
  }

  const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return file.text();
}

// ---------- Projetos (localStorage metadata) ----------

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

  const currentList = listSavedProjects();
  const index = currentList.findIndex((item) => item.id === p.id);
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
  const filtered = currentList.filter((item) => item.id !== id);
  localStorage.setItem(LIST_KEY, JSON.stringify(filtered));

  const current = loadProject();
  if (current?.id === id) {
    clearProject();
  }
  // Limpa handle do IndexedDB também
  deleteDirectoryHandle(id).catch(() => {});
}

export function clearProject() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

// ---------- Abrir pasta local com File System Access API ----------

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function openLocalDirectory(): Promise<{
  project: ImportedProject;
  handle: FileSystemDirectoryHandle;
}> {
  const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
  const tree = await readDirectoryTree(handle);
  const files = flattenTree(tree);

  const project: ImportedProject = {
    id: crypto.randomUUID(),
    name: handle.name,
    source: "local",
    files,
    importedAt: Date.now(),
  };

  await saveDirectoryHandle(project.id, handle);
  saveProject(project);

  return { project, handle };
}

function flattenTree(nodes: FileNode[], result: ImportedFile[] = []): ImportedFile[] {
  for (const node of nodes) {
    if (node.type === "file") {
      result.push({ path: node.path, size: node.size ?? 0 });
    } else if (node.children) {
      flattenTree(node.children, result);
    }
  }
  return result;
}

// ---------- Fallback: Upload via webkitdirectory ----------

async function readAsText(file: File): Promise<string | undefined> {
  if (file.size > MAX_INLINE) return undefined;
  if (!TEXT_EXT.test(file.name)) return undefined;
  try {
    return await file.text();
  } catch {
    return undefined;
  }
}

export async function importLocalFolder(fileList: FileList): Promise<ImportedProject> {
  const files: ImportedFile[] = [];
  const items = Array.from(fileList);
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

// ---------- GitHub Import ----------

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

export async function importFromGithub(
  url: string,
  githubToken?: string,
): Promise<ImportedProject> {
  const parsed = parseGithubUrl(url);
  if (!parsed) throw new Error("URL do GitHub inválida.");
  const { owner, repo, ref } = parsed;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }

  let branch = ref;
  if (!branch) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!r.ok) throw new Error(`Falha ao acessar ${owner}/${repo} (${r.status}).`);
    branch = ((await r.json()) as { default_branch: string }).default_branch;
  }

  const tr = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers },
  );
  if (!tr.ok) throw new Error(`Falha ao listar árvore (${tr.status}).`);
  const tree = (await tr.json()) as { tree: Array<{ path: string; type: string; size?: number }> };

  const blobs = tree.tree
    .filter((n) => n.type === "blob")
    .filter((n) => !/(^|\/)(node_modules|\.git|dist|build|\.next)(\/|$)/.test(n.path));

  const files: ImportedFile[] = [];
  const limit = 60;
  for (const node of blobs.slice(0, limit)) {
    let content: string | undefined;
    if (TEXT_EXT.test(node.path) && (node.size ?? 0) <= MAX_INLINE) {
      try {
        if (githubToken) {
          const apiFileRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${node.path}?ref=${branch}`,
            { headers },
          );
          if (apiFileRes.ok) {
            const fileData = await apiFileRes.json();
            if (fileData.encoding === "base64" && fileData.content) {
              content = atob(fileData.content.replace(/\s/g, ""));
            }
          }
        } else {
          const raw = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${node.path}`,
          );
          if (raw.ok) content = await raw.text();
        }
      } catch {
        /* ignore */
      }
    }
    files.push({ path: node.path, size: node.size ?? 0, content });
  }
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

// ---------- Artifact helper ----------

export function projectToArtifact(project: ImportedProject) {
  const mainFile = project.files.find((f) => f.content && /\.(tsx|jsx|html)$/i.test(f.path));
  return {
    id: project.id,
    title: project.name,
    lang: mainFile?.path.split(".").pop() || "tsx",
    code: mainFile?.content || `// Projeto: ${project.name}`,
    blocks: mainFile
      ? [{ lang: mainFile.path.split(".").pop() || "tsx", code: mainFile.content || "" }]
      : [],
    hasReact: mainFile ? /\.(tsx|jsx)$/i.test(mainFile.path) : false,
    html: "",
    updatedAt: Date.now(),
  };
}
