import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, Plus, Globe, Send, History, MessageSquare, Settings, Users,
  Monitor, Smartphone, Code2, Undo2, Redo2, Share2, RefreshCw, ExternalLink,
  ChevronDown, Database, ScrollText, Eye, X, Crown,
} from "lucide-react";
import { LlmSettingsDialog } from "@/components/LlmSettingsDialog";
import { AgentsDialog } from "@/components/AgentsDialog";
import { ChatComposerSelectors } from "@/components/ChatComposerSelectors";
import { ImportProjectDialog } from "@/components/ImportProjectDialog";
import { TokenMeter } from "@/components/TokenMeter";
import { AGENTS, loadAgentsState, type AgentsState } from "@/lib/agents-catalog";
import { loadProject, type ImportedProject } from "@/lib/project-import";
import { loadSelection, sendChat } from "@/lib/llm-providers";
import { addTokens } from "@/lib/token-usage";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniForge — Forje aplicações com IA" },
      { name: "description", content: "Ambiente de desenvolvimento conversacional. Descreva, veja e itere seu app em tempo real com IA." },
    ],
  }),
  component: OmniForge,
});

function OmniForge() {
  const [importOpen, setImportOpen] = useState(false);
  const [project, setProject] = useState<ImportedProject | null>(null);
  useEffect(() => { setProject(loadProject()); }, []);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      <ChatPanel onOpenImport={() => setImportOpen(true)} />
      <WorkspacePanel project={project} onOpenImport={() => setImportOpen(true)} />
      <ImportProjectDialog open={importOpen} onOpenChange={setImportOpen} onImported={setProject} />
    </div>
  );
}

/* ---------------- CHAT PANEL ---------------- */
function ChatPanel({ onOpenImport }: { onOpenImport: () => void }) {
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [agents, setAgents] = useState<AgentsState>({ leadId: "orchestrator", activeIds: ["orchestrator"] });
  const [sending, setSending] = useState(false);

  useEffect(() => { setAgents(loadAgentsState()); }, []);

  const lead = AGENTS.find(a => a.id === agents.leadId);
  const activeCount = agents.activeIds.length;

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const sel = loadSelection();
    if (!sel) { toast.error("Selecione um modelo no seletor da caixa de envio"); return; }
    setSending(true);
    try {
      const { usage } = await sendChat(sel, [{ role: "user", content: text }]);
      addTokens(usage.total);
      setInput("");
      toast.success(`Resposta recebida · ${usage.total} tokens (${usage.prompt}+${usage.completion})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao chamar a LLM");
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg font-semibold tracking-tight">OmniForge</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAgentsOpen(true)}
            title="Equipe de agentes"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Configurar provedores de LLM"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        onClick={() => setAgentsOpen(true)}
        className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-left hover:bg-card/70 transition-colors"
      >
        <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{lead?.name ?? "Sem coordenador"}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {activeCount} agente(s) ativo(s) · clique para gerenciar
          </p>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      <LlmSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AgentsDialog open={agentsOpen} onOpenChange={setAgentsOpen} onSaved={setAgents} />

      <div className="flex items-center gap-1 px-3 pt-3">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-4 w-4" />}>
          Chat
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<History className="h-4 w-4" />}>
          Histórico
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex h-full flex-col items-center justify-center text-center px-2">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] blur-2xl opacity-40" />
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] glow">
              <Sparkles className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="font-display text-lg font-semibold mb-1.5">Forje sua próxima ideia</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
            Descreva o que deseja construir e a OmniForge gera a aplicação para você em tempo real.
          </p>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="surface rounded-2xl border border-border p-2.5 focus-within:border-primary/50 focus-within:glow transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Descreva o que você quer construir…"
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <div className="px-1 pb-1">
            <ChatComposerSelectors
              agents={agents}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenAgents={() => setAgentsOpen(true)}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenImport}
                title="Importar projeto (pasta ou GitHub)"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <IconBtn><Globe className="h-4 w-4" /></IconBtn>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          OmniForge pode cometer erros. Verifique sempre.
        </p>
      </div>
    </aside>
  );
}

function Logo() {
  return (
    <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] glow">
      <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      }`}
    >
      {icon}{children}
    </button>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      {children}
    </button>
  );
}

/* ---------------- WORKSPACE PANEL ---------------- */
function WorkspacePanel({ project, onOpenImport }: { project: ImportedProject | null; onOpenImport: () => void }) {
  const [tab, setTab] = useState<"preview" | "code" | "database" | "logs">("preview");

  return (
    <section className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onOpenImport} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-colors text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{project ? project.name : "Sem projeto"}</span>
            {project && <span className="text-[10px] text-muted-foreground">· {project.files.length} arq.</span>}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <TokenMeter />
          <div className="flex items-center rounded-lg border border-border bg-card/50 p-0.5">
            <ViewportBtn active><Monitor className="h-4 w-4" /></ViewportBtn>
            <ViewportBtn><Smartphone className="h-4 w-4" /></ViewportBtn>
            <ViewportBtn><Code2 className="h-4 w-4" /></ViewportBtn>
          </div>
          <IconBtn><Undo2 className="h-4 w-4" /></IconBtn>
          <IconBtn><Redo2 className="h-4 w-4" /></IconBtn>
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </button>
          <button className="rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] px-4 py-1.5 text-sm font-medium text-primary-foreground glow hover:opacity-95 transition">
            Publicar
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border bg-card/30 px-3">
        <div className="flex items-center">
          <WorkTab active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye className="h-3.5 w-3.5" />}>Preview</WorkTab>
          <WorkTab active={tab === "code"} onClick={() => setTab("code")} icon={<Code2 className="h-3.5 w-3.5" />}>Código</WorkTab>
          <WorkTab active={tab === "database"} onClick={() => setTab("database")} icon={<Database className="h-3.5 w-3.5" />}>Database</WorkTab>
          <WorkTab active={tab === "logs"} onClick={() => setTab("logs")} icon={<ScrollText className="h-3.5 w-3.5" />}>Logs</WorkTab>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-2"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex items-center gap-3 border-b border-border bg-background/40 px-4 py-2">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">aguardando projeto…</span>
        </div>
        <IconBtn><RefreshCw className="h-3.5 w-3.5" /></IconBtn>
        <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-background/20 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="relative mx-auto mb-6 w-fit">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] blur-3xl opacity-30" />
            <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border bg-card/60 backdrop-blur">
              <Sparkles className="h-9 w-9 text-primary" strokeWidth={1.8} />
            </div>
          </div>
          <h2 className="font-display text-2xl font-semibold mb-2">Seu artefato aparecerá aqui</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Inicie uma conversa no painel ao lado para gerar sua aplicação. Você poderá visualizar, inspecionar o código, banco de dados e logs em tempo real.
          </p>
        </div>
      </div>
    </section>
  );
}

function ViewportBtn({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <button className={`grid h-7 w-9 place-items-center rounded-md transition-colors ${
      active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
    }`}>{children}</button>
  );
}

function WorkTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{children}
      {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)]" />}
    </button>
  );
}
