import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  UserCog,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PROVIDERS,
  DEFAULT_MODELS,
  type ProviderId,
  type ProvidersState,
  loadProviders,
  saveProviders,
  fetchModels,
} from "@/lib/llm-providers";
import { loadDirectives, saveDirectives, type LlmDirectives } from "@/lib/llm-directives";
import { getUserId, setUserId } from "@/lib/chat-history";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (state: ProvidersState) => void;
}

export function LlmSettingsDialog({ open, onOpenChange, onSaved }: Props) {
  const [state, setState] = useState<ProvidersState>({});
  const [tab, setTab] = useState<ProviderId>("openai");

  useEffect(() => {
    if (open) setState(loadProviders());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            Configurações de IA
          </DialogTitle>
          <DialogDescription>
            Conecte provedores de LLM e defina o Agente e as Rules globais — aplicadas a todas as
            chamadas.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="providers" className="mt-2">
          <TabsList className="grid grid-cols-5 bg-muted/40">
            <TabsTrigger value="providers">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Provedores
            </TabsTrigger>
            <TabsTrigger value="agent">
              <UserCog className="h-3.5 w-3.5 mr-1.5" /> Agente
            </TabsTrigger>
            <TabsTrigger value="rules">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Rules
            </TabsTrigger>
            <TabsTrigger value="cli">
              <Terminal className="h-3.5 w-3.5 mr-1.5" /> CLIs
            </TabsTrigger>
            <TabsTrigger value="user">
              <UserCog className="h-3.5 w-3.5 mr-1.5" /> Sessão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="mt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as ProviderId)}>
              <TabsList className="grid grid-cols-7 bg-muted/40">
                {PROVIDERS.map((p) => (
                  <TabsTrigger key={p.id} value={p.id} className="text-xs relative">
                    {p.name}
                    {state[p.id]?.apiKey && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-success" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PROVIDERS.map((p) => (
                <TabsContent key={p.id} value={p.id} className="mt-4">
                  <ProviderForm
                    providerId={p.id}
                    state={state}
                    onChange={(next) => {
                      setState(next);
                      saveProviders(next);
                      onSaved?.(next);
                    }}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="agent" className="mt-4">
            <DirectivesForm field="agent" open={open} />
          </TabsContent>
          <TabsContent value="rules" className="mt-4">
            <DirectivesForm field="rules" open={open} />
          </TabsContent>
          <TabsContent value="cli" className="mt-4">
            <CliForm />
          </TabsContent>
          <TabsContent value="user" className="mt-4">
            <UserForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DirectivesForm({ field, open }: { field: "agent" | "rules"; open: boolean }) {
  const [data, setData] = useState<LlmDirectives>(() => loadDirectives());
  const [value, setValue] = useState<string>(data[field]);

  useEffect(() => {
    if (open) {
      const fresh = loadDirectives();
      setData(fresh);
      setValue(fresh[field]);
    }
  }, [open, field]);

  const meta =
    field === "agent"
      ? {
          title: "Persona do Agente",
          description:
            "Define quem é a IA, seu tom e responsabilidades. Será injetado no system prompt de TODAS as LLMs.",
          placeholder: "Você é o OmniForge, um agente de engenharia...",
          rows: 10,
        }
      : {
          title: "Regras obrigatórias",
          description:
            "Restrições e padrões que TODA LLM deve seguir integralmente em qualquer resposta.",
          placeholder: "1. Sempre responda em pt-BR.\n2. Nunca invente APIs...",
          rows: 12,
        };

  function handleSave() {
    const next = saveDirectives({
      agent: field === "agent" ? value : data.agent,
      rules: field === "rules" ? value : data.rules,
    });
    setData(next);
    toast.success(field === "agent" ? "Agente atualizado" : "Rules atualizadas");
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-sm">{meta.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={meta.placeholder}
        rows={meta.rows}
        className="font-mono text-xs resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {data.updatedAt
            ? `Salvo em ${new Date(data.updatedAt).toLocaleString("pt-BR")}`
            : "Ainda não salvo"}
        </span>
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow"
        >
          <Save className="h-4 w-4 mr-1.5" /> Salvar
        </Button>
      </div>
    </div>
  );
}
function ProviderForm({
  providerId,
  state,
  onChange,
}: {
  providerId: ProviderId;
  state: ProvidersState;
  onChange: (s: ProvidersState) => void;
}) {
  const provider = useMemo(() => PROVIDERS.find((p) => p.id === providerId)!, [providerId]);
  const saved = state[providerId];

  const [apiKey, setApiKey] = useState(() => {
    const s = saved?.apiKey ?? "";
    return s === "ollama" ? "" : s;
  });
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? provider.defaultBaseUrl);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>(saved?.models ?? []);
  const [customModelInput, setCustomModelInput] = useState("");

  useEffect(() => {
    const s = state[providerId];
    setApiKey(s?.apiKey ?? "");
    setBaseUrl(s?.baseUrl ?? provider.defaultBaseUrl);
    setModels(s?.models ?? []);
  }, [providerId, state, provider.defaultBaseUrl]);

  function handleAddManualModel() {
    const name = customModelInput.trim();
    if (!name) return;
    if (models.includes(name)) {
      toast.info("Este modelo já está na lista.");
      return;
    }
    const nextModels = [...models, name];
    setModels(nextModels);
    setCustomModelInput("");
    if (apiKey.trim()) {
      const base = saved ?? { models: [], enabled: [] };
      const nextEnabled = Array.from(new Set([...(base.enabled ?? []), name]));
      const nextState: ProvidersState = {
        ...state,
        [providerId]: {
          ...base,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || provider.defaultBaseUrl,
          models: nextModels,
          enabled: nextEnabled,
          updatedAt: Date.now(),
        },
      };
      onChange(nextState);
    }
    toast.success(`Modelo "${name}" adicionado!`);
  }

  async function handleTest() {
    if (!apiKey.trim()) {
      toast.error("Informe a chave de API");
      return;
    }
    if (!baseUrl.trim()) {
      toast.error("Informe a URL base");
      return;
    }
    setLoading(true);
    const effectiveKey = apiKey.trim();
    try {
      const list = await fetchModels(providerId, effectiveKey, baseUrl.trim());
      setModels(list);
      const next: ProvidersState = {
        ...state,
        [providerId]: {
          apiKey: effectiveKey,
          baseUrl: baseUrl.trim(),
          models: list,
          enabled: list,
          updatedAt: Date.now(),
        },
      };
      onChange(next);
      toast.success(`${list.length} modelos detectados em ${provider.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao consultar a API";
      toast.error(`Erro ao conectar: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    const next = { ...state };
    delete next[providerId];
    onChange(next);
    setApiKey("");
    setModels([]);
    setBaseUrl(provider.defaultBaseUrl);
    toast.success(`${provider.name} desconectado`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">{provider.name}</h3>
          {provider.helpUrl && (
            <a
              href={provider.helpUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              Obter chave <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {saved && (
          <Badge variant="outline" className="text-success border-success/40 bg-success/10">
            <Check className="h-3 w-3 mr-1" /> Conectado
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${providerId}-key`}>Chave de API</Label>
        <div className="relative">
          <Input
            id={`${providerId}-key`}
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider.keyPlaceholder}
            className="pr-10 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${providerId}-url`}>
          URL base {provider.needsBaseUrl && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id={`${providerId}-url`}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={provider.defaultBaseUrl || "https://sua-api.com/v1"}
          className="font-mono text-xs"
        />
        {!provider.needsBaseUrl && (
          <p className="text-[11px] text-muted-foreground">
            Padrão do provedor. Altere apenas para usar um proxy compatível.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${providerId}-manual-model`}>Adicionar modelo manualmente</Label>
        <div className="flex gap-2">
          <Input
            id={`${providerId}-manual-model`}
            value={customModelInput}
            onChange={(e) => setCustomModelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddManualModel();
              }
            }}
            placeholder="ex: llama-3, gpt-4o, my-custom-model"
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddManualModel}
            className="text-xs"
          >
            + Adicionar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          onClick={handleTest}
          disabled={loading}
          className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Detectando…
            </>
          ) : (
            <>Testar & detectar modelos</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!apiKey.trim()) {
              toast.error("Informe a chave de API");
              return;
            }
            const effectiveKey = apiKey.trim();
            const base = saved ?? { models: [], enabled: [] };
            const defaults = DEFAULT_MODELS[providerId] ?? [];
            const finalModels = base.models?.length ? base.models : defaults;
            const finalEnabled = base.enabled?.length ? base.enabled : finalModels;
            const next: ProvidersState = {
              ...state,
              [providerId]: {
                ...base,
                apiKey: effectiveKey,
                baseUrl: baseUrl.trim() || provider.defaultBaseUrl,
                models: finalModels,
                enabled: finalEnabled,
                updatedAt: Date.now(),
              },
            };
            onChange(next);
            setModels(finalModels);
            toast.success(`${provider.name} salvo · ${finalEnabled.length} modelos disponíveis`);
          }}
        >
          <Save className="h-4 w-4 mr-1.5" /> Salvar
        </Button>
        {saved && (
          <Button
            variant="outline"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Remover
          </Button>
        )}
      </div>

      {models.length > 0 && (
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {models.length} modelos · {saved?.enabled?.length ?? 0} habilitados na tela de dev
            </span>
            <div className="flex items-center gap-2">
              <button
                className="text-[11px] text-primary hover:underline"
                onClick={() => {
                  const effectiveKey = apiKey.trim();
                  const next: ProvidersState = {
                    ...state,
                    [providerId]: {
                      ...(saved ?? {
                        apiKey: effectiveKey,
                        baseUrl,
                        models,
                        updatedAt: Date.now(),
                      }),
                      enabled: [...models],
                    },
                  };
                  onChange(next);
                }}
              >
                Todos
              </button>
              <button
                className="text-[11px] text-muted-foreground hover:underline"
                onClick={() => {
                  if (!saved) return;
                  const next: ProvidersState = {
                    ...state,
                    [providerId]: { ...saved, enabled: [] },
                  };
                  onChange(next);
                }}
              >
                Nenhum
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5">
            {models.map((m) => {
              const on = saved?.enabled?.includes(m) ?? false;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const effectiveKey = apiKey.trim();
                    const base = saved ?? {
                      apiKey: effectiveKey,
                      baseUrl,
                      models,
                      updatedAt: Date.now(),
                    };
                    const enabled = new Set(base.enabled ?? []);
                    if (enabled.has(m)) enabled.delete(m);
                    else enabled.add(m);
                    onChange({ ...state, [providerId]: { ...base, enabled: [...enabled] } });
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-mono transition-colors ${
                    on
                      ? "border-primary/60 bg-primary/15 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {on && <Check className="inline h-3 w-3 mr-1" />}
                  {m}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Clique para marcar quais modelos aparecerão no seletor da caixa de mensagens.
          </p>
        </div>
      )}
    </div>
  );
}

function UserForm() {
  const [userId, setInputUserId] = useState(() => getUserId());

  function handleSave() {
    if (!userId.trim()) {
      toast.error("O ID de usuário não pode ser vazio");
      return;
    }
    setUserId(userId.trim());
    toast.success("Sessão do usuário atualizada!");
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm font-display">Identidade de Sessão (Multiusuário)</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Altere o ID abaixo para simular diferentes sessões de usuário ou sincronizar com outra
          conta no Firestore.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-session-id">User ID</Label>
        <Input
          id="user-session-id"
          value={userId}
          onChange={(e) => setInputUserId(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const randomId = "user-" + Math.random().toString(36).substring(2, 9);
            setInputUserId(randomId);
          }}
          className="text-xs"
        >
          Gerar Novo ID
        </Button>
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow"
        >
          <Save className="h-4 w-4 mr-1.5" /> Atualizar Sessão
        </Button>
      </div>
    </div>
  );
}

function CliForm() {
  const [aiderCmd, setAiderCmd] = useState(
    () => localStorage.getItem("omniforge.cli.aider.command") ?? "aider",
  );
  const [aiderKey, setAiderKey] = useState(
    () => localStorage.getItem("omniforge.cli.aider.key") ?? "",
  );

  const [geminiCmd, setGeminiCmd] = useState(
    () => localStorage.getItem("omniforge.cli.gemini.command") ?? "gemini-cli",
  );
  const [geminiKey, setGeminiKey] = useState(
    () => localStorage.getItem("omniforge.cli.gemini.key") ?? "",
  );

  const [codexCmd, setCodexCmd] = useState(
    () => localStorage.getItem("omniforge.cli.codex.command") ?? "codex-cli",
  );
  const [codexKey, setCodexKey] = useState(
    () => localStorage.getItem("omniforge.cli.codex.key") ?? "",
  );

  const [opencodeCmd, setOpencodeCmd] = useState(
    () => localStorage.getItem("omniforge.cli.opencode.command") ?? "opencode",
  );
  const [opencodeKey, setOpencodeKey] = useState(
    () => localStorage.getItem("omniforge.cli.opencode.key") ?? "",
  );

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  function handleSave() {
    localStorage.setItem("omniforge.cli.aider.command", aiderCmd.trim());
    localStorage.setItem("omniforge.cli.aider.key", aiderKey.trim());

    localStorage.setItem("omniforge.cli.gemini.command", geminiCmd.trim());
    localStorage.setItem("omniforge.cli.gemini.key", geminiKey.trim());

    localStorage.setItem("omniforge.cli.codex.command", codexCmd.trim());
    localStorage.setItem("omniforge.cli.codex.key", codexKey.trim());

    localStorage.setItem("omniforge.cli.opencode.command", opencodeCmd.trim());
    localStorage.setItem("omniforge.cli.opencode.key", opencodeKey.trim());

    toast.success("Configurações das CLIs salvas!");
  }

  const toggleShowKey = (tool: string) => {
    setShowKeys((prev) => ({ ...prev, [tool]: !prev[tool] }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm font-display">Integração com CLIs de Código</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Configure os caminhos dos comandos e as variáveis de ambiente (como chaves de API)
          dedicadas para cada ferramenta executada no terminal.
        </p>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
        {/* AIDER */}
        <div className="border border-border bg-background/30 p-3 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aider AI
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Comando de Execução</Label>
              <Input
                value={aiderCmd}
                onChange={(e) => setAiderCmd(e.target.value)}
                placeholder="aider"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">OPENAI_API_KEY / ANTHROPIC_API_KEY dedicada</Label>
              <div className="relative">
                <Input
                  type={showKeys["aider"] ? "text" : "password"}
                  value={aiderKey}
                  onChange={(e) => setAiderKey(e.target.value)}
                  placeholder="sk-..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("aider")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys["aider"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* GEMINI CLI */}
        <div className="border border-border bg-background/30 p-3 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gemini CLI
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Comando de Execução</Label>
              <Input
                value={geminiCmd}
                onChange={(e) => setGeminiCmd(e.target.value)}
                placeholder="gemini-cli"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GEMINI_API_KEY dedicada</Label>
              <div className="relative">
                <Input
                  type={showKeys["gemini"] ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("gemini")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys["gemini"] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CODEX CLI */}
        <div className="border border-border bg-background/30 p-3 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Codex CLI
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Comando de Execução</Label>
              <Input
                value={codexCmd}
                onChange={(e) => setCodexCmd(e.target.value)}
                placeholder="codex-cli"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">OPENAI_API_KEY dedicada</Label>
              <div className="relative">
                <Input
                  type={showKeys["codex"] ? "text" : "password"}
                  value={codexKey}
                  onChange={(e) => setCodexKey(e.target.value)}
                  placeholder="sk-..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("codex")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys["codex"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* OPEN CODE */}
        <div className="border border-border bg-background/30 p-3 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open Code
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Comando de Execução</Label>
              <Input
                value={opencodeCmd}
                onChange={(e) => setOpencodeCmd(e.target.value)}
                placeholder="opencode"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">API_KEY dedicada (se houver)</Label>
              <div className="relative">
                <Input
                  type={showKeys["opencode"] ? "text" : "password"}
                  value={opencodeKey}
                  onChange={(e) => setOpencodeKey(e.target.value)}
                  placeholder="Chave/token..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("opencode")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys["opencode"] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow"
        >
          <Save className="h-4 w-4 mr-1.5" /> Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
