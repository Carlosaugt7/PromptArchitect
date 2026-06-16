import { useEffect, useRef, useState } from "react";
import { FolderUp, Github, Loader2, FileCode2, Trash2, FolderOpen, Plus } from "lucide-react";
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
  listSavedProjects,
  deleteProjectFromList,
  saveProject,
  type ImportedProject,
} from "@/lib/project-import";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (p: ImportedProject | null) => void;
}

export function ImportProjectDialog({ open, onOpenChange, onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [savedProjects, setSavedProjects] = useState<ImportedProject[]>([]);
  const folderRef = useRef<HTMLInputElement>(null);

  // Carrega chaves salvas e projetos salvos
  useEffect(() => {
    if (!open) return;
    setToken(localStorage.getItem("omniforge.integration.github_token") || "");
    setSavedProjects(listSavedProjects());
  }, [open]);

  const handleLocal = async (files: FileList | null) => {
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
      // Salva o token do GitHub também caso tenha sido digitado aqui
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
    // Se o projeto ativo foi deletado, limpa
    const current = localStorage.getItem("omniforge.project.current");
    if (!current) {
      onImported?.(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileCode2 className="h-4 w-4 text-primary" />
            Gerenciador de Projetos
          </DialogTitle>
          <DialogDescription>
            Importe novas pastas locais, clone repositórios do GitHub ou gerencie seus projetos abertos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={savedProjects.length > 0 ? "saved" : "local"} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="saved" className="gap-1.5 text-xs">
              <FolderOpen className="h-3.5 w-3.5" /> Projetos
            </TabsTrigger>
            <TabsTrigger value="local" className="gap-1.5 text-xs">
              <FolderUp className="h-3.5 w-3.5" /> Importar Pasta
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
                        {p.files.length} arquivos ·{" "}
                        {new Date(p.importedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button onClick={() => handleOpenSaved(p)} size="xs" variant="secondary">
                        Abrir
                      </Button>
                      <Button
                        onClick={() => handleDeleteSaved(p.id)}
                        size="xs"
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

          {/* Pasta Local */}
          <TabsContent value="local" className="space-y-3 pt-4">
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
              onChange={(e) => handleLocal(e.target.files)}
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
          </TabsContent>

          {/* GitHub */}
          <TabsContent value="github" className="space-y-3 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground font-medium">Link do Repositório</label>
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
                <span className="text-[9px] opacity-75">Opcional, mas exigido para repositórios privados</span>
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
            
            <Button onClick={handleGithub} disabled={busy || !url.trim()} className="w-full gap-2 mt-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              Clonar repositório
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
