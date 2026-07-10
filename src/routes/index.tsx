import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, Send, MessageSquare, Settings, X, Paperclip,
  FileText, FileType2, Trash2, MessageCirclePlus, Square, RotateCw,
  Download, Search, Pin, PinOff, Pencil, Check, Sun, Moon,
  LogOut, Bot, Wand2, Copy, Columns3, Zap, BookOpen,
  Code2, ScrollText, Users,
} from "lucide-react";
import { LlmSettingsDialog } from "@/components/LlmSettingsDialog";
import { AgentsDialog } from "@/components/AgentsDialog";
import { CompareDialog } from "@/components/CompareDialog";
import { TokenMeter } from "@/components/TokenMeter";
import { Markdown } from "@/components/Markdown";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ChatComposerSelectors } from "@/components/ChatComposerSelectors";
import { PromptArtifactCard, PromptArtifactPanel, looksLikePrompt } from "@/components/PromptArtifact";
import { AGENTS, loadAgentsState, type AgentsState } from "@/lib/agents-catalog";
import { useAuth } from "@/lib/auth-context";
import { loadSelection, type WireMessage, type ContentPart } from "@/lib/llm-providers";
import { runOrchestration } from "@/lib/orchestrator";
import { addTokens } from "@/lib/token-usage";
import { estimateCostUsd, formatUsd } from "@/lib/llm-pricing";
import { estimateTokens, estimatePromptCostUsd } from "@/lib/cost-estimate";
import { PROMPT_TEMPLATES, applyTemplate } from "@/lib/prompt-templates";
import {
  initSync, loadConversations, saveConversation, deleteConversation,
  newConversation, subscribeConversations, titleFrom, renameConversation,
  togglePinned, importConversation, parseImportedConversation,
  searchConversations, type Conversation, type ChatMessage,
} from "@/lib/chat-history";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { safeUUID } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PromptArchitect — Crie prompts com IA" },
      { name: "description", content: "Crie, refine e otimize prompts para LLMs com agentes especializados em prompt engineering." },
    ],
  }),
  component: PromptArchitect,
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type AttachmentKind = "image" | "pdf" | "md";
interface Attachment { id: string; name: string; size: number; kind: AttachmentKind; content: string; }

function detectKind(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.name.endsWith(".md") || file.type === "text/markdown") return "md";
  return null;
}
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

// ─── Root ──────────────────────────────────────────────────────────────────────

