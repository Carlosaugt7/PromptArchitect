import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Plus, Globe, Send, History, MessageSquare, Settings, Users,
  Monitor, Smartphone, Code2, Undo2, Redo2, Share2, RefreshCw, ExternalLink,
  ChevronDown, Database, ScrollText, Eye, X, Crown, Paperclip, FileText,
  Image as ImageIcon, FileType2, Trash2, MessageCirclePlus, Square, RotateCw, Download,
} from "lucide-react";
import { LlmSettingsDialog } from "@/components/LlmSettingsDialog";
import { AgentsDialog } from "@/components/AgentsDialog";
import { ChatComposerSelectors } from "@/components/ChatComposerSelectors";
import { ImportProjectDialog } from "@/components/ImportProjectDialog";
import { TokenMeter } from "@/components/TokenMeter";
import { Markdown } from "@/components/Markdown";
import { AGENTS, loadAgentsState, type AgentsState } from "@/lib/agents-catalog";
import { loadProject, type ImportedProject } from "@/lib/project-import";
import { loadSelection, sendChatStream, type WireMessage, type ContentPart } from "@/lib/llm-providers";
import { addTokens } from "@/lib/token-usage";
import { estimateCostUsd, formatUsd } from "@/lib/llm-pricing";
import {
  loadConversations, saveConversation, deleteConversation, newConversation,
  subscribeConversations, titleFrom, type Conversation, type ChatMessage,
} from "@/lib/chat-history";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";



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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [conversation, setConversation] = useState<Conversation>(() => newConversation());
  const [history, setHistory] = useState<Conversation[]>([]);
  const [streaming, setStreaming] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setAgents(loadAgentsState()); }, []);
  useEffect(() => {
    setHistory(loadConversations());
    return subscribeConversations(() => setHistory(loadConversations()));
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages.length, streaming]);

  const lead = AGENTS.find(a => a.id === agents.leadId);
  const activeCount = agents.activeIds.length;

  function startNew() {
    abortRef.current?.abort();
    setConversation(newConversation());
    setStreaming("");
    setTab("chat");
  }
  function openConversation(c: Conversation) {
    abortRef.current?.abort();
    setConversation(c);
    setStreaming("");
    setTab("chat");
  }
  function stopStream() {
    abortRef.current?.abort();
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      const kind = detectKind(file);
      if (!kind) { toast.error(`Tipo não suportado: ${file.name}`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} excede 10MB`); continue; }
      const isText = kind === "md";
      const content = isText ? await file.text() : await fileToDataUrl(file);
      next.push({ id: crypto.randomUUID(), name: file.name, size: file.size, kind, content });
    }
    setAttachments(prev => [...prev, ...next]);
  }

  /** Constrói content parts (vision) para a mensagem do usuário. */
  function buildUserContent(text: string, atts: Attachment[]): string | ContentPart[] {
    const mdInline = atts.filter(a => a.kind === "md").map(a => `\n\n--- Anexo: ${a.name} ---\n${a.content}`).join("");
    const fullText = (text + mdInline).trim();
    const visual = atts.filter(a => a.kind === "image" || a.kind === "pdf");
    if (visual.length === 0) return fullText || "(anexos)";
    const parts: ContentPart[] = [];
    if (fullText) parts.push({ type: "text", text: fullText });
    for (const a of visual) {
      if (a.kind === "image") parts.push({ type: "image_url", image_url: { url: a.content } });
      else parts.push({ type: "file", file: { filename: a.name, file_data: a.content } });
    }
    return parts;
  }

  async function runTurn(convo: Conversation, userMsgId: string, userContent: string | ContentPart[]) {
    const sel = loadSelection();
    if (!sel) { toast.error("Selecione um modelo no seletor da caixa de envio"); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSending(true);
    setStreaming("");
    try {
      const wire: WireMessage[] = convo.messages.map(m => ({
        role: m.role,
        content: m.id === userMsgId ? userContent : m.content,
      }));
      let acc = "";
      const { usage } = await sendChatStream(sel, wire, (chunk) => {
        acc += chunk;
        setStreaming(acc);
      }, { signal: ctrl.signal });
      const cost = estimateCostUsd(sel.model, usage.prompt, usage.completion);
      addTokens(usage.total, cost);
      const stopped = ctrl.signal.aborted;
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: acc + (stopped ? "\n\n_⏹ Interrompido pelo usuário._" : ""),
        tokens: usage.total, costUsd: cost, model: sel.model, createdAt: Date.now(),
      };
      const final: Conversation = { ...convo, messages: [...convo.messages, assistantMsg] };
      setConversation(final);
      saveConversation(final);
      setStreaming("");
      if (!stopped) toast.success(`${usage.total} tokens · ${formatUsd(cost)} (${sel.model})`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Falha ao chamar a LLM");
      }
      setStreaming("");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || sending) return;
    const atts = attachments;
    const userContent = buildUserContent(text, atts);
    const images = atts.filter(a => a.kind === "image").map(a => a.content);
    const files = atts.filter(a => a.kind !== "image").map(a => a.name);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: text || "(anexos)",
      images: images.length ? images : undefined, files: files.length ? files : undefined,
      createdAt: Date.now(),
    };
    const convo: Conversation = {
      ...conversation,
      title: conversation.messages.length === 0 ? titleFrom(text || files[0] || "Conversa") : conversation.title,
      messages: [...conversation.messages, userMsg],
    };
    setConversation(convo);
    setInput("");
    setAttachments([]);
    await runTurn(convo, userMsg.id, userContent);
  }

  async function handleRegenerate() {
    if (sending) return;
    const msgs = conversation.messages;
    if (msgs.length < 2) return;
    // remove última assistente e refaz
    const lastAssistantIdx = [...msgs].reverse().findIndex(m => m.role === "assistant");
    if (lastAssistantIdx < 0) return;
    const cut = msgs.length - 1 - lastAssistantIdx;
    const trimmed = msgs.slice(0, cut);
    const lastUser = [...trimmed].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    const convo: Conversation = { ...conversation, messages: trimmed };
    setConversation(convo);
    await runTurn(convo, lastUser.id, lastUser.content);
  }

  function exportConversation(format: "md" | "json") {
    if (conversation.messages.length === 0) { toast.error("Nada para exportar"); return; }
    const slug = conversation.title.replace(/[^\w\-]+/g, "-").slice(0, 40) || "conversa";
    let blob: Blob;
    let ext: string;
    if (format === "json") {
      blob = new Blob([JSON.stringify(conversation, null, 2)], { type: "application/json" });
      ext = "json";
    } else {
      const lines = [`# ${conversation.title}`, ""];
      for (const m of conversation.messages) {
        lines.push(`## ${m.role === "user" ? "👤 Você" : "🤖 Assistente"}`);
        lines.push("");
        lines.push(m.content);
        if (m.tokens) lines.push(`\n> _${m.model} · ${m.tokens} tok · ${formatUsd(m.costUsd ?? 0)}_`);
        lines.push("");
      }
      blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      ext = "md";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
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
          Histórico {history.length > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({history.length})</span>}
        </TabButton>
        <div className="ml-auto flex items-center gap-0.5">
          {conversation.messages.length > 0 && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={sending}
                title="Regenerar última resposta"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button title="Exportar conversa" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportConversation("md")}>Exportar como .md</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportConversation("json")}>Exportar como .json</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <button
            onClick={startNew}
            title="Nova conversa"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <MessageCirclePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "history" ? (
          <HistoryList list={history} activeId={conversation.id} onOpen={openConversation} />
        ) : conversation.messages.length === 0 && !streaming ? (
          <EmptyChat />
        ) : (
          <div className="flex flex-col gap-3">
            {conversation.messages.map(m => <MessageBubble key={m.id} m={m} />)}
            {streaming && (
              <MessageBubble m={{ id: "stream", role: "assistant", content: streaming, createdAt: Date.now() }} streaming />
            )}
            {sending && !streaming && (
              <div className="text-xs text-muted-foreground italic">Pensando…</div>
            )}
          </div>
        )}
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
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1 pb-1">
              {attachments.map(a => (
                <span key={a.id} className="flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-1.5 py-1 text-[11px]">
                  {a.kind === "image" ? (
                    <img src={a.content} alt={a.name} className="h-6 w-6 rounded object-cover" />
                  ) : a.kind === "pdf" ? (
                    <FileType2 className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  <span className="max-w-[120px] truncate">{a.name}</span>
                  <button onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenImport}
                title="Importar projeto (pasta ou GitHub)"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.md,text/markdown"
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Anexar imagens, PDF ou Markdown"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              
            </div>
            {sending ? (
              <button
                onClick={stopStream}
                title="Parar geração"
                className="grid h-9 w-9 place-items-center rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                title="Enviar"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            )}

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

/* ---------------- ATTACHMENTS ---------------- */
type AttachmentKind = "image" | "pdf" | "md";
interface Attachment { id: string; name: string; size: number; kind: AttachmentKind; content: string; }

function detectKind(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type === "text/markdown" || /\.md$/i.test(file.name)) return "md";
  return null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/* ---------------- CHAT VIEWS ---------------- */
function EmptyChat() {
  return (
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
  );
}

function MessageBubble({ m, streaming }: { m: ChatMessage; streaming?: boolean }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm break-words ${
        isUser ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-card/60 border border-border"
      }`}>
        {isUser ? m.content : <Markdown>{m.content}</Markdown>}
        {streaming && <span className="ml-0.5 inline-block w-1.5 h-3 bg-current animate-pulse align-middle" />}
      </div>

      {m.images && m.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.images.map((src, i) => (
            <img key={i} src={src} alt="" className="h-16 w-16 rounded-md object-cover border border-border" />
          ))}
        </div>
      )}
      {m.files && m.files.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {m.files.map((n, i) => <span key={i} className="rounded bg-card/40 px-1.5 py-0.5">{n}</span>)}
        </div>
      )}
      {!isUser && m.tokens != null && (
        <div className="text-[10px] text-muted-foreground px-1">
          {m.model} · {m.tokens} tok · {formatUsd(m.costUsd ?? 0)}
        </div>
      )}
    </div>
  );
}

function HistoryList({ list, activeId, onOpen }: { list: Conversation[]; activeId: string; onOpen: (c: Conversation) => void }) {
  if (list.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa salva ainda.</div>;
  }
  return (
    <div className="flex flex-col gap-1">
      {list.map(c => (
        <div
          key={c.id}
          className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
            c.id === activeId ? "border-primary/50 bg-accent" : "border-border bg-card/40 hover:bg-card/70"
          }`}
          onClick={() => onOpen(c)}
        >
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{c.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {c.messages.length} msg · {new Date(c.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

