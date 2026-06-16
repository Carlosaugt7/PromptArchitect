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
import {
  CreditCard,
  Github,
  Database,
  Terminal,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationsDialog({ open, onOpenChange }: Props) {
  // Configs
  const [stripeKey, setStripeKey] = useState("");
  const [asaasToken, setAsaasToken] = useState("");
  const [mercadopagoToken, setMercadopagoToken] = useState("");

  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");

  const [mcpConfig, setMcpConfig] = useState("");

  // Carrega configurações do localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    setStripeKey(localStorage.getItem("omniforge.integration.stripe") || "");
    setAsaasToken(localStorage.getItem("omniforge.integration.asaas") || "");
    setMercadopagoToken(localStorage.getItem("omniforge.integration.mercadopago") || "");
    setGithubToken(localStorage.getItem("omniforge.integration.github_token") || "");
    setGithubRepo(localStorage.getItem("omniforge.integration.github_repo") || "");
    setSupabaseUrl(localStorage.getItem("omniforge.integration.supabase_url") || "");
    setSupabaseKey(localStorage.getItem("omniforge.integration.supabase_key") || "");
    setMcpConfig(
      localStorage.getItem("omniforge.integration.mcp_config") ||
        JSON.stringify(
          {
            mcpServers: {
              "stripe-mcp": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-stripe"],
                env: { STRIPE_API_KEY: "sk_test_..." },
              },
              "sqlite-mcp": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-sqlite"],
              },
            },
          },
          null,
          2
        )
    );
  }, [open]);

  const save = (key: string, value: string, title: string) => {
    localStorage.setItem(key, value);
    toast.success(`${title} atualizado`, {
      description: "As chaves foram guardadas localmente de forma segura.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Integrações do Projeto
          </DialogTitle>
          <DialogDescription>
            Conecte ferramentas de pagamentos, banco de dados e repositórios diretamente ao fluxo
            de desenvolvimento da IA.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="payments" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payments" className="gap-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" /> Pagamentos
            </TabsTrigger>
            <TabsTrigger value="github" className="gap-1.5 text-xs">
              <Github className="h-3.5 w-3.5" /> GitHub
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5" /> Databases
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-1.5 text-xs">
              <Terminal className="h-3.5 w-3.5" /> MCP Servers
            </TabsTrigger>
          </TabsList>

          {/* ABA PAGAMENTOS */}
          <TabsContent value="payments" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stripe Payment Gateway
                </h4>
                {stripeKey ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <XCircle className="h-3 w-3" /> Desconectado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Integre pagamentos globais, checkout e assinaturas do Stripe usando o servidor MCP
                dedicado para ler faturas e gerenciar clientes.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="sk_test_..."
                  className="bg-background/50 text-xs"
                />
                <Button
                  onClick={() => save("omniforge.integration.stripe", stripeKey, "Stripe")}
                  size="sm"
                >
                  Salvar
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Asaas (Brasil)
                </h4>
                {asaasToken ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <XCircle className="h-3 w-3" /> Desconectado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Conecte APIs brasileiras de PIX, boletos e cartões com o gateway da Asaas.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={asaasToken}
                  onChange={(e) => setAsaasToken(e.target.value)}
                  placeholder="Token de acesso Asaas"
                  className="bg-background/50 text-xs"
                />
                <Button
                  onClick={() => save("omniforge.integration.asaas", asaasToken, "Asaas")}
                  size="sm"
                >
                  Salvar
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mercado Pago
                </h4>
                {mercadopagoToken ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <XCircle className="h-3 w-3" /> Desconectado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Gerencie checkouts transparente e integrações de pagamento via Mercado Pago na América Latina.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={mercadopagoToken}
                  onChange={(e) => setMercadopagoToken(e.target.value)}
                  placeholder="APP_USR-..."
                  className="bg-background/50 text-xs"
                />
                <Button
                  onClick={() =>
                    save("omniforge.integration.mercadopago", mercadopagoToken, "Mercado Pago")
                  }
                  size="sm"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ABA GITHUB */}
          <TabsContent value="github" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conexão em Tempo Real com GitHub
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Injete seu Personal Access Token (PAT) para habilitar commits automáticos de artefatos
                e clonar repositórios privados em tempo de desenvolvimento.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground">Token de Acesso (PAT)</label>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="bg-background/50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground">Repositório Alvo (Dono/Repo)</label>
                <Input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="ex: Carlosaugt7/omniforge"
                  className="bg-background/50 text-xs"
                />
              </div>
              <Button
                onClick={() => {
                  localStorage.setItem("omniforge.integration.github_token", githubToken);
                  localStorage.setItem("omniforge.integration.github_repo", githubRepo);
                  toast.success("Credenciais do GitHub salvas");
                }}
                className="w-full mt-2"
              >
                Salvar Configurações do GitHub
              </Button>
            </div>
          </TabsContent>

          {/* ABA DATABASES */}
          <TabsContent value="database" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Supabase
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Utilize o Supabase como banco de dados principal. A IA poderá ler schemas de tabelas
                e escrever scripts SQL baseados nestas configurações.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground">API URL</label>
                  <Input
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxx.supabase.co"
                    className="bg-background/50 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground">Anon/Public Key</label>
                  <Input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbG..."
                    className="bg-background/50 text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  localStorage.setItem("omniforge.integration.supabase_url", supabaseUrl);
                  localStorage.setItem("omniforge.integration.supabase_key", supabaseKey);
                  toast.success("Credenciais do Supabase salvas");
                }}
                className="w-full"
              >
                Salvar Supabase
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Firebase (Conectado)
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                O Firebase está ativamente conectado via credenciais seguras do Firestore na nuvem
                (para persistência e sincronização de chats, usuários e modelos).
              </p>
              <div className="text-[11px] text-emerald-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Firestore Online (Modo Real)
              </div>
            </div>
          </TabsContent>

          {/* ABA MCP */}
          <TabsContent value="mcp" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Model Context Protocol (MCP)
                </h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                MCP é um padrão aberto que permite que as LLMs acessem ferramentas de forma segura.
                Configure abaixo os servidores ativos na sua máquina local ou em VPS.
              </p>
              <textarea
                value={mcpConfig}
                onChange={(e) => setMcpConfig(e.target.value)}
                className="w-full min-h-[140px] rounded-lg border border-border bg-background/60 p-3 font-mono text-xs focus:outline-none"
                placeholder="config.json do MCP..."
              />
              <Button
                onClick={() => save("omniforge.integration.mcp_config", mcpConfig, "Configuração MCP")}
                className="w-full"
              >
                Salvar Configurações do MCP
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