function PromptArchitect() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  // ── conversation state ──
  const [conversation, setConversation] = useState<Conversation>(() => newConversation());
  const [history, setHistory] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<AgentsState>({ leadId: "prompt-architect", activeIds: ["prompt-architect"] });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [currentPhase, setCurrentPhase] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentModel, setCurrentModel] = useState(() => loadSelection());
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const [search, setSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    setIsDesktop(media.matches);
    setSidebarOpen(media.matches);
    const h = (e: MediaQueryListEvent) => { setIsDesktop(e.matches); setSidebarOpen(e.matches); };
    media.addEventListener("change", h);
    return () => media.removeEventListener("change", h);
  }, []);

  useEffect(() => { setAgents(loadAgentsState()); }, []);
  useEffect(() => { const id = setInterval(() => setCurrentModel(loadSelection()), 1500); return () => clearInterval(id); }, []);
  useEffect(() => {
    initSync().catch(() => {});
    setHistory(loadConversations());
    return subscribeConversations(() => setHistory(loadConversations()));
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages.length, streaming]);

  const lead = AGENTS.find((a) => a.id === agents.leadId);

  function startNew() {
    abortRef.current?.abort();
    setConversation(newConversation());
    setStreaming("");
    setEditingMsgId(null);
    setInput("");
    setAttachments([]);
  }
  function openConversation(c: Conversation) {
    abortRef.current?.abort();
    setConversation(c);
    setStreaming("");
  }
  function stopStream() { abortRef.current?.abort(); }

  // shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); startNew(); return; }
      if (e.key === "Escape" && sending) { e.preventDefault(); stopStream(); return; }
      if (meta && e.key === "Enter") { e.preventDefault(); handleSend(); return; }
      if (e.key === "ArrowUp" && document.activeElement === textareaRef.current && input === "") {
        const last = [...conversation.messages].reverse().find((m) => m.role === "user");
        if (last) { e.preventDefault(); setEditingMsgId(last.id); setEditingMsgText(typeof last.content === "string" ? last.content : ""); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      const kind = detectKind(file);
      if (!kind) { toast.error(`Tipo não suportado: ${file.name}`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} excede 10MB`); continue; }
      const content = kind === "md" ? await file.text() : await fileToDataUrl(file);
      next.push({ id: safeUUID(), name: file.name, size: file.size, kind, content });
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  function buildUserContent(text: string, atts: Attachment[]): string | ContentPart[] {
    const mdInline = atts.filter((a) => a.kind === "md").map((a) => `\n\n--- Anexo: ${a.name} ---\n${a.content}`).join("");
    const fullText = (text + mdInline).trim();
    const visual = atts.filter((a) => a.kind === "image" || a.kind === "pdf");
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
    if (!sel) { toast.error("Selecione um modelo nas configurações"); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSending(true);
    setStreaming("");
    setCurrentPhase("Iniciando...");
    try {
      const baseWire: WireMessage[] = convo.messages.filter((m) => m.id !== userMsgId).map((m) => ({ role: m.role, content: m.content }));
      let acc = "";
      const { usage } = await runOrchestration(
        sel, baseWire, userContent, agents.activeIds, agents.leadId ?? "prompt-architect",
        (label) => setCurrentPhase(label),
        (chunk) => { acc += chunk; setStreaming(acc); },
        ctrl.signal,
      );
      const cost = estimateCostUsd(sel.model, usage.prompt, usage.completion);
      addTokens(usage.total, cost);
      const stopped = ctrl.signal.aborted;
      const assistantMsg: ChatMessage = {
        id: safeUUID(), role: "assistant",
        content: acc + (stopped ? "\n\n_⏹ Interrompido._" : ""),
        tokens: usage.total, costUsd: cost, model: sel.model, createdAt: Date.now(),
      };
      const final: Conversation = { ...convo, messages: [...convo.messages, assistantMsg] };
      setConversation(final);
      saveConversation(final);
      setStreaming("");
      if (!stopped) toast.success(`${usage.total} tokens · ${formatUsd(cost)}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") { toast.error(e instanceof Error ? e.message : "Falha ao chamar a LLM"); }
      setStreaming("");
    } finally {
      setSending(false);
      abortRef.current = null;
      setCurrentPhase("");
    }
  }

  async function handleSend() {
    const rawText = input.trim();
    if ((!rawText && attachments.length === 0) || sending) return;
    const text = applyTemplate(rawText);
    const atts = attachments;
    const userContent = buildUserContent(text, atts);
    const images = atts.filter((a) => a.kind === "image").map((a) => a.content);
    const files = atts.filter((a) => a.kind !== "image").map((a) => a.name);
    const userMsg: ChatMessage = {
      id: safeUUID(), role: "user", content: text || "(anexos)",
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
    const lastAssistantIdx = [...msgs].reverse().findIndex((m) => m.role === "assistant");
    if (lastAssistantIdx < 0) return;
    const cut = msgs.length - 1 - lastAssistantIdx;
    const trimmed = msgs.slice(0, cut);
    const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const convo: Conversation = { ...conversation, messages: trimmed };
    setConversation(convo);
    await runTurn(convo, lastUser.id, lastUser.content);
  }

  async function saveEdit() {
    if (!editingMsgId || sending) return;
    const idx = conversation.messages.findIndex((m) => m.id === editingMsgId);
    if (idx < 0) return;
    const newText = editingMsgText.trim();
    if (!newText) { setEditingMsgId(null); return; }
    const truncated = conversation.messages.slice(0, idx);
    const newMsg: ChatMessage = { ...conversation.messages[idx], content: newText };
    const convo: Conversation = { ...conversation, messages: [...truncated, newMsg] };
    setConversation(convo);
    setEditingMsgId(null);
    await runTurn(convo, newMsg.id, newText);
  }

  function exportConversation(format: "md" | "json") {
    if (conversation.messages.length === 0) { toast.error("Nada para exportar"); return; }
    const slug = conversation.title.replace(/[^\w-]+/g, "-").slice(0, 40) || "conversa";
    let blob: Blob; let ext: string;
    if (format === "json") {
      blob = new Blob([JSON.stringify(conversation, null, 2)], { type: "application/json" }); ext = "json";
    } else {
      const lines = [`# ${conversation.title}`, ""];
      for (const m of conversation.messages) {
        lines.push(`## ${m.role === "user" ? "👤 Você" : "🤖 Assistente"}`, "");
        lines.push(m.content);
        if (m.tokens) lines.push(`\n> _${m.model} · ${m.tokens} tok · ${formatUsd(m.costUsd ?? 0)}_`);
        lines.push("");
      }
      blob = new Blob([lines.join("\n")], { type: "text/markdown" }); ext = "md";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${slug}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(list: FileList | null) {
    if (!list || list.length === 0) return;
    let count = 0;
    for (const f of Array.from(list)) {
      try { importConversation(parseImportedConversation(await f.text(), f.name)); count++; }
      catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    if (count > 0) toast.success(`${count} conversa(s) importada(s)`);
  }

  const slashMatches = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const q = input.slice(1).split(/\s/)[0].toLowerCase();
    return PROMPT_TEMPLATES.filter((t) => t.slug.startsWith(q));
  }, [input]);

  const previewTokens = useMemo(() => {
    const base = estimateTokens(input);
    const att = attachments.reduce((s, a) => s + (a.kind === "md" ? estimateTokens(a.content) : 200), 0);
    return base + att;
  }, [input, attachments]);
  const previewCost = currentModel ? estimatePromptCostUsd(currentModel.model, previewTokens) : 0;

  const filteredHistory = useMemo(() => searchConversations(history, search), [history, search]);

  const grouped = useMemo(() => {
    const pinned = filteredHistory.filter((c) => c.pinned);
    const today: Conversation[] = []; const yesterday: Conversation[] = []; const older: Conversation[] = [];
    const now = Date.now(); const DAY = 86400000;
    for (const c of filteredHistory.filter((c) => !c.pinned)) {
      const age = now - c.updatedAt;
      if (age < DAY) today.push(c); else if (age < DAY * 2) yesterday.push(c); else older.push(c);
    }
    return { pinned, today, yesterday, older };
  }, [filteredHistory]);

  const name = user?.displayName || user?.email || "Usuário";
  const initial = name.charAt(0).toUpperCase();

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar overlay mobile */}
      {!isDesktop && sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        ${isDesktop ? "relative" : "fixed z-30 inset-y-0 left-0"}
        ${sidebarOpen ? "w-72" : "w-0"}
        flex flex-col h-full bg-sidebar/95 backdrop-blur-xl border-r border-border/40
        transition-[width] duration-200 shrink-0 overflow-hidden
      `}>
        <div className="flex flex-col h-full w-72 min-w-0">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-display font-semibold text-sm gradient-text whitespace-nowrap">PromptArchitect</span>
            </div>
            <button onClick={startNew} title="Nova conversa (Ctrl+K)"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <MessageCirclePlus className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversas…"
                className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/60" />
              {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
            </div>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">{search ? "Sem resultados." : "Nenhuma conversa ainda.\nEnvie sua primeira mensagem!"}</div>
            ) : (
              <div className="space-y-1">
                {grouped.pinned.length > 0 && <SidebarGroup label="📌 Fixadas" items={grouped.pinned} activeId={conversation.id} onOpen={openConversation} />}
                {grouped.today.length > 0 && <SidebarGroup label="Hoje" items={grouped.today} activeId={conversation.id} onOpen={openConversation} />}
                {grouped.yesterday.length > 0 && <SidebarGroup label="Ontem" items={grouped.yesterday} activeId={conversation.id} onOpen={openConversation} />}
                {grouped.older.length > 0 && <SidebarGroup label="Anteriores" items={grouped.older} activeId={conversation.id} onOpen={openConversation} />}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-border/40 p-3 shrink-0 space-y-0.5">
            <SidebarFooterBtn icon={<Settings className="h-4 w-4" />} label="Configurar modelos" onClick={() => setSettingsOpen(true)} />
            <SidebarFooterBtn icon={<Users className="h-4 w-4" />} label="Agentes de IA" onClick={() => setAgentsOpen(true)}
              badge={`${agents.activeIds.length} ativo${agents.activeIds.length !== 1 ? "s" : ""}`} />
            <SidebarFooterBtn
              icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              label={theme === "dark" ? "Tema claro" : "Tema escuro"}
              onClick={toggleTheme} />
            {user && (
              <button onClick={() => signOut()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors group">
                <div className="h-6 w-6 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-semibold text-primary overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt={name} className="h-full w-full object-cover" /> : initial}
                </div>
                <span className="flex-1 text-left text-xs truncate">{user.displayName || user.email}</span>
                <LogOut className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <div className="flex items-center justify-between px-3 pt-1">
              <TokenMeter />
              <InstallAppButton />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-background/80 backdrop-blur-sm shrink-0">
          <button onClick={() => setSidebarOpen((v) => !v)} title="Alternar sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0">
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{conversation.title || "Nova conversa"}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setCompareOpen(true)} title="Comparar modelos" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Columns3 className="h-4 w-4" />
            </button>
            {conversation.messages.length > 0 && (
              <>
                <button onClick={handleRegenerate} disabled={sending} title="Regenerar" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors">
                  <RotateCw className="h-4 w-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button title="Exportar" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportConversation("md")}>Exportar .md</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportConversation("json")}>Exportar .json</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => importInputRef.current?.click()}>Importar conversa…</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <button onClick={startNew} title="Nova conversa (Ctrl+K)" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
              <MessageCirclePlus className="h-4 w-4" />
            </button>
          </div>
        </header>

        <input ref={importInputRef} type="file" multiple accept=".json,.md,application/json,text/markdown"
          className="hidden" onChange={(e) => { handleImport(e.target.files); e.target.value = ""; }} />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
            {conversation.messages.length === 0 && !streaming ? (
              <WelcomeScreen lead={lead} onSuggest={(s) => { setInput(s); textareaRef.current?.focus(); }} />
            ) : (
              <>
                {conversation.messages.map((m) => (
                  <MsgBubble key={m.id} m={m}
                    editing={editingMsgId === m.id}
                    editText={editingMsgText}
                    onEditChange={setEditingMsgText}
                    onEditStart={() => { setEditingMsgId(m.id); setEditingMsgText(typeof m.content === "string" ? m.content : ""); }}
                    onEditSave={saveEdit}
                    onEditCancel={() => setEditingMsgId(null)}
                  />
                ))}
                {streaming && (
                  <MsgBubble m={{ id: "stream", role: "assistant", content: streaming, createdAt: Date.now() }} streaming />
                )}
                {sending && !streaming && (
                  <div className="flex gap-3 py-4">
                    <AgentAvatar name={lead?.name ?? "IA"} />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </span>
                      <span>{currentPhase || "Processando…"}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Slash suggestions */}
            {slashMatches.length > 0 && input.startsWith("/") && !input.includes("\n") && (
              <div className="mb-2 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                {slashMatches.map((t) => (
                  <button key={t.slug} onClick={() => setInput(t.label + " ")}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-xs flex items-center justify-between gap-3 transition-colors">
                    <span className="font-mono text-primary font-medium">{t.label}</span>
                    <span className="text-muted-foreground truncate">{t.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2 py-1 text-[11px]">
                    {a.kind === "image" ? <img src={a.content} alt={a.name} className="h-5 w-5 rounded object-cover" />
                      : a.kind === "pdf" ? <FileType2 className="h-3.5 w-3.5 text-red-400" />
                      : <FileText className="h-3.5 w-3.5 text-blue-400" />}
                    <span className="max-w-[120px] truncate">{a.name}</span>
                    <button onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-foreground ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input box */}
            <div className="relative rounded-2xl border border-border bg-card/60 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-sm">
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Descreva o prompt que você quer criar… (/ para comandos, Ctrl+Enter para enviar)"
                rows={3}
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm placeholder:text-muted-foreground/60 focus:outline-none" />
              <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.md,text/markdown" className="hidden"
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
                  <button onClick={() => fileInputRef.current?.click()} title="Anexar arquivo"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <ChatComposerSelectors agents={agents} onOpenSettings={() => setSettingsOpen(true)} onOpenAgents={() => setAgentsOpen(true)} onAgentsChange={setAgents} />
                  {(input || attachments.length > 0) && currentModel && (
                    <span className="text-[10px] text-muted-foreground/70 px-1 hidden sm:inline">
                      ≈{previewTokens} tok · ~{formatUsd(previewCost)}
                    </span>
                  )}
                </div>
                {sending ? (
                  <button onClick={stopStream} title="Parar (Esc)"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition shrink-0">
                    <Square className="h-4 w-4" fill="currentColor" />
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={!input.trim() && attachments.length === 0} title="Enviar (Ctrl+Enter)"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground/50">Ctrl+Enter envia · Ctrl+K nova conversa · Esc para stream · ↑ edita última</p>
          </div>
        </div>
      </div>

      <LlmSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AgentsDialog open={agentsOpen} onOpenChange={setAgentsOpen} onSaved={setAgents} />
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} prompt={input} />
    </div>
  );
}

// ─── Sidebar Helpers ──────────────────────────────────────────────────────────

function SidebarFooterBtn({ icon, label, onClick, badge }: { icon: React.ReactNode; label: string; onClick: () => void; badge?: string; }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left text-xs">{label}</span>
      {badge && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">{badge}</span>}
    </button>
  );
}

function SidebarGroup({ label, items, activeId, onOpen }: { label: string; items: Conversation[]; activeId: string; onOpen: (c: Conversation) => void; }) {
  return (
    <div className="pt-2">
      <p className="px-2 pb-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground/50">{label}</p>
      {items.map((c) => <SidebarConvoItem key={c.id} c={c} active={c.id === activeId} onOpen={() => onOpen(c)} />)}
    </div>
  );
}

function SidebarConvoItem({ c, active, onOpen }: { c: Conversation; active: boolean; onOpen: () => void; }) {
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(c.title);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editMode) { setEditTitle(c.title); inputRef.current?.focus(); } }, [editMode, c.title]);

  return (
    <div className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${active ? "bg-accent/70 text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
      onClick={editMode ? undefined : onOpen}>
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
      {editMode ? (
        <input ref={inputRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { renameConversation(c.id, editTitle); setEditMode(false); }
            if (e.key === "Escape") setEditMode(false);
          }}
          onBlur={() => { renameConversation(c.id, editTitle); setEditMode(false); }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-xs focus:outline-none" />
      ) : (
        <span className="flex-1 text-xs truncate leading-snug">{c.title}</span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={(e) => { e.stopPropagation(); togglePinned(c.id); }} title={c.pinned ? "Desafixar" : "Fixar"}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent">
          {c.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); setEditMode(true); }} title="Renomear"
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} title="Excluir"
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function AgentAvatar({ name }: { name: string }) {
  return (
    <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] flex items-center justify-center mt-0.5">
      <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
    </div>
  );
}

function MsgBubble({
  m, streaming = false, editing = false, editText = "", onEditChange, onEditStart, onEditSave, onEditCancel,
}: {
  m: ChatMessage; streaming?: boolean;
  editing?: boolean; editText?: string;
  onEditChange?: (t: string) => void;
  onEditStart?: () => void; onEditSave?: () => void; onEditCancel?: () => void;
}) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState(false);

  function copyContent() {
    const text = typeof m.content === "string" ? m.content : "";
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  const msgText = typeof m.content === "string" ? m.content : "";
  const showArtifact = !isUser && !streaming && looksLikePrompt(msgText);

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 group py-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/10 border border-primary/20 px-4 py-3">
          {editing ? (
            <div className="space-y-2">
              <textarea value={editText} onChange={(e) => onEditChange?.(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSave?.(); } if (e.key === "Escape") onEditCancel?.(); }}
                className="w-full bg-transparent text-sm resize-none focus:outline-none min-w-[280px]" rows={3} autoFocus />
              <div className="flex gap-2 justify-end">
                <button onClick={onEditCancel} className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-accent transition-colors">Cancelar</button>
                <button onClick={onEditSave} className="px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors">Salvar & Reenviar</button>
              </div>
            </div>
          ) : (
            <>
              {m.images?.map((src, i) => <img key={i} src={src} className="max-w-full rounded-lg mb-2 max-h-48 object-contain" alt="anexo" />)}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{typeof m.content === "string" ? m.content : ""}</p>
              {m.files && m.files.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.files.map((f, i) => <span key={i} className="text-[10px] text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">{f}</span>)}
                </div>
              )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
            <button onClick={copyContent} title="Copiar" className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onEditStart} title="Editar" className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex gap-3 py-2 group">
      <AgentAvatar name="IA" />
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <Markdown>{msgText}</Markdown>
        </div>
        {streaming && <span className="inline-block h-4 w-0.5 bg-primary animate-pulse ml-0.5 align-middle" />}

        {/* Card de artefato — aparece ao final quando a resposta é um prompt */}
        {showArtifact && (
          <PromptArtifactCard content={msgText} onOpen={() => setArtifactOpen(true)} />
        )}

        {!streaming && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copyContent} title="Copiar resposta"
              className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {m.tokens && (
              <span className="text-[10px] text-muted-foreground/60 px-1">
                {m.model} · {m.tokens} tok{m.costUsd ? ` · ${formatUsd(m.costUsd)}` : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Painel lateral de artefato */}
      {showArtifact && (
        <PromptArtifactPanel
          content={msgText}
          open={artifactOpen}
          onClose={() => setArtifactOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: <Wand2 className="h-5 w-5" />, label: "Criar prompt do zero", text: "/criar Preciso de um prompt para um assistente de suporte ao cliente que responda em PT-BR, seja empático e direcione escaladas corretamente." },
  { icon: <BookOpen className="h-5 w-5" />, label: "Otimizar prompt existente", text: "/otimizar " },
  { icon: <Code2 className="h-5 w-5" />, label: "Prompt para código", text: "/codigo Crie um prompt para um assistente que revisa código TypeScript seguindo as melhores práticas de clean code e segurança." },
  { icon: <ScrollText className="h-5 w-5" />, label: "PRD completo", text: "/prd Preciso de um PRD para um sistema de chat com suporte a múltiplos modelos de IA, histórico de conversas e exportação." },
  { icon: <Zap className="h-5 w-5" />, label: "Chain of Thought", text: "Crie um prompt que instrua o modelo a raciocinar passo a passo antes de dar a resposta final, usando a técnica Chain of Thought para problemas matemáticos." },
  { icon: <Bot className="h-5 w-5" />, label: "Persona de agente", text: "Defina a persona e as regras de comportamento para um agente especializado em análise de dados que comunica insights de forma clara para não-técnicos." },
  { icon: <FileText className="h-5 w-5" />, label: "Termo de Referência", text: "/documento Termo de Referência para contratação de serviço de desenvolvimento de software sob medida, modalidade pregão eletrônico, valor estimado R$ 180.000,00, prazo 12 meses." },
  { icon: <ScrollText className="h-5 w-5" />, label: "Memorando executivo", text: "/memorando Para: Diretoria de TI | Assunto: Solicitação de aprovação de orçamento para renovação de licenças de software | Contexto: licenças vencem em 30 dias, impacto operacional crítico." },
];

function WelcomeScreen({ lead, onSuggest }: { lead?: typeof AGENTS[0]; onSuggest: (s: string) => void; }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8">
      <div className="mb-6">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] flex items-center justify-center glow">
          <Sparkles className="h-7 w-7 text-primary-foreground" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-display font-bold gradient-text mb-2">PromptArchitect</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Crie, refine e otimize prompts com agentes de IA especializados.
          {lead && <span> Usando <strong className="text-foreground">{lead.name}</strong> como agente principal.</span>}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => onSuggest(s.text)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/40 hover:bg-card/70 hover:border-primary/30 px-4 py-3 text-left transition-all group">
            <span className="text-primary/70 group-hover:text-primary transition-colors mt-0.5 shrink-0">{s.icon}</span>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">{s.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground/50">Digite <kbd className="bg-card border border-border rounded px-1 py-0.5 text-[10px]">/</kbd> para ver todos os comandos disponíveis</p>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)]">
      <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
    </div>
  );
}

// ─── PanelLeft icon (not in older lucide versions) ────────────────────────────

function PanelLeft({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}
