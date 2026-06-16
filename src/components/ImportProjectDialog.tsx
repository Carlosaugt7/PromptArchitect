import { useEffect, useRef, useState } from "react";
import { FolderUp, Github, Loader2, FileCode2, Trash2, FolderOpen, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  importFromGithub,
  importLocalFolder,
  openLocalDirectory,
  isFileSystemAccessSupported,
  listSavedProjects,
  deleteProjectFromList,
  saveProject,
  type ImportedProject,
} from "@/lib/project-import";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (p: ImportedProject | null) => void;
  onDirectoryHandle?: (handle: FileSystemDirectoryHandle) => void;
  defaultTab?: "saved" | "local" | "github" | "new";
}

export function ImportProjectDialog({
  open,
  onOpenChange,
  onImported,
  onDirectoryHandle,
  defaultTab = "saved",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [savedProjects, setSavedProjects] = useState<ImportedProject[]>([]);
  const folderRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    if (!open) return;
    setToken(localStorage.getItem("omniforge.integration.github_token") || "");
    setSavedProjects(listSavedProjects());
    setActiveTab(defaultTab);
    setNewProjectName("");
  }, [open, defaultTab]);

  const handleOpenLocalFS = async () => {
    setBusy(true);
    try {
      const { project, handle } = await openLocalDirectory();
      toast.success("Pasta aberta", {
        description: `${project.files.length} arquivo(s) · ${project.name}`,
      });
      onImported?.(project);
      onDirectoryHandle?.(handle);
      onOpenChange(false);
    } catch (e: unknown) {
      const name = (e as Error).name;
      if (name !== "AbortError") {
        toast.error("Falha ao abrir pasta", { description: (e as Error).message });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLocalUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const p = await importLocalFolder(files);
      toast.success("Pasta importada", { description: `${p.files.length} arquivo(s) · ${p.name}` });
      onImported?.(p);
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha ao importar pasta", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleGithub = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const p = await importFromGithub(url.trim(), token.trim() || undefined);
      toast.success("Repositório clonado", {
        description: `${p.files.length} arquivo(s) · ${p.name}`,
      });
      if (token.trim()) {
        localStorage.setItem("omniforge.integration.github_token", token.trim());
      }
      onImported?.(p);
      onOpenChange(false);
      setUrl("");
    } catch (e) {
      toast.error("Falha ao clonar do GitHub", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSaved = (p: ImportedProject) => {
    saveProject(p);
    toast.success(`Projeto "${p.name}" aberto`);
    onImported?.(p);
    onOpenChange(false);
  };

  const handleDeleteSaved = (id: string) => {
    deleteProjectFromList(id);
    setSavedProjects(listSavedProjects());
    toast.success("Projeto removido da lista");
    const current = localStorage.getItem("omniforge.project.current");
    if (!current) {
      onImported?.(null);
    }
  };

  const handleNewProject = () => {
    const name = newProjectName.trim() || "Novo Projeto";
    const project: ImportedProject = {
      id: crypto.randomUUID(),
      name,
      source: "local",
      files: [
        {
          path: `${name}/index.html`,
          size: 200,
          content: `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8">\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>`,
        },
      ],
      importedAt: Date.now(),
    };
    saveProject(project);
    toast.success(`Projeto "${name}" criado`);
    onImported?.(project);
    onOpenChange(false);
  };

  const fsAccessSupported = isFileSystemAccessSupported();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileCode2 className="h-4 w-4 text-primary" />
            Gerenciador de Projetos
          </DialogTitle>
          <DialogDescription>
            Abra pastas locais, clone repositórios do GitHub ou gerencie seus projetos.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="mt-2"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="saved" className="gap-1.5 text-xs">
              <FolderOpen className="h-3.5 w-3.5" /> Projetos
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Novo
            </TabsTrigger>
            <TabsTrigger value="local" className="gap-1.5 text-xs">
              <FolderUp className="h-3.5 w-3.5" /> Pasta Local
            </TabsTrigger>
            <TabsTrigger value="github" className="gap-1.5 text-xs">
              <Github className="h-3.5 w-3.5" /> GitHub
            </TabsTrigger>
          </TabsList>

          {/* Projetos Salvos */}
          <TabsContent value="saved" className="space-y-3 pt-4">
            {savedProjects.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
                <p>Nenhum projeto importado ainda.</p>
                <p className="opacity-75">Use as abas ao lado para carregar arquivos.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3 hover:bg-card/70 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="font-semibold text-xs truncate flex items-center gap-1.5">
                        {p.source === "github" ? (
                          <Github className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                        )}
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {p.files.length} arquivos · {new Date(p.importedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button onClick={() => handleOpenSaved(p)} size="sm" variant="secondary">
                        Abrir
                      </Button>
                      <Button
                        onClick={() => handleDeleteSaved(p.id)}
                        size="sm"
                        variant="destructive"
                        className="p-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Novo Projeto */}
          <TabsContent value="new" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Crie um projeto em branco para começar a desenvolver do zero com IA.
            </p>
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground font-medium">
                Nome do Projeto
              </label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="meu-app-incrivel"
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNewProject();
                }}
              />
            </div>
            <Button onClick={handleNewProject} className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Criar Projeto
            </Button>
          </TabsContent>

          {/* Pasta Local */}
          <TabsContent value="local" className="space-y-3 pt-4">
            {fsAccessSupported ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Selecione a pasta raiz do seu projeto. Os arquivos serão lidos diretamente do seu
                  sistema — <strong>sem upload</strong>.
                </p>
                <Button onClick={handleOpenLocalFS} disabled={busy} className="w-full gap-2">
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="h-4 w-4" />
                  )}
                  Abrir pasta do projeto…
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Selecione a pasta raiz do seu projeto. Arquivos em <code>node_modules</code>,{" "}
                  <code>.git</code> e <code>dist</code> são ignorados automaticamente.
                </p>
                <input
                  ref={folderRef}
                  type="file"
                  // @ts-expect-error - atributos não-padrão suportados pelo Chromium
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => handleLocalUpload(e.target.files)}
                />
                <Button
                  onClick={() => folderRef.current?.click()}
                  disabled={busy}
                  className="w-full gap-2"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderUp className="h-4 w-4" />
                  )}
                  Escolher pasta…
                </Button>
              </>
            )}
          </TabsContent>

          {/* GitHub */}
          <TabsContent value="github" className="space-y-3 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground font-medium">
                Link do Repositório
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/usuario/repositorio"
                disabled={busy}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground font-medium flex justify-between">
                <span>GitHub Personal Access Token (PAT)</span>
                <span className="text-[9px] opacity-75">
                  Opcional, mas exigido para repositórios privados
                </span>
              </label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                disabled={busy}
                className="text-xs font-mono"
              />
            </div>

            <Button
              onClick={handleGithub}
              disabled={busy || !url.trim()}
              className="w-full gap-2 mt-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              Clonar repositório
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
