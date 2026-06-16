import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  Terminal,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  Globe,
  Database,
  Lock,
} from "lucide-react";
import {
  readDirectoryTree,
  readFileContent,
  getDirectoryHandle,
  type FileNode,
  type ImportedProject,
  type ImportedFile,
} from "@/lib/project-import";

interface ProjectExplorerProps {
  project: ImportedProject | null;
  dirHandle: FileSystemDirectoryHandle | null;
  onSelectFile: (path: string, content: string) => void;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === ".env") return <Lock className="h-4 w-4 text-yellow-500" />;
  if (name.startsWith("package")) return <FileJson className="h-4 w-4 text-emerald-500" />;
  if (name === "Dockerfile" || name.includes("docker")) return <FileCode className="h-4 w-4 text-sky-500" />;

  switch (ext) {
    case "tsx":
    case "jsx":
      return <FileCode className="h-4 w-4 text-cyan-400" />;
    case "ts":
    case "js":
      return <FileCode className="h-4 w-4 text-amber-500" />;
    case "json":
      return <FileJson className="h-4 w-4 text-emerald-500" />;
    case "css":
    case "scss":
      return <FileCode className="h-4 w-4 text-pink-400" />;
    case "html":
      return <Globe className="h-4 w-4 text-orange-500" />;
    case "md":
    case "txt":
      return <FileText className="h-4 w-4 text-indigo-400" />;
    case "db":
    case "sqlite":
    case "sql":
      return <Database className="h-4 w-4 text-purple-400" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

// Converte lista plana de arquivos do projeto virtual em uma árvore
function buildTreeFromFiles(files: ImportedFile[]): FileNode[] {
  const root: FileNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;
    let accumulatedPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      let existingNode = currentLevel.find((node) => node.name === part);

      if (!existingNode) {
        existingNode = {
          name: part,
          path: accumulatedPath,
          type: isLast ? "file" : "directory",
          size: isLast ? file.size : undefined,
          children: isLast ? undefined : [],
        };
        currentLevel.push(existingNode);
      }

      if (!isLast && existingNode.children) {
        currentLevel = existingNode.children;
      }
    }
  }

  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .map((node) => {
        if (node.children) {
          node.children = sortNodes(node.children);
        }
        return node;
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  };

  return sortNodes(root);
}

function filterTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();

  return nodes
    .map((node) => {
      if (node.type === "file") {
        return node.name.toLowerCase().includes(q) ? node : null;
      }
      if (node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      return node.name.toLowerCase().includes(q) ? node : null;
    })
    .filter((n): n is FileNode => n !== null);
}

export function ProjectExplorer({ project, dirHandle, onSelectFile }: ProjectExplorerProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeHandle, setActiveHandle] = useState<FileSystemDirectoryHandle | null>(dirHandle);
  const [sourceLabel, setSourceLabel] = useState<string>("sem projeto");

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      // Prioridade 1: handle passado via prop
      let handle = dirHandle;

      // Prioridade 2: handle salvo no IndexedDB para o projeto atual
      if (!handle && project) {
        try {
          const saved = await getDirectoryHandle(project.id);
          if (saved) {
            // Verifica se temos permissão
            const perm = await (saved as any).queryPermission({ mode: "readwrite" });
            if (perm === "granted") {
              handle = saved;
            } else {
              const req = await (saved as any).requestPermission({ mode: "readwrite" });
              if (req === "granted") {
                handle = saved;
              }
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (handle) {
        const nodes = await readDirectoryTree(handle);
        setTree(nodes);
        setActiveHandle(handle);
        setSourceLabel(`${handle.name} (local)`);
        setLoading(false);
        return;
      }

      // Fallback: projeto virtual (GitHub/upload)
      if (project) {
        setTree(buildTreeFromFiles(project.files));
        setSourceLabel(project.name || "projeto virtual");
      } else {
        setTree([]);
        setSourceLabel("sem projeto");
      }
    } catch {
      // Fallback em caso de erro
      if (project) {
        setTree(buildTreeFromFiles(project.files));
        setSourceLabel(project.name || "projeto virtual");
      } else {
        setTree([]);
      }
    }
    setLoading(false);
  }, [dirHandle, project]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const filteredTree = useMemo(() => {
    return filterTree(tree, search);
  }, [tree, search]);

  const handleOpenFile = async (node: FileNode) => {
    if (node.type !== "file") return;

    // Tenta ler via handle local
    if (activeHandle) {
      try {
        const content = await readFileContent(activeHandle, node.path);
        onSelectFile(node.path, content);
        return;
      } catch {
        /* fallback abaixo */
      }
    }

    // Fallback do projeto virtual (GitHub/Local Upload)
    const virtualFile = project?.files.find((f) => f.path === node.path);
    onSelectFile(node.path, virtualFile?.content || "// [Sem conteúdo ou arquivo binário]");
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-card/25 backdrop-blur-xl">
      {/* Topo do Explorer */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 h-14 bg-background/25">
        <div>
          <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-primary" />
            Explorer
          </h3>
          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]">
            {sourceLabel}
          </p>
        </div>
        <button
          onClick={fetchTree}
          disabled={loading}
          className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Recarregar arquivos"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Caixa de Busca */}
      <div className="p-2 border-b border-border bg-background/10">
        <div className="relative flex items-center rounded-lg border border-border/80 bg-background/50 px-2.5 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar arquivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent pl-2 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Árvore de Arquivos */}
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-xs font-medium">Nenhum arquivo encontrado</p>
            <p className="text-[10px] opacity-75">
              {project ? "Recarregue ou filtre menos." : "Abra um projeto para ver os arquivos."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map((node) => (
              <ExplorerNode
                key={node.path}
                node={node}
                onOpenFile={handleOpenFile}
                searchTerm={search}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExplorerNodeProps {
  node: FileNode;
  onOpenFile: (node: FileNode) => void;
  depth?: number;
  searchTerm?: string;
}

function ExplorerNode({ node, onOpenFile, depth = 0, searchTerm = "" }: ExplorerNodeProps) {
  const [isOpen, setIsOpen] = useState(!!searchTerm);

  useEffect(() => {
    if (searchTerm) {
      setIsOpen(true);
    }
  }, [searchTerm]);

  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.type === "directory") {
      setIsOpen(!isOpen);
    } else {
      onOpenFile(node);
    }
  };

  return (
    <div className="select-none">
      <button
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className="flex w-full items-center gap-2 rounded-md py-1.5 text-left text-xs font-mono transition-all hover:bg-accent/40 text-foreground/80 hover:text-foreground"
      >
        <span className="text-muted-foreground/60">
          {node.type === "directory" ? (
            isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="w-3" />
          )}
        </span>

        <span className="flex-shrink-0">
          {node.type === "directory" ? (
            isOpen ? (
              <FolderOpen className="h-4 w-4 text-yellow-500" />
            ) : (
              <Folder className="h-4 w-4 text-yellow-600" />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>

        <span className="truncate flex-1">{node.name}</span>
        {node.size !== undefined && node.size > 0 && (
          <span className="text-[9px] text-muted-foreground/50 pr-2">
            {(node.size / 1024).toFixed(1)}k
          </span>
        )}
      </button>

      {node.type === "directory" && isOpen && hasChildren && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <ExplorerNode
              key={child.path}
              node={child}
              onOpenFile={onOpenFile}
              depth={depth + 1}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
