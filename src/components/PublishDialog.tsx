import { useEffect, useState } from "react";
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
import { Globe, Server, Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ open, onOpenChange }: Props) {
  const [easypanelWebhook, setEasypanelWebhook] = useState("");
  const [vercelWebhook, setVercelWebhook] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Carrega do localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    setEasypanelWebhook(localStorage.getItem("omniforge.publish.easypanel_url") || "");
    setVercelWebhook(localStorage.getItem("omniforge.publish.vercel_url") || "");
  }, [open]);

  const save = (key: string, val: string) => {
    localStorage.setItem(key, val);
    toast.success("Webhook salvo", { description: "Pronto para disparar o deploy remoto." });
  };

  const triggerDeploy = async (url: string, platform: string) => {
    if (!url.trim()) {
      toast.error("Erro", { description: "Por favor, insira uma URL de Webhook válida." });
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(url.trim(), { method: "POST" });
      // Webhooks de deploy geralmente retornam 2xx/200/201/202 ou até respondem com sucesso
      if (res.ok || res.status === 202) {
        toast.success(`Deploy iniciado no ${platform}!`, {
          description: "O servidor remoto recebeu a solicitação de build.",
        });
        onOpenChange(false);
      } else {
        toast.error("Falha ao disparar webhook", {
          description: `Resposta do servidor: ${res.status} ${res.statusText}`,
        });
      }
    } catch (err) {
      toast.error("Erro de Rede", {
        description: `Não foi possível chamar a URL: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Globe className="h-5 w-5 text-primary" />
            Publicar Aplicação
          </DialogTitle>
          <DialogDescription>
            Conecte webhooks de deploy para enviar as atualizações do código em tempo real para
            produção.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="easypanel" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="easypanel" className="gap-1.5 text-xs">
              <Server className="h-3.5 w-3.5" /> Easypanel / VPS
            </TabsTrigger>
            <TabsTrigger value="vercel" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Vercel
            </TabsTrigger>
          </TabsList>

          {/* VPS / Easypanel */}
          <TabsContent value="easypanel" className="space-y-4 pt-4">
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Insira a URL do **Redeploy Webhook** fornecida no painel do seu app no Easypanel. Ao
                clicar em publicar, chamaremos o webhook para forçar a VPS a baixar o código novo e
                recompilar o Dockerfile.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input
                    value={easypanelWebhook}
                    onChange={(e) => setEasypanelWebhook(e.target.value)}
                    placeholder="https://painel.seuip.com/api/hooks/deploy/..."
                    disabled={publishing}
                    className="bg-background/50 text-xs"
                  />
                  <Button
                    onClick={() => save("omniforge.publish.easypanel_url", easypanelWebhook)}
                    size="sm"
                    variant="outline"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => triggerDeploy(easypanelWebhook, "Easypanel")}
                disabled={publishing || !easypanelWebhook.trim()}
                className="w-full gap-2 mt-1"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Disparar Deploy VPS (Easypanel)
              </Button>
            </div>
          </TabsContent>

          {/* Vercel */}
          <TabsContent value="vercel" className="space-y-4 pt-4">
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cole o **Deploy Hook** criado no dashboard do seu projeto da Vercel (Configurações
                &gt; Git &gt; Deploy Hooks) para startar builds automáticos.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">
                  Deploy Hook URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={vercelWebhook}
                    onChange={(e) => setVercelWebhook(e.target.value)}
                    placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                    disabled={publishing}
                    className="bg-background/50 text-xs"
                  />
                  <Button
                    onClick={() => save("omniforge.publish.vercel_url", vercelWebhook)}
                    size="sm"
                    variant="outline"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => triggerDeploy(vercelWebhook, "Vercel")}
                disabled={publishing || !vercelWebhook.trim()}
                className="w-full gap-2 mt-1"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Disparar Deploy Vercel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
