import { useEffect, useState } from "react";
import { Bot, Cpu, Crown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  PROVIDERS,
  listEnabledModels,
  loadSelection,
  saveSelection,
  type ModelSelection,
} from "@/lib/llm-providers";
import { AGENTS, loadAgentsState, type AgentsState } from "@/lib/agents-catalog";

export function ChatComposerSelectors({
  agents,
  onOpenSettings,
  onOpenAgents,
}: {
  agents: AgentsState;
  onOpenSettings: () => void;
  onOpenAgents: () => void;
}) {
  const [models, setModels] = useState<ModelSelection[]>([]);
  const [selection, setSelection] = useState<ModelSelection | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const list = listEnabledModels();
      setModels(list);
      const cur = loadSelection();
      const valid = cur && list.some((m) => m.provider === cur.provider && m.model === cur.model);
      const next = valid ? cur : (list[0] ?? null);
      setSelection(next);
      
      const changed = cur?.provider !== next?.provider || cur?.model !== next?.model;
      if (changed) {
        saveSelection(next);
      }
    };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("omniforge.llm")) refresh();
    };
    const onChanged = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("omniforge.llm.providers-changed", onChanged);
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("omniforge.llm.providers-changed", onChanged);
      clearInterval(id);
    };
  }, []);

  const providerName = (id: string) => PROVIDERS.find((p) => p.id === id)?.name ?? id;
  const lead = AGENTS.find((a) => a.id === agents.leadId);
  const activeAgents = AGENTS.filter((a) => agents.activeIds.includes(a.id));

  // Agrupa modelos por provider
  const grouped = models.reduce<Record<string, string[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m.model);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Modelo */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2 py-1 text-[11px] hover:bg-accent transition-colors max-w-[200px]">
          <Cpu className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">
            {selection
              ? `${providerName(selection.provider)} · ${selection.model}`
              : "Selecionar modelo"}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-72">
          {models.length === 0 ? (
            <DropdownMenuItem onClick={onOpenSettings}>
              Nenhum modelo habilitado — configurar…
            </DropdownMenuItem>
          ) : (
            Object.entries(grouped).map(([prov, ms]) => (
              <div key={prov}>
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                  {providerName(prov)}
                </DropdownMenuLabel>
                {ms.map((m) => {
                  const isSel = selection?.provider === prov && selection?.model === m;
                  return (
                    <DropdownMenuItem
                      key={`${prov}:${m}`}
                      onClick={() => {
                        const next = { provider: prov as ModelSelection["provider"], model: m };
                        setSelection(next);
                        saveSelection(next);
                      }}
                      className={`font-mono text-xs ${isSel ? "bg-primary/15 text-foreground" : ""}`}
                    >
                      {m}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Agente */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2 py-1 text-[11px] hover:bg-accent transition-colors max-w-[200px]">
          <Bot className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{lead ? lead.name : "Sem agente"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-72">
          <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
            Coordenador ativo
          </DropdownMenuLabel>
          {activeAgents.length === 0 ? (
            <DropdownMenuItem onClick={onOpenAgents}>
              Nenhum agente ativo — gerenciar equipe…
            </DropdownMenuItem>
          ) : (
            activeAgents.map((a) => {
              const isLead = a.id === agents.leadId;
              return (
                <DropdownMenuItem
                  key={a.id}
                  className="text-xs flex items-start gap-2"
                  onClick={onOpenAgents}
                >
                  {isLead && <Crown className="h-3 w-3 text-primary mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {a.skills.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenAgents} className="text-xs text-primary">
            Gerenciar equipe de agentes…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
