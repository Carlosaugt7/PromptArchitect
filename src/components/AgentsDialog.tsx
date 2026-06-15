import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Crown, Search, Sparkles, Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AGENTS, AGENT_CATEGORIES, type AgentDefinition,
  loadAgentsState, saveAgentsState, type AgentsState,
} from "@/lib/agents-catalog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (state: AgentsState) => void;
}

export function AgentsDialog({ open, onOpenChange, onSaved }: Props) {
  const [state, setState] = useState<AgentsState>({ leadId: "orchestrator", activeIds: ["orchestrator"] });
  const [query, setQuery] = useState("");

  useEffect(() => { if (open) setState(loadAgentsState()); }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AGENTS;
    return AGENTS.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.skills.some(s => s.toLowerCase().includes(q)) ||
      a.category.includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, AgentDefinition[]>();
    for (const a of filtered) {
      const arr = map.get(a.category) ?? [];
      arr.push(a);
      map.set(a.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggle = (id: string) => {
    setState(prev => {
      const isLead = prev.leadId === id;
      const active = new Set(prev.activeIds);
      if (active.has(id)) {
        if (isLead) return prev; // não desativa o lead
        active.delete(id);
      } else {
        active.add(id);
      }
      return { ...prev, activeIds: Array.from(active) };
    });
  };

  const setLead = (id: string) => {
    setState(prev => {
      const active = new Set(prev.activeIds);
      active.add(id);
      return { leadId: id, activeIds: Array.from(active) };
    });
  };

  const handleSave = () => {
    saveAgentsState(state);
    toast.success("Agentes configurados", {
      description: `${state.activeIds.length} ativo(s) · coordenado por ${AGENTS.find(a => a.id === state.leadId)?.name ?? "—"}`,
    });
    onSaved?.(state);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Users className="h-4 w-4 text-primary" />
            Equipe de agentes
          </DialogTitle>
          <DialogDescription>
            Selecione agentes pré-configurados. O agente coordenador (coroa) orquestra os demais em paralelo.
            Inspirado em{" "}
            <a href="https://github.com/vudovn/antigravity-kit" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              antigravity-kit
            </a>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nome, categoria ou skill…"
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="gap-1">
            <Bot className="h-3 w-3" /> {state.activeIds.length} ativo(s)
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
          {grouped.map(([cat, items]) => {
            const meta = AGENT_CATEGORIES[cat as keyof typeof AGENT_CATEGORIES];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full bg-gradient-to-br ${meta.color}`} />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map(agent => {
                    const isActive = state.activeIds.includes(agent.id);
                    const isLead = state.leadId === agent.id;
                    return (
                      <div
                        key={agent.id}
                        className={`relative rounded-xl border p-3 transition-all ${
                          isActive
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-card/40 hover:bg-card/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${meta.color}`}>
                              {agent.coordinator
                                ? <Crown className="h-3.5 w-3.5 text-white" />
                                : <Sparkles className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{agent.name}</p>
                                {isLead && (
                                  <Badge variant="default" className="h-4 px-1.5 text-[10px]">Lead</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {agent.skills.slice(0, 3).join(" · ")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggle(agent.id)}
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                              isActive
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:bg-accent"
                            }`}
                            title={isActive ? "Desativar" : "Ativar"}
                          >
                            {isActive && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {agent.description}
                        </p>
                        {agent.coordinator && !isLead && (
                          <button
                            onClick={() => setLead(agent.id)}
                            className="mt-2 text-[11px] text-primary hover:underline"
                          >
                            Definir como coordenador
                          </button>
                        )}
                        {!agent.coordinator && (
                          <button
                            onClick={() => setLead(agent.id)}
                            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Tornar lead
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {grouped.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum agente encontrado para "{query}".
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Configurações salvas no navegador. O coordenador delega tarefas paralelas aos agentes ativos.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar equipe</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
