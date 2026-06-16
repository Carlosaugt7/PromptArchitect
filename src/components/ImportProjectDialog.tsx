import { useRef, useState } from "react";
import { FolderUp, Github, Loader2, FileCode2 } from "lucide-react";
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
import { importFromGithub, importLocalFolder, type ImportedProject } from "@/lib/project-import";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (p: ImportedProject) => void;
}

export function ImportProjectDialog({ open, onOpenChange, onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const folderRef = useRef<HTMLInputElement>(null);

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
      const p = await importFromGithub(url.trim());
      toast.success("Repositório clonado", {
        description: `${p.files.length} arquivo(s) · ${p.name}`,
      });
      onImported?.(p);
      onOpenChange(false);
      setUrl("");
    } catch (e) {
      toast.error("Falha ao clonar do GitHub", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileCode2 className="h-4 w-4 text-primary" />
            Importar projeto
          </DialogTitle>
          <DialogDescription>
            Importe uma pasta local ou clone um repositório público do GitHub para usar como
            contexto.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="local" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local" className="gap-1.5">
              <FolderUp className="h-3.5 w-3.5" /> Pasta local
            </TabsTrigger>
            <TabsTrigger value="github" className="gap-1.5">
              <Github className="h-3.5 w-3.5" /> GitHub
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="github" className="space-y-3 pt-4">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              disabled={busy}
            />
            <p className="text-[11px] text-muted-foreground">
              Suporta repositórios públicos. Para grandes repositórios, apenas os primeiros 60
              arquivos têm conteúdo carregado (os demais ficam apenas indexados).
            </p>
            <Button onClick={handleGithub} disabled={busy || !url.trim()} className="w-full gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              Clonar repositório
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
