import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import {
  Sparkles,
  AlertTriangle,
  Plus,
  Globe,
  GripVertical,
  Send,
  History,
  MessageSquare,
  Settings,
  Users,
  Monitor,
  Smartphone,
  Code2,
  Undo2,
  Redo2,
  Share2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Database,
  ScrollText,
  Eye,
  EyeOff,
  X,
  Crown,
  Paperclip,
  FileText,
  FileType2,
  Trash2,
  MessageCirclePlus,
  Square,
  RotateCw,
  Download,
  Upload,
  Search,
  Pin,
  PinOff,
  Pencil,
  Check,
  Sun,
  Moon,
  Columns3,
  PanelLeft,
  LayoutGrid,
  PanelRight,
  FolderOpen,
  LogOut,
  Terminal,
  Play,
} from "lucide-react";
import { LlmSettingsDialog } from "@/components/LlmSettingsDialog";
import { AgentsDialog } from "@/components/AgentsDialog";
import { ChatComposerSelectors } from "@/components/ChatComposerSelectors";
import { FastReactPreview } from "@/components/FastReactPreview";
import { ImportProjectDialog } from "@/components/ImportProjectDialog";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { IntegrationsDialog } from "@/components/IntegrationsDialog";
import { PublishDialog } from "@/components/PublishDialog";
import { TokenMeter } from "@/components/TokenMeter";
import { Markdown } from "@/components/Markdown";
import { InstallAppButton } from "@/components/InstallAppButton";
import { CompareDialog } from "@/components/CompareDialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AGENTS, loadAgentsState, type AgentsState } from "@/lib/agents-catalog";
import {
  loadProject,
  clearProject,
  writeArtifactToProject,
  type ImportedProject,
  readFileContent,
  saveProject,
  writeLocalFile,
  parseFilePathFromBlock,
} from "@/lib/project-import";
import { useAuth } from "@/lib/auth-context";
import { loadSelection, type WireMessage, type ContentPart } from "@/lib/llm-providers";
import { runOrchestration } from "@/lib/orchestrator";
import { addTokens } from "@/lib/token-usage";
import { estimateCostUsd, formatUsd } from "@/lib/llm-pricing";
import { estimateTokens, estimatePromptCostUsd } from "@/lib/cost-estimate";
import {
  extractArtifact,
  saveArtifact,
  loadArtifact,
  subscribeArtifact,
  projectToArtifact,
  type Artifact,
} from "@/lib/artifact-store";
import { PROMPT_TEMPLATES, applyTemplate } from "@/lib/prompt-templates";
import {
  initSync,
  loadConversations,
  saveConversation,
  deleteConversation,
  newConversation,
  subscribeConversations,
  titleFrom,
  renameConversation,
  togglePinned,
  importConversation,
  parseImportedConversation,
  searchConversations,
  type Conversation,
  type ChatMessage,
} from "@/lib/chat-history";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { safeUUID } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniForge — Forje aplicações com IA" },
      {
        name: "description",
        content:
          "Ambiente de desenvolvimento conversacional. Descreva, veja e itere seu app em tempo real com IA.",
      },
    ],
  }),
  component: OmniForge,
});

export interface PendingDiff {
  path: string;
  original: string;
  proposed: string;
}

function OmniForge() {
  const { theme, toggleTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<"saved" | "local" | "github" | "new">("saved");
  const handleOpenImport = (tab: "saved" | "local" | "github" | "new") => {
    setImportTab(tab);
    setImportOpen(true);
  };
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [sidebarRightOpen, setSidebarRightOpen] = useState(true);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [project, setProject] = useState<ImportedProject | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "work">("chat");
  const [isDesktop, setIsDesktop] = useState(false);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [pendingDiffs, setPendingDiffs] = useState<PendingDiff[]>([]);
  const [activeSidebar, setActiveSidebar] = useState<
    "chat" | "explorer" | "database" | "logs" | null
  >("chat");
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  // Chave incremental que força remontagem do WorkspacePanel ao trocar/fechar projeto
  const [projectKey, setProjectKey] = useState(0);

  const handleClearProject = useCallback(() => {
    clearProject();
    setProject(null);
    setDirHandle(null);
    setOpenTabs([]);
    setActiveTab(null);
    setPendingDiffs([]);
    setExecutionLogs([]);
    saveArtifact(null);
    // Limpa a chave de projeto do projectKey para forçar remontagem do WorkspacePanel
    setProjectKey((k) => k + 1);
    toast.success("Projeto fechado com sucesso.");
  }, []);

  const handleImportedProject = useCallback((p: ImportedProject | null) => {
    setProject(p);
    setProjectKey((k) => k + 1);
    if (!p) {
      setDirHandle(null);
      setOpenTabs([]);
      setActiveTab(null);
      setPendingDiffs([]);
      setExecutionLogs([]);
      saveArtifact(null);
    } else {
      setDirHandle(null);
      setOpenTabs([]);
      setActiveTab(null);
      setPendingDiffs([]);
      saveArtifact(projectToArtifact(p));
    }
  }, []);

  useEffect(() => {
    setOpenTabs([]);
    setActiveTab(null);
    setPendingDiffs([]);
    setActiveSidebar("chat");
  }, [project?.id]);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return parseInt(localStorage.getItem("omniforge-sidebar") || "360", 10);
    }
    return 360;
  });

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (p) saveArtifact(projectToArtifact(p));
  }, []);

  // Callback quando uma pasta é aberta diretamente pelo Explorer
  const handleProjectOpenedFromExplorer = (
    newProject: ImportedProject,
    handle: FileSystemDirectoryHandle,
  ) => {
    setProject(newProject);
    setDirHandle(handle);
    setOpenTabs([]);
    setActiveTab(null);
    setPendingDiffs([]);
    saveArtifact(projectToArtifact(newProject));
  };

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    setIsDesktop(media.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const maxWidth = window.innerWidth * 0.7;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(startWidth + delta, maxWidth));
      setSidebarWidth(newWidth);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      const finalDelta = upEvent.clientX - startX;
      const finalWidth = Math.max(200, Math.min(startWidth + finalDelta, maxWidth));
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("omniforge-sidebar", finalWidth.toString());
      }
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      {isDesktop ? (
        <div className="flex w-full h-full overflow-hidden relative">
          {/* 1. Activity Bar (Extremo Esquerdo) */}
          <div className="w-14 flex-shrink-0 h-full border-r border-border/40 bg-card/25 backdrop-blur-md flex flex-col items-center py-4 justify-between select-none">
            {/* Atalhos Superiores */}
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="mb-2">
                <Logo />
              </div>

              <ActivityBarButton
                active={activeSidebar === "chat"}
                onClick={() => setActiveSidebar(activeSidebar === "chat" ? null : "chat")}
                icon={<MessageSquare className="h-5 w-5" />}
                title="Chat com IA"
              />
              <ActivityBarButton
                active={activeSidebar === "explorer"}
                onClick={() => setActiveSidebar(activeSidebar === "explorer" ? null : "explorer")}
                icon={<FolderOpen className="h-5 w-5" />}
                title="Explorer"
              />
              <ActivityBarButton
                active={activeSidebar === "database"}
                onClick={() => setActiveSidebar(activeSidebar === "database" ? null : "database")}
                icon={<Database className="h-5 w-5" />}
                title="Database Schema"
              />
              <ActivityBarButton
                active={activeSidebar === "logs"}
                onClick={() => setActiveSidebar(activeSidebar === "logs" ? null : "logs")}
                icon={<ScrollText className="h-5 w-5" />}
                title="Execution Logs"
              />
              <ActivityBarButton
                active={terminalOpen}
                onClick={() => setTerminalOpen(!terminalOpen)}
                icon={<Terminal className="h-5 w-5" />}
                title="Terminal"
              />
            </div>

            {/* Atalhos Inferiores */}
            <div className="flex flex-col items-center gap-4 w-full">
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Tema claro" : "Tema escuro"}
                className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                title="Configurações de LLM"
                className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <Settings className="h-5 w-5" />
              </button>
              <UserMenu />
            </div>
          </div>

          {/* 2. Workbench com Resizable Panels */}
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            {activeSidebar !== null ? (
              <ResizablePanelGroup
                id="outer-workbench-group"
                key={activeSidebar}
                direction="horizontal"
              >
                <ResizablePanel
                  id="sidebar-left"
                  defaultSize="22"
                  minSize="15"
                  maxSize="40"
                  className="h-full border-r border-border/30 bg-sidebar/25 backdrop-blur-xl"
                >
                  <div className="h-full w-full overflow-hidden flex flex-col">
                    {activeSidebar === "chat" && (
                      <ChatPanel
                        project={project}
                        dirHandle={dirHandle}
                        setProject={setProject}
                        onOpenImport={() => handleOpenImport("local")}
                        onAddLog={(log) => setExecutionLogs((prev) => [...prev.slice(-199), log])}
                        openTabs={openTabs}
                        setOpenTabs={setOpenTabs}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        pendingDiffs={pendingDiffs}
                        setPendingDiffs={setPendingDiffs}
                      />
                    )}
                    {activeSidebar === "explorer" && (
                      <ProjectExplorer
                        project={project}
                        dirHandle={dirHandle}
                        onSelectFile={(path, content) => {
                          const ext = (path.split(".").pop() || "").toLowerCase();
                          const isHtml = /^(html|htm)$/.test(ext);
                          const isReact = /^(tsx|jsx)$/.test(ext);

                          setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
                          setActiveTab(path);

                          saveArtifact({
                            id: path,
                            title: path.split("/").pop() || path,
                            lang: ext,
                            code: content,
                            blocks: [{ lang: ext, code: content }],
                            hasReact: isReact,
                            html: isHtml ? content : "",
                            updatedAt: Date.now(),
                          });
                        }}
                        onProjectOpened={handleProjectOpenedFromExplorer}
                      />
                    )}
                    {activeSidebar === "database" && <DesktopDatabasePanel project={project} />}
                    {activeSidebar === "logs" && <DesktopLogsPanel executionLogs={executionLogs} />}
                  </div>
                </ResizablePanel>
                <ResizableHandle
                  withHandle
                  className="bg-border/20 hover:bg-primary/40 transition-colors"
                />

                {/* Área de Trabalho Principal (Workspace) */}
                <ResizablePanel
                  id="workspace-main"
                  defaultSize="78"
                  minSize="55"
                  className="h-full overflow-hidden"
                >
                  <WorkspacePanel
                    key={projectKey}
                    project={project}
                    onOpenImport={handleOpenImport}
                    onClearProject={handleClearProject}
                    viewport={viewport}
                    setViewport={setViewport}
                    terminalOpen={terminalOpen}
                    setTerminalOpen={setTerminalOpen}
                    onOpenIntegrations={() => setIntegrationsOpen(true)}
                    onOpenPublish={() => setPublishOpen(true)}
                    onOpenSettings={() => setSettingsOpen(true)}
                    sidebarRightOpen={activeSidebar === "explorer"}
                    setSidebarRightOpen={(open) =>
                      setActiveSidebar(
                        open ? "explorer" : activeSidebar === "explorer" ? null : activeSidebar,
                      )
                    }
                    executionLogs={executionLogs}
                    onAddLog={(log) => setExecutionLogs((prev) => [...prev.slice(-199), log])}
                    openTabs={openTabs}
                    activeTab={activeTab}
                    setOpenTabs={setOpenTabs}
                    setActiveTab={setActiveTab}
                    dirHandle={dirHandle}
                    setProject={setProject}
                    pendingDiffs={pendingDiffs}
                    setPendingDiffs={setPendingDiffs}
                    isDesktop={isDesktop}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <WorkspacePanel
                key={projectKey}
                project={project}
                onOpenImport={handleOpenImport}
                onClearProject={handleClearProject}
                viewport={viewport}
                setViewport={setViewport}
                terminalOpen={terminalOpen}
                setTerminalOpen={setTerminalOpen}
                onOpenIntegrations={() => setIntegrationsOpen(true)}
                onOpenPublish={() => setPublishOpen(true)}
                onOpenSettings={() => setSettingsOpen(true)}
                sidebarRightOpen={false}
                setSidebarRightOpen={(open) => {
                  if (open) setActiveSidebar("explorer");
                }}
                executionLogs={executionLogs}
                onAddLog={(log) => setExecutionLogs((prev) => [...prev.slice(-199), log])}
                openTabs={openTabs}
                activeTab={activeTab}
                setOpenTabs={setOpenTabs}
                setActiveTab={setActiveTab}
                dirHandle={dirHandle}
                setProject={setProject}
                pendingDiffs={pendingDiffs}
                setPendingDiffs={setPendingDiffs}
                isDesktop={isDesktop}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={`${mobileView === "chat" ? "flex" : "hidden"} w-full`}>
            <ChatPanel
              project={project}
              dirHandle={dirHandle}
              setProject={setProject}
              onOpenImport={() => handleOpenImport("local")}
              onAddLog={(log) => setExecutionLogs((prev) => [...prev.slice(-199), log])}
              openTabs={openTabs}
              setOpenTabs={setOpenTabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              pendingDiffs={pendingDiffs}
              setPendingDiffs={setPendingDiffs}
            />
          </div>
          <div
            className={`${mobileView === "work" ? "flex flex-col" : "hidden"} w-full min-w-0 h-full overflow-hidden`}
          >
            <WorkspacePanel
              key={projectKey}
              project={project}
              onOpenImport={handleOpenImport}
              onClearProject={handleClearProject}
              viewport={viewport}
              setViewport={setViewport}
              terminalOpen={terminalOpen}
              setTerminalOpen={setTerminalOpen}
              onOpenIntegrations={() => setIntegrationsOpen(true)}
              onOpenPublish={() => setPublishOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              sidebarRightOpen={activeSidebar === "explorer"}
              setSidebarRightOpen={(open) =>
                setActiveSidebar(
                  open ? "explorer" : activeSidebar === "explorer" ? null : activeSidebar,
                )
              }
              executionLogs={executionLogs}
              onAddLog={(log) => setExecutionLogs((prev) => [...prev.slice(-199), log])}
              openTabs={openTabs}
              activeTab={activeTab}
              setOpenTabs={setOpenTabs}
              setActiveTab={setActiveTab}
              dirHandle={dirHandle}
              setProject={setProject}
              pendingDiffs={pendingDiffs}
              setPendingDiffs={setPendingDiffs}
              isDesktop={isDesktop}
            />
          </div>
          <nav
            aria-label="Alternar painel"
            className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
          >
            <button
              onClick={() => setMobileView("chat")}
              aria-pressed={mobileView === "chat"}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] ${mobileView === "chat" ? "text-foreground" : "text-muted-foreground"}`}
            >
              <PanelLeft className="h-4 w-4" /> Chat
            </button>
            <button
              onClick={() => setMobileView("work")}
              aria-pressed={mobileView === "work"}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] ${mobileView === "work" ? "text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" /> Workspace
            </button>
          </nav>
        </>
      )}
      <ImportProjectDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={handleImportedProject}
        onDirectoryHandle={setDirHandle}
        defaultTab={importTab}
      />
      <LlmSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <IntegrationsDialog open={integrationsOpen} onOpenChange={setIntegrationsOpen} />
      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} />
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const name = user.displayName || user.email || "Usuário";
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={`Logado como: ${name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors font-medium text-xs uppercase cursor-pointer shrink-0"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt={name} className="h-full w-full rounded-lg object-cover" />
          ) : (
            initial
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border min-w-[200px]">
        <div className="flex flex-col px-3 py-2 text-xs border-b border-border/50">
          <span className="font-semibold text-foreground truncate">
            {user.displayName || "Usuário"}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
        </div>
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="gap-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da Conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- CHAT PANEL ---------------- */
function ChatPanel({
  project,
  dirHandle,
  setProject,
  onOpenImport,
  onAddLog,
  openTabs,
  setOpenTabs,
  activeTab,
  setActiveTab,
  pendingDiffs,
  setPendingDiffs,
}: {
  project: ImportedProject | null;
  dirHandle: FileSystemDirectoryHandle | null;
  setProject: React.Dispatch<React.SetStateAction<ImportedProject | null>>;
  onOpenImport: () => void;
  onAddLog?: (log: string) => void;
  openTabs: string[];
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTab: string | null;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
  pendingDiffs: PendingDiff[];
  setPendingDiffs: React.Dispatch<React.SetStateAction<PendingDiff[]>>;
}) {
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [agents, setAgents] = useState<AgentsState>({
    leadId: "orchestrator",
    activeIds: ["orchestrator"],
  });
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [conversation, setConversation] = useState<Conversation>(() => newConversation());
  const [history, setHistory] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [streaming, setStreaming] = useState("");
  const [currentPhase, setCurrentPhase] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { theme, toggleTheme } = useTheme();

  const [currentModel, setCurrentModel] = useState(() => loadSelection());
  useEffect(() => {
    const id = setInterval(() => setCurrentModel(loadSelection()), 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setAgents(loadAgentsState());
  }, []);
  useEffect(() => {
    const handleFastApply = (e: Event) => {
      const { path, code } = (e as CustomEvent).detail;
      if (!project) {
        toast.error("Nenhum projeto ativo para aplicar as alterações.");
        return;
      }
      const originalFile = project.files.find((f) => f.path === path);
      const originalContent = originalFile?.content ?? "";
      if (originalContent === code) {
        toast.info(`O arquivo ${path} já está atualizado.`);
        return;
      }
      setPendingDiffs((prev) => {
        const filtered = prev.filter((d) => d.path !== path);
        return [...filtered, { path, original: originalContent, proposed: code }];
      });
      setOpenTabs((prev) => {
        const tabPath = `diff:${path}`;
        return prev.includes(tabPath) ? prev : [...prev, tabPath];
      });
      setActiveTab(`diff:${path}`);
      toast.info(`Alterações para ${path} prontas para revisão.`);
    };
    window.addEventListener("omniforge:fast-apply", handleFastApply);
    return () => window.removeEventListener("omniforge:fast-apply", handleFastApply);
  }, [project, setPendingDiffs, setOpenTabs, setActiveTab]);
  useEffect(() => {
    initSync().catch(() => {});
    setHistory(loadConversations());
    return subscribeConversations(() => setHistory(loadConversations()));
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages.length, streaming]);

  const lead = AGENTS.find((a) => a.id === agents.leadId);
  const activeCount = agents.activeIds.length;

  /* ----- shortcuts ----- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        startNew();
        return;
      }
      if (e.key === "Escape" && sending) {
        e.preventDefault();
        stopStream();
        return;
      }
      if (meta && e.key === "Enter") {
        e.preventDefault();
        handleSend();
        return;
      }
      if (e.key === "ArrowUp" && document.activeElement === textareaRef.current && input === "") {
        const last = [...conversation.messages].reverse().find((m) => m.role === "user");
        if (last) {
          e.preventDefault();
          beginEdit(last);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function startNew() {
    abortRef.current?.abort();
    setConversation(newConversation());
    setStreaming("");
    setTab("chat");
    setEditingId(null);
    setInput("");
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
      if (!kind) {
        toast.error(`Tipo não suportado: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10MB`);
        continue;
      }
      const isText = kind === "md";
      const content = isText ? await file.text() : await fileToDataUrl(file);
      next.push({ id: safeUUID(), name: file.name, size: file.size, kind, content });
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  function buildUserContent(text: string, atts: Attachment[]): string | ContentPart[] {
    const mdInline = atts
      .filter((a) => a.kind === "md")
      .map((a) => `\n\n--- Anexo: ${a.name} ---\n${a.content}`)
      .join("");
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

  async function runTurn(
    convo: Conversation,
    userMsgId: string,
    userContent: string | ContentPart[],
  ) {
    const sel = loadSelection();
    if (!sel) {
      toast.error("Selecione um modelo no seletor da caixa de envio");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSending(true);
    setStreaming("");
    setCurrentPhase("Iniciando...");
    try {
      // Histórico sem a última mensagem do usuário (vai como userContent separado)
      const baseWire: WireMessage[] = convo.messages
        .filter((m) => m.id !== userMsgId)
        .map((m) => ({ role: m.role, content: m.content }));
      let acc = "";
      let lastArtifactAt = 0;
      const render = () => setStreaming(acc);
      const { usage } = await runOrchestration(
        sel,
        baseWire,
        userContent,
        agents.activeIds,
        agents.leadId ?? "orchestrator",
        (label) => {
          setCurrentPhase(label);
          onAddLog?.(`[AGENT] ${label}`);
        },
        (chunk) => {
          acc += chunk;
          render();
          // Atualiza o artefato em tempo real (throttle ~300ms) assim que houver pelo menos um bloco fechado.
          const now = Date.now();
          if (now - lastArtifactAt > 300 && acc.lastIndexOf("```") > acc.indexOf("```")) {
            lastArtifactAt = now;
            const art = extractArtifact(acc);
            if (art) {
              saveArtifact(art);
              onAddLog?.(`[ARTIFACT] Artefato extraído: ${art.title} (${art.lang})`);
            }
          }
        },
        ctrl.signal,
      );
      const cost = estimateCostUsd(sel.model, usage.prompt, usage.completion);
      addTokens(usage.total, cost);
      const stopped = ctrl.signal.aborted;
      if (!stopped) {
        onAddLog?.(`[DONE] ${usage.total} tokens · ${formatUsd(cost)} · modelo: ${sel.model}`);
      } else {
        onAddLog?.(`[STOP] Interrompido pelo usuário após ${usage.total} tokens`);
      }
      const assistantMsg: ChatMessage = {
        id: safeUUID(),
        role: "assistant",
        content: acc + (stopped ? "\n\n_⏹ Interrompido pelo usuário._" : ""),
        tokens: usage.total,
        costUsd: cost,
        model: sel.model,
        createdAt: Date.now(),
      };
      const final: Conversation = { ...convo, messages: [...convo.messages, assistantMsg] };
      setConversation(final);
      saveConversation(final);
      const art = extractArtifact(assistantMsg.content);
      if (art) {
        saveArtifact(art);
        if (project) {
          let hasPendingDiffs = false;
          const nextDiffs: PendingDiff[] = [];

          for (const block of art.blocks) {
            let filePath = parseFilePathFromBlock(block.lang, block.code);
            if (!filePath) {
              if (/^(html|htm)$/i.test(block.lang) || /<html[\s>]/i.test(block.code)) {
                filePath = "index.html";
              } else if (/^(tsx|jsx)$/i.test(block.lang)) {
                filePath = "src/App.tsx";
              } else if (block.lang === "css") {
                filePath = "src/styles.css";
              } else if (/^(ts|js)$/i.test(block.lang)) {
                filePath = "src/index.ts";
              } else {
                continue;
              }
            }
            filePath = filePath.replace(/^[./\\]+/, "");

            const currentFile = project.files.find((f) => f.path === filePath);
            const originalContent = currentFile?.content ?? "";

            if (originalContent !== block.code) {
              nextDiffs.push({
                path: filePath,
                original: originalContent,
                proposed: block.code,
              });
              hasPendingDiffs = true;
            }
          }

          if (hasPendingDiffs) {
            setPendingDiffs((prev) => {
              const filtered = prev.filter((d) => !nextDiffs.some((n) => n.path === d.path));
              return [...filtered, ...nextDiffs];
            });

            const diffTabPaths = nextDiffs.map((d) => "diff:" + d.path);
            setOpenTabs((prev) => {
              const nextTabs = [...prev];
              diffTabPaths.forEach((tabPath) => {
                if (!nextTabs.includes(tabPath)) {
                  nextTabs.push(tabPath);
                }
              });
              return nextTabs;
            });

            setActiveTab(diffTabPaths[diffTabPaths.length - 1]);
            onAddLog?.(
              `[DIFF] ${nextDiffs.length} arquivo(s) aguardando aprovação na barra de abas`,
            );
            toast.info(`${nextDiffs.length} arquivo(s) aguardando aprovação`);
          } else {
            const nextProj = await writeArtifactToProject(art, project, dirHandle);
            setProject(nextProj);
            onAddLog?.(`[PROJECT] Sem alterações novas detectadas`);
          }
        }
      }
      setStreaming("");
      if (!stopped) {
        const n = agents.activeIds.length;
        toast.success(`${usage.total} tokens · ${formatUsd(cost)} · ${n} agente(s)`);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        const errMsg = e instanceof Error ? e.message : "Falha ao chamar a LLM";
        toast.error(errMsg);
        onAddLog?.(`[ERROR] ${errMsg}`);
      }
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
      id: safeUUID(),
      role: "user",
      content: text || "(anexos)",
      images: images.length ? images : undefined,
      files: files.length ? files : undefined,
      createdAt: Date.now(),
    };
    const convo: Conversation = {
      ...conversation,
      title:
        conversation.messages.length === 0
          ? titleFrom(text || files[0] || "Conversa")
          : conversation.title,
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

  function beginEdit(m: ChatMessage) {
    setEditingId(m.id);
    setEditingText(typeof m.content === "string" ? m.content : "");
    setTab("chat");
  }
  async function saveEdit() {
    if (!editingId || sending) return;
    const idx = conversation.messages.findIndex((m) => m.id === editingId);
    if (idx < 0) return;
    const newText = editingText.trim();
    if (!newText) {
      setEditingId(null);
      return;
    }
    const truncated = conversation.messages.slice(0, idx);
    const newMsg: ChatMessage = { ...conversation.messages[idx], content: newText };
    const convo: Conversation = { ...conversation, messages: [...truncated, newMsg] };
    setConversation(convo);
    setEditingId(null);
    setEditingText("");
    await runTurn(convo, newMsg.id, newText);
  }

  function exportConversation(format: "md" | "json") {
    if (conversation.messages.length === 0) {
      toast.error("Nada para exportar");
      return;
    }
    const slug = conversation.title.replace(/[^\w-]+/g, "-").slice(0, 40) || "conversa";
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
        if (m.tokens)
          lines.push(`\n> _${m.model} · ${m.tokens} tok · ${formatUsd(m.costUsd ?? 0)}_`);
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

  async function handleImport(list: FileList | null) {
    if (!list || list.length === 0) return;
    let count = 0;
    for (const f of Array.from(list)) {
      try {
        const raw = await f.text();
        const c = parseImportedConversation(raw, f.name);
        importConversation(c);
        count++;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    if (count > 0) toast.success(`${count} conversa(s) importada(s)`);
  }

  /* ----- slash commands & cost preview ----- */
  const slashMatches = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const q = input.slice(1).split(/\s/)[0].toLowerCase();
    return PROMPT_TEMPLATES.filter((t) => t.slug.startsWith(q));
  }, [input]);
  const showSlash = slashMatches.length > 0 && input.startsWith("/") && !input.includes("\n");

  const previewTokens = useMemo(() => {
    const base = estimateTokens(input);
    const att = attachments.reduce(
      (s, a) => s + (a.kind === "md" ? estimateTokens(a.content) : 200),
      0,
    );
    return base + att;
  }, [input, attachments]);
  const previewCost = currentModel ? estimatePromptCostUsd(currentModel.model, previewTokens) : 0;

  const filteredHistory = useMemo(() => searchConversations(history, search), [history, search]);

  return (
    <aside className="flex w-full h-full min-w-0 flex-col bg-sidebar/80 backdrop-blur-xl pb-12 md:pb-0">
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
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} prompt={input} />

      <div className="flex items-center gap-1 px-3 pt-3">
        <TabButton
          active={tab === "chat"}
          onClick={() => setTab("chat")}
          icon={<MessageSquare className="h-4 w-4" />}
        >
          Chat
        </TabButton>
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<History className="h-4 w-4" />}
        >
          Histórico{" "}
          {history.length > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">({history.length})</span>
          )}
        </TabButton>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setCompareOpen(true)}
            title="Comparar modelos lado a lado"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Columns3 className="h-4 w-4" />
          </button>
          {conversation.messages.length > 0 && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={sending}
                aria-label="Regenerar última resposta"
                title="Regenerar última resposta"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Exportar / importar conversa"
                    title="Exportar / importar conversa"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportConversation("md")}>
                    Exportar como .md
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportConversation("json")}>
                    Exportar como .json
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar conversa…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <input
            ref={importInputRef}
            type="file"
            multiple
            accept=".json,.md,application/json,text/markdown"
            className="hidden"
            onChange={(e) => {
              handleImport(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={startNew}
            aria-label="Nova conversa (Ctrl+K)"
            title="Nova conversa (Ctrl+K)"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <MessageCirclePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {tab === "history" && (
        <div className="px-3 pt-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas…"
              className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/70"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "history" ? (
          <HistoryList
            list={filteredHistory}
            activeId={conversation.id}
            onOpen={openConversation}
          />
        ) : conversation.messages.length === 0 && !streaming ? (
          <EmptyChat />
        ) : (
          <div className="flex flex-col gap-3">
            {conversation.messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                editing={editingId === m.id}
                editingText={editingText}
                onEditChange={setEditingText}
                onEditStart={() => beginEdit(m)}
                onEditSave={saveEdit}
                onEditCancel={() => setEditingId(null)}
              />
            ))}
            {streaming && (
              <MessageBubble
                m={{ id: "stream", role: "assistant", content: streaming, createdAt: Date.now() }}
                streaming
              />
            )}
            {sending && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-card border border-border text-xs text-muted-foreground w-fit max-w-[85%] self-start animate-pulse">
                <div className="flex space-x-1 items-center shrink-0">
                  <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"></span>
                </div>
                <span className="font-medium truncate">{currentPhase || "Processando..."}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 relative">
        {!project && (
          <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2 text-[11px] text-amber-500">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Nenhum projeto aberto. Abra ou crie um projeto para gravar os códigos gerados.
            </span>
            <button
              onClick={onOpenImport}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-bold px-2 py-0.5 rounded transition shrink-0"
            >
              Criar / Abrir
            </button>
          </div>
        )}
        {showSlash && (
          <div className="absolute left-3 right-3 bottom-full mb-2 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-10">
            {slashMatches.map((t) => (
              <button
                key={t.slug}
                onClick={() => setInput(t.label + " ")}
                className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs flex items-center justify-between gap-2"
              >
                <span className="font-mono text-primary">{t.label}</span>
                <span className="text-muted-foreground truncate">{t.description}</span>
              </button>
            ))}
          </div>
        )}
        <div className="surface rounded-2xl border border-border p-2.5 focus-within:border-primary/50 focus-within:glow transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Descreva o que você quer construir… (digite / para comandos)"
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <div className="px-1 pb-1">
            <ChatComposerSelectors
              agents={agents}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenAgents={() => setAgentsOpen(true)}
              onAgentsChange={setAgents}
            />
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1 pb-1">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-1.5 py-1 text-[11px]"
                >
                  {a.kind === "image" ? (
                    <img src={a.content} alt={a.name} className="h-6 w-6 rounded object-cover" />
                  ) : a.kind === "pdf" ? (
                    <FileType2 className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  <span className="max-w-[120px] truncate">{a.name}</span>
                  <button
                    onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                    className="text-muted-foreground hover:text-foreground"
                  >
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
                aria-label="Importar projeto (pasta ou GitHub)"
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
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Anexar imagens, PDF ou Markdown"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              {(input || attachments.length > 0) && currentModel && (
                <span
                  className="text-[10px] text-muted-foreground px-1"
                  title="Estimativa antes do envio"
                >
                  ≈ {previewTokens} tok · ~{formatUsd(previewCost)}
                </span>
              )}
            </div>
            {sending ? (
              <button
                onClick={stopStream}
                aria-label="Parar geração (Esc)"
                title="Parar geração (Esc)"
                className="grid h-9 w-9 place-items-center rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                aria-label="Enviar (Ctrl+Enter)"
                title="Enviar (Ctrl+Enter)"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Ctrl+Enter envia · Ctrl+K nova · Esc para · ↑ edita última
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

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

function ActivityBarButton({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-11 w-11 place-items-center rounded-xl transition-all cursor-pointer relative group ${
        active
          ? "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
      <span className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border text-popover-foreground text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
        {title}
      </span>
    </button>
  );
}

/* ---------------- DESKTOP DATABASE PANEL ---------------- */
function DesktopDatabasePanel({ project }: { project: ImportedProject | null }) {
  const databaseSchema = useMemo(() => {
    if (!project) return null;
    return project.files.filter(
      (f) =>
        /\.(prisma|sql)$/i.test(f.path) ||
        f.path.includes("schema") ||
        f.path.includes("migration"),
    );
  }, [project]);

  return (
    <div className="h-full flex flex-col min-w-0 bg-transparent overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/10 shrink-0 select-none">
        <Database className="h-4 w-4 text-primary" />
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
          Database Schema
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {databaseSchema && databaseSchema.length > 0 ? (
          databaseSchema.map((f) => (
            <div
              key={f.path}
              className="rounded-xl border border-border bg-card/20 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card/40 border-b border-border/50">
                <Database className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                <span
                  className="text-[10px] font-mono text-muted-foreground truncate"
                  title={f.path}
                >
                  {f.path.split("/").pop()}
                </span>
              </div>
              {f.content ? (
                <pre className="text-[10px] p-3 font-mono whitespace-pre-wrap text-foreground/80 max-h-60 overflow-y-auto leading-relaxed select-text">
                  {f.content}
                </pre>
              ) : (
                <div className="px-3 py-4 text-center text-[10px] text-muted-foreground">
                  Conteúdo não carregado
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
            <Database className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-xs font-medium">Nenhum schema</p>
            <p className="text-[10px] opacity-70 mt-1">Importe arquivos .prisma ou .sql</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- DESKTOP LOGS PANEL ---------------- */
function DesktopLogsPanel({ executionLogs }: { executionLogs?: string[] }) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executionLogs]);

  return (
    <div className="h-full flex flex-col min-w-0 bg-[#0d1117]/60 font-mono overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 select-none bg-[#0d1117]/80">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase font-semibold tracking-wider text-white/60">
            Execution Logs
          </span>
        </div>
        <span className="text-[9px] text-white/30">{executionLogs?.length ?? 0} linhas</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {!executionLogs || executionLogs.length === 0 ? (
          <div className="text-center py-12 text-white/30 select-none">
            <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-[10px]">Nenhum log disponível.</p>
          </div>
        ) : (
          executionLogs.map((log, i) => (
            <div key={i} className="flex gap-2 text-[10px] leading-relaxed">
              <span className="text-white/20 select-none w-6 text-right shrink-0">{i + 1}</span>
              <span
                className={`flex-1 break-all select-text ${
                  log.startsWith("[ERROR]")
                    ? "text-red-400"
                    : log.startsWith("[WARN]")
                      ? "text-yellow-400"
                      : log.startsWith("[")
                        ? "text-cyan-400"
                        : "text-white/70"
                }`}
              >
                {log}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

/* ---------------- WORKSPACE PANEL ---------------- */
function WorkspacePanel({
  project,
  onOpenImport,
  onClearProject,
  viewport,
  setViewport,
  onOpenIntegrations,
  onOpenPublish,
  sidebarRightOpen,
  setSidebarRightOpen,
  executionLogs,
  openTabs,
  activeTab,
  setOpenTabs,
  setActiveTab,
  dirHandle,
  setProject,
  pendingDiffs,
  setPendingDiffs,
  isDesktop,
  terminalOpen,
  setTerminalOpen,
  onOpenSettings,
}: {
  project: ImportedProject | null;
  onOpenImport: (tab: "saved" | "local" | "github" | "new") => void;
  onClearProject: () => void;
  viewport: "desktop" | "mobile";
  setViewport: (v: "desktop" | "mobile") => void;
  onOpenIntegrations: () => void;
  onOpenPublish: () => void;
  sidebarRightOpen: boolean;
  setSidebarRightOpen: (open: boolean) => void;
  executionLogs?: string[];
  onAddLog?: (log: string) => void;
  openTabs: string[];
  activeTab: string | null;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
  dirHandle: FileSystemDirectoryHandle | null;
  setProject: React.Dispatch<React.SetStateAction<ImportedProject | null>>;
  pendingDiffs: PendingDiff[];
  setPendingDiffs: React.Dispatch<React.SetStateAction<PendingDiff[]>>;
  isDesktop: boolean;
  terminalOpen?: boolean;
  setTerminalOpen?: (open: boolean) => void;
  onOpenSettings?: () => void;
}) {
  const [tab, setTab] = useState<"code" | "database" | "logs" | "terminal">("code");
  const [artifact, setArtifact] = useState<Artifact | null>(() => loadArtifact());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const activeArtifact = useMemo(() => {
    if (!activeTab || !project) return artifact;

    const isDiff = activeTab.startsWith("diff:");
    const filePath = isDiff ? activeTab.slice(5) : activeTab;

    if (isDiff) {
      const diffInfo = pendingDiffs.find((d) => d.path === filePath);
      if (diffInfo) {
        const ext = (filePath.split(".").pop() || "").toLowerCase();
        const isHtml = /^(html|htm)$/.test(ext);
        const isReact = /^(tsx|jsx)$/.test(ext);
        return {
          id: filePath,
          title: filePath.split("/").pop() || filePath,
          lang: ext,
          code: diffInfo.proposed,
          blocks: [{ lang: ext, code: diffInfo.proposed }],
          hasReact: isReact,
          html: isHtml ? diffInfo.proposed : "",
          updatedAt: Date.now(),
        };
      }
    } else {
      const file = project.files.find((f) => f.path === filePath);
      if (file) {
        const ext = (filePath.split(".").pop() || "").toLowerCase();
        const isHtml = /^(html|htm)$/.test(ext);
        const isReact = /^(tsx|jsx)$/.test(ext);
        return {
          id: filePath,
          title: filePath.split("/").pop() || filePath,
          lang: ext,
          code: file.content || "",
          blocks: [{ lang: ext, code: file.content || "" }],
          hasReact: isReact,
          html: isHtml ? file.content || "" : "",
          updatedAt: Date.now(),
        };
      }
    }
    return artifact;
  }, [activeTab, project, artifact, pendingDiffs]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorValueRef = useRef<string>("");
  const currentActiveTabRef = useRef<string | null>(null);

  // Carrega conteúdo sob demanda para arquivos não carregados
  useEffect(() => {
    if (!activeTab || !project || !dirHandle) return;

    const file = project.files.find((f) => f.path === activeTab);
    if (file && file.content === undefined) {
      readFileContent(dirHandle, activeTab)
        .then((content: string) => {
          const updatedFiles = project.files.map((f) =>
            f.path === activeTab ? { ...f, content, size: content.length } : f,
          );
          const nextProj = { ...project, files: updatedFiles };
          setProject(nextProj);
          saveProject(nextProj);
        })
        .catch((err: any) => {
          console.error(`Erro ao carregar conteúdo do disco para ${activeTab}:`, err);
        });
    }
  }, [activeTab, project?.id, dirHandle, setProject, project]);

  // Função imediata para salvar o arquivo de fato
  const saveFileImmediate = useCallback(
    async (path: string, value: string) => {
      if (!project) return;

      // 1. Atualizar em memória
      const updatedFiles = project.files.map((f) =>
        f.path === path ? { ...f, content: value, size: value.length } : f,
      );
      const nextProj = { ...project, files: updatedFiles };
      setProject(nextProj);
      saveProject(nextProj);

      // 2. Escrever no disco se dirHandle existir
      if (dirHandle) {
        try {
          await writeLocalFile(dirHandle, path, value);
          console.log(`[OmniForge] Salvo localmente: ${path}`);
        } catch (err) {
          console.error(`[OmniForge] Falha ao gravar no disco: ${path}`, err);
        }
      }

      // 3. Atualizar o artefato para hot-reload
      const ext = (path.split(".").pop() || "").toLowerCase();
      const isHtml = /^(html|htm)$/.test(ext);
      const isReact = /^(tsx|jsx)$/.test(ext);

      saveArtifact({
        id: path,
        title: path.split("/").pop() || path,
        lang: ext,
        code: value,
        blocks: [{ lang: ext, code: value }],
        hasReact: isReact,
        html: isHtml ? value : "",
        updatedAt: Date.now(),
      });
    },
    [project, dirHandle, setProject],
  );

  // Quando activeTab mudar, salva o arquivo anterior imediatamente se houver valor pendente na ref
  useEffect(() => {
    const previousTab = currentActiveTabRef.current;
    const previousValue = editorValueRef.current;

    currentActiveTabRef.current = activeTab;

    // Apenas tenta salvar se a aba anterior era uma aba de arquivo normal (não diff)
    if (previousTab && !previousTab.startsWith("diff:") && project) {
      const originalFile = project.files.find((f) => f.path === previousTab);
      if (originalFile && originalFile.content !== previousValue && previousValue !== "") {
        saveFileImmediate(previousTab, previousValue);
      }
    }

    if (activeTab && project) {
      const cleaned = activeTab.startsWith("diff:") ? activeTab.slice(5) : activeTab;
      const currentFile = project.files.find((f) => f.path === cleaned);
      editorValueRef.current = currentFile?.content || "";
    } else {
      editorValueRef.current = "";
    }
  }, [activeTab, project, saveFileImmediate]);

  // Limpa o timeout no desmonte do componente
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handler de alteração do Monaco Editor com debounce
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    editorValueRef.current = value;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const tabToSave = activeTab;
    if (!tabToSave || tabToSave.startsWith("diff:")) return;

    debounceTimeoutRef.current = setTimeout(async () => {
      await saveFileImmediate(tabToSave, value);
    }, 500);
  };

  // Métodos utilitários de extensão e ícones
  const getEditorLanguage = (filePath: string | null) => {
    if (!filePath) return "javascript";
    const cleaned = filePath.startsWith("diff:") ? filePath.slice(5) : filePath;
    const ext = cleaned.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "html":
      case "htm":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "md":
      case "markdown":
        return "markdown";
      case "py":
        return "python";
      case "sql":
        return "sql";
      default:
        return "plaintext";
    }
  };

  const getFileIcon = (filePath: string) => {
    const cleaned = filePath.startsWith("diff:") ? filePath.slice(5) : filePath;
    const ext = cleaned.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
      case "htm":
      case "css":
        return <Globe className="h-3.5 w-3.5 text-blue-400" />;
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <Code2 className="h-3.5 w-3.5 text-amber-400" />;
      case "json":
      case "yml":
      case "yaml":
      case "toml":
      case "env":
        return <Settings className="h-3.5 w-3.5 text-rose-400" />;
      case "sql":
      case "prisma":
        return <Database className="h-3.5 w-3.5 text-emerald-400" />;
      case "md":
      case "markdown":
      case "txt":
        return <FileText className="h-3.5 w-3.5 text-violet-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabPath: string) => {
    e.stopPropagation();
    const nextTabs = openTabs.filter((t) => t !== tabPath);
    setOpenTabs(nextTabs);

    if (activeTab === tabPath) {
      if (nextTabs.length > 0) {
        setActiveTab(nextTabs[nextTabs.length - 1]);
      } else {
        setActiveTab(null);
      }
    }
  };

  const handleAcceptDiff = async (filePath: string) => {
    const diff = pendingDiffs.find((d) => d.path === filePath);
    if (!diff || !project) return;

    // 1. Grava no disco e memória
    const updatedFiles = project.files.map((f) =>
      f.path === filePath ? { ...f, content: diff.proposed, size: diff.proposed.length } : f,
    );
    const nextProj = { ...project, files: updatedFiles };
    setProject(nextProj);
    saveProject(nextProj);

    if (dirHandle) {
      try {
        await writeLocalFile(dirHandle, filePath, diff.proposed);
        toast.success(`Alterações aplicadas no disco: ${filePath}`);
      } catch (err) {
        toast.error(`Erro ao gravar no disco: ${filePath}`);
        console.error(err);
      }
    } else {
      toast.success(`Alterações aplicadas na memória: ${filePath}`);
    }

    // 2. Atualiza o Artifact para recarregar o Preview
    const ext = filePath.split(".").pop()?.toLowerCase();
    const isHtml = /^(html|htm)$/.test(ext || "");
    const isReact = /^(tsx|jsx)$/.test(ext || "");
    saveArtifact({
      id: filePath,
      title: filePath.split("/").pop() || filePath,
      lang: ext || "tsx",
      code: diff.proposed,
      blocks: [{ lang: ext || "tsx", code: diff.proposed }],
      hasReact: isReact,
      html: isHtml ? diff.proposed : "",
      updatedAt: Date.now(),
    });

    // 3. Remove o diff da fila
    setPendingDiffs((prev) => prev.filter((d) => d.path !== filePath));

    // 4. Fecha a aba de diff e abre o arquivo normal
    const nextTabs = openTabs.filter((t) => t !== `diff:${filePath}`);
    if (!nextTabs.includes(filePath)) {
      nextTabs.push(filePath);
    }
    setOpenTabs(nextTabs);
    setActiveTab(filePath);
  };

  const handleRejectDiff = (filePath: string) => {
    // 1. Remove o diff da fila
    setPendingDiffs((prev) => prev.filter((d) => d.path !== filePath));

    // 2. Fecha a aba de diff
    const nextTabs = openTabs.filter((t) => t !== `diff:${filePath}`);
    setOpenTabs(nextTabs);
    if (activeTab === `diff:${filePath}`) {
      if (nextTabs.length > 0) {
        setActiveTab(nextTabs[nextTabs.length - 1]);
      } else {
        setActiveTab(null);
      }
    }

    // 3. Restaura o Preview para a versão atual salva do projeto
    if (project) {
      saveArtifact(projectToArtifact(project));
    }
    toast.info(`Alterações descartadas para: ${filePath}`);
  };

  const renderCodeArea = () => {
    if (openTabs.length === 0 || !activeTab) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
          <Code2 className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum arquivo aberto</p>
          <p className="text-xs opacity-70 mt-1 leading-relaxed">
            Selecione um arquivo no Explorer para editá-lo.
          </p>
        </div>
      );
    }

    const isDiff = activeTab.startsWith("diff:");
    const filePath = isDiff ? activeTab.slice(5) : activeTab;
    const language = getEditorLanguage(activeTab);

    const tabBar = (
      <div className="flex items-center justify-between border-b border-border/40 bg-card/25 shrink-0 overflow-x-auto select-none no-scrollbar h-9">
        <div className="flex items-center h-full flex-nowrap whitespace-nowrap">
          {openTabs.map((tabPath) => {
            const isActive = tabPath === activeTab;
            const isTabDiff = tabPath.startsWith("diff:");
            const tabFilePath = isTabDiff ? tabPath.slice(5) : tabPath;
            const tabName = tabFilePath.split("/").pop() || tabFilePath;

            return (
              <div
                key={tabPath}
                onClick={() => setActiveTab(tabPath)}
                className={`flex items-center gap-2 h-full px-3 border-r border-border/30 cursor-pointer transition-colors relative whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-background text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                {isActive && <span className="absolute top-0 inset-x-0 h-[2px] bg-primary" />}

                {isTabDiff ? (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                ) : (
                  getFileIcon(tabPath)
                )}

                <span className={isTabDiff ? "text-amber-500/90 font-medium" : ""}>
                  {isTabDiff ? `Revisar: ${tabName}` : tabName}
                </span>

                {isTabDiff && (
                  <div
                    className="flex items-center gap-1 ml-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleAcceptDiff(tabFilePath)}
                      title="Aceitar alterações"
                      className="flex items-center justify-center rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[9px] px-1.5 py-0.5 font-bold transition duration-150 cursor-pointer"
                    >
                      <Check className="h-2.5 w-2.5 mr-0.5" /> Aceitar
                    </button>
                    <button
                      onClick={() => handleRejectDiff(tabFilePath)}
                      title="Descartar alterações"
                      className="flex items-center justify-center rounded bg-destructive/20 hover:bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 font-bold transition duration-150 cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5 mr-0.5" /> Descartar
                    </button>
                  </div>
                )}

                <button
                  onClick={(e) => handleCloseTab(e, tabPath)}
                  className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (isDiff) {
      const diffInfo = pendingDiffs.find((d) => d.path === filePath);
      const originalContent = diffInfo?.original ?? "";
      const proposedContent = diffInfo?.proposed ?? "";

      return (
        <div className="h-full flex flex-col min-w-0 overflow-hidden">
          {tabBar}
          <div className="flex-1 min-h-0 w-full relative">
            <DiffEditor
              key={`diff:${activeTab}`}
              original={originalContent}
              modified={proposedContent}
              language={language}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                },
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col min-w-0 overflow-hidden">
        {tabBar}
        <div className="flex-1 min-h-0 w-full relative">
          <Editor
            key={`edit:${activeTab}`}
            value={editorValueRef.current}
            onChange={handleEditorChange}
            language={language}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              fontFamily: "var(--font-mono, Menlo, Monaco, 'Courier New', monospace)",
              automaticLayout: true,
              wordWrap: "on",
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
              },
            }}
          />
        </div>
      </div>
    );
  };

  useEffect(() => subscribeArtifact(setArtifact), []);
  useEffect(() => {
    if (artifact) setTab("code");
  }, [artifact?.updatedAt, artifact]);

  // Auto-scroll logs ao final quando novos logs chegam
  useEffect(() => {
    if (tab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [executionLogs, tab]);

  const hasPreview = !!activeArtifact?.html || !!activeArtifact?.hasReact;

  // Extrai schema de banco do projeto
  const databaseSchema = useMemo(() => {
    if (!project) return null;
    const schemaFiles = project.files.filter(
      (f) =>
        /\.(prisma|sql)$/i.test(f.path) ||
        f.path.includes("schema") ||
        f.path.includes("migration"),
    );
    return schemaFiles;
  }, [project]);

  const handleOpenExternal = () => {
    if (!activeArtifact) return;
    let htmlContent = "";
    if (activeArtifact.hasReact) {
      htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>\${activeArtifact.title || "OmniForge Preview"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "lucide-react": "https://esm.sh/lucide-react@0.400.0"
    }
  }
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    const code = \${JSON.stringify(activeArtifact.code)};
    const root = createRoot(document.getElementById('root'));
    try {
      const transformed = Babel.transform(code, { presets: ['react'] }).code;
      const blob = new Blob([transformed], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      import(url).then(mod => {
        const Component = mod.default;
        root.render(React.createElement(Component));
      });
    } catch (err) {
      root.render(React.createElement('pre', { style: { color: '#ff4444', padding: '16px', background: '#fee', whiteSpace: 'pre-wrap' } }, err.toString()));
    }
  </script>
</body>
</html>`;
    } else {
      htmlContent =
        activeArtifact.html ||
        `<!DOCTYPE html><html><head><style>body { margin: 0; font-family: system-ui; }</style></head><body>\${activeArtifact.code}</body></html>`;
    }

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return isDesktop ? (
    <section className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-background/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-colors text-sm cursor-pointer">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">
                  {project ? project.name : artifact ? "Artefato gerado" : "Sem projeto"}
                </span>
                {project && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    · {project.files.length} arq.
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-border">
              <DropdownMenuItem
                onSelect={() => onOpenImport("saved")}
                onClick={() => onOpenImport("saved")}
                className="gap-2 text-xs cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5 text-primary" /> Abrir Projeto
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onOpenImport("new")}
                onClick={() => onOpenImport("new")}
                className="gap-2 text-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-primary" /> Novo Projeto
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onClearProject()}
                onClick={() => onClearProject()}
                disabled={!project}
                className="gap-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-destructive" /> Fechar Projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <TokenMeter />
          {activeArtifact && (
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground cursor-pointer"
              title="Abrir resultado do código em nova aba"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /> Abrir Preview
            </button>
          )}
          <button
            onClick={onOpenIntegrations}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-accent transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" /> Integrações
          </button>
          <button
            onClick={onOpenPublish}
            className="rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] px-3 py-1.5 text-xs font-medium text-primary-foreground glow hover:opacity-95 transition cursor-pointer"
          >
            Publicar
          </button>
          <button
            onClick={() => setSidebarRightOpen(!sidebarRightOpen)}
            title={sidebarRightOpen ? "Esconder Explorer" : "Mostrar Explorer"}
            className={`p-1.5 rounded-lg border border-border bg-card/60 transition hover:bg-accent/40 ${
              sidebarRightOpen ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {terminalOpen ? (
          <ResizablePanelGroup id="editor-terminal-vertical-group" direction="vertical">
            <ResizablePanel id="editor-code-subpanel" defaultSize={70} minSize={30}>
              <div className="h-full w-full overflow-hidden flex flex-col">{renderCodeArea()}</div>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="bg-border/20 hover:bg-primary/40 transition-colors"
            />
            <ResizablePanel id="editor-terminal-subpanel" defaultSize={30} minSize={15}>
              <div className="h-full w-full overflow-hidden border-t border-border bg-card/30 flex flex-col relative">
                {/* Top Bar for Desktop Terminal Panel */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Terminal CLI
                    </span>
                  </div>
                  <button
                    onClick={() => setTerminalOpen?.(false)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition cursor-pointer"
                    title="Fechar Terminal"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <TerminalView project={project} onOpenSettings={onOpenSettings} />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 min-h-0 w-full h-full overflow-hidden">{renderCodeArea()}</div>
        )}
      </div>
    </section>
  ) : (
    <section className="flex flex-col h-full overflow-hidden pb-12 md:pb-0">
      <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-colors text-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">
                  {project ? project.name : artifact ? "Artefato gerado" : "Sem projeto"}
                </span>
                {project && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    · {project.files.length} arq.
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-border">
              <DropdownMenuItem
                onSelect={() => onOpenImport("saved")}
                onClick={() => onOpenImport("saved")}
                className="gap-2 text-xs cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5 text-primary" /> Abrir Projeto
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onOpenImport("new")}
                onClick={() => onOpenImport("new")}
                className="gap-2 text-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-primary" /> Novo Projeto
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onClearProject()}
                onClick={() => onClearProject()}
                disabled={!project}
                className="gap-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-destructive" /> Fechar Projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <TokenMeter />
          {activeArtifact && (
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </button>
          )}
          <button
            onClick={onOpenIntegrations}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" /> Integrações
          </button>
          <button
            onClick={onOpenPublish}
            className="rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] px-3 py-1.5 text-xs font-medium text-primary-foreground glow hover:opacity-95 transition"
          >
            Publicar
          </button>
          <button
            onClick={() => setSidebarRightOpen(!sidebarRightOpen)}
            title={sidebarRightOpen ? "Esconder Explorer" : "Mostrar Explorer"}
            className={`p-1.5 rounded-lg border border-border bg-card/60 transition hover:bg-accent/40 ${
              sidebarRightOpen ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border bg-card/30 px-3">
        <div className="flex items-center">
          <WorkTab
            active={tab === "code"}
            onClick={() => setTab("code")}
            icon={<Code2 className="h-3.5 w-3.5" />}
          >
            Código
          </WorkTab>
          <WorkTab
            active={tab === "database"}
            onClick={() => setTab("database")}
            icon={<Database className="h-3.5 w-3.5" />}
          >
            Database
          </WorkTab>
          <WorkTab
            active={tab === "logs"}
            onClick={() => setTab("logs")}
            icon={<ScrollText className="h-3.5 w-3.5" />}
          >
            Logs
          </WorkTab>
          <WorkTab
            active={tab === "terminal"}
            onClick={() => setTab("terminal")}
            icon={<Terminal className="h-3.5 w-3.5" />}
          >
            Terminal
          </WorkTab>
        </div>
        {artifact && (
          <button
            onClick={() => saveArtifact(null)}
            aria-label="Limpar artefato"
            className="text-muted-foreground hover:text-foreground p-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-background/20">
        {/* ABA CÓDIGO */}
        {tab === "code" && renderCodeArea()}

        {/* ABA DATABASE */}
        {tab === "database" && <MobileDatabasePanel schema={databaseSchema} />}

        {/* ABA LOGS */}
        {tab === "logs" && <MobileLogsPanel logs={executionLogs} logsEndRef={logsEndRef} />}

        {/* ABA TERMINAL */}
        {tab === "terminal" && <TerminalView project={project} onOpenSettings={onOpenSettings} />}
      </div>
    </section>
  );
}

function MobileDatabasePanel({ schema }: { schema: any[] | null }) {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {schema && schema.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Schema do Banco de Dados</span>
          </div>
          {schema.map((f) => (
            <div
              key={f.path}
              className="rounded-xl border border-border bg-card/30 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-card/50 border-b border-border/50">
                <Database className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-xs font-mono text-muted-foreground">{f.path}</span>
              </div>
              <pre className="text-xs p-4 font-mono whitespace-pre-wrap text-foreground/80 max-h-80 overflow-auto">
                {f.content}
              </pre>
            </div>
          ))}
        </>
      ) : (
        <div className="h-full flex flex-center text-center text-muted-foreground text-xs">
          Nenhum esquema encontrado.
        </div>
      )}
    </div>
  );
}

function MobileLogsPanel({ logs, logsEndRef }: { logs: string[] | undefined; logsEndRef?: any }) {
  return (
    <div className="h-full overflow-auto bg-[#0d1117] font-mono p-4 space-y-1">
      {logs?.map((log, i) => (
        <div key={i} className="flex gap-3 text-[11px] text-white/70">
          <span className="text-white/25 w-8 text-right">{String(i + 1).padStart(3, "0")}</span>
          <span>{log}</span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
}

function ViewportBtn({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`grid h-7 w-9 place-items-center rounded-md transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function WorkTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)]" />
      )}
    </button>
  );
}

/* ---------------- ATTACHMENTS ---------------- */
type AttachmentKind = "image" | "pdf" | "md";
interface Attachment {
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
  content: string;
}

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

interface MsgBubbleProps {
  m: ChatMessage;
  streaming?: boolean;
  editing?: boolean;
  editingText?: string;
  onEditChange?: (v: string) => void;
  onEditStart?: () => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
}

function MessageBubble({
  m,
  streaming,
  editing,
  editingText,
  onEditChange,
  onEditStart,
  onEditSave,
  onEditCancel,
}: MsgBubbleProps) {
  const isUser = m.role === "user";
  if (editing && isUser) {
    return (
      <div className="flex flex-col gap-1 items-end">
        <div className="w-full">
          <textarea
            value={editingText}
            onChange={(e) => onEditChange?.(e.target.value)}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-2xl border border-primary/50 bg-card/60 px-3 py-2 text-sm focus:outline-none"
          />
          <div className="flex justify-end gap-1.5 mt-1">
            <button
              onClick={onEditCancel}
              className="rounded-md border border-border bg-card/60 px-2 py-1 text-[11px] hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              onClick={onEditSave}
              className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[11px] hover:opacity-90"
            >
              <Check className="h-3 w-3 inline mr-0.5" /> Salvar e regerar
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`group flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm break-words relative ${
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-card/60 border border-border"
        }`}
      >
        {isUser ? m.content : <Markdown>{m.content}</Markdown>}
        {streaming && (
          <span className="ml-0.5 inline-block w-1.5 h-3 bg-current animate-pulse align-middle" />
        )}
        {isUser && !streaming && onEditStart && (
          <button
            onClick={onEditStart}
            aria-label="Editar e regerar"
            title="Editar e regerar"
            className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {m.images && m.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Imagem anexada ${i + 1}`}
              className="h-16 w-16 rounded-md object-cover border border-border"
            />
          ))}
        </div>
      )}
      {m.files && m.files.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {m.files.map((n, i) => (
            <span key={i} className="rounded bg-card/40 px-1.5 py-0.5">
              {n}
            </span>
          ))}
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

function HistoryList({
  list,
  activeId,
  onOpen,
}: {
  list: Conversation[];
  activeId: string;
  onOpen: (c: Conversation) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  if (list.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Nenhuma conversa encontrada.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {list.map((c) => {
        const renaming = renamingId === c.id;
        return (
          <div
            key={c.id}
            className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
              c.id === activeId
                ? "border-primary/50 bg-accent"
                : "border-border bg-card/40 hover:bg-card/70"
            }`}
          >
            {c.pinned ? (
              <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !renaming && onOpen(c)}>
              {renaming ? (
                <input
                  value={renameText}
                  autoFocus
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameConversation(c.id, renameText);
                      setRenamingId(null);
                    }
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => {
                    renameConversation(c.id, renameText);
                    setRenamingId(null);
                  }}
                  className="w-full bg-transparent text-xs font-medium border-b border-primary/50 focus:outline-none"
                />
              ) : (
                <p className="text-xs font-medium truncate">{c.title}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                {c.messages.length} msg ·{" "}
                {new Date(c.updatedAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => togglePinned(c.id)}
                title={c.pinned ? "Desafixar" : "Fixar"}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => {
                  setRenamingId(c.id);
                  setRenameText(c.title);
                }}
                title="Renomear"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deleteConversation(c.id)}
                title="Excluir"
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TerminalView({
  project,
  onOpenSettings,
}: {
  project: ImportedProject | null;
  onOpenSettings?: () => void;
}) {
  const [tool, setTool] = useState<"aider" | "gemini" | "codex" | "opencode">("aider");
  const [customArgs, setCustomArgs] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cwd, setCwd] = useState(() => {
    if (project) {
      return localStorage.getItem(`omniforge.project.${project.id}.path`) || "";
    }
    return localStorage.getItem("omniforge.cli.cwd") || "";
  });

  // Auto-focus input when terminal mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll para o final do console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleOutput]);

  // Sincroniza o CWD quando o projeto muda
  useEffect(() => {
    if (project) {
      setCwd(localStorage.getItem(`omniforge.project.${project.id}.path`) || "");
    } else {
      setCwd(localStorage.getItem("omniforge.cli.cwd") || "");
    }
  }, [project]);

  const handleCwdChange = (val: string) => {
    setCwd(val);
    if (project) {
      localStorage.setItem(`omniforge.project.${project.id}.path`, val.trim());
    } else {
      localStorage.setItem("omniforge.cli.cwd", val.trim());
    }
  };

  const toolConfig = useMemo(() => {
    return {
      aider: {
        name: "Aider AI",
        defaultCmd: "aider",
        keyName: "OPENAI_API_KEY",
        quickActions: [
          {
            label: "Refatorar Código",
            cmd: '--message "Refatorar o código deste diretório aplicando boas práticas e SOLID"',
          },
          {
            label: "Gerar Testes",
            cmd: '--message "Escrever testes de unidade completos para os componentes do projeto"',
          },
          {
            label: "Revisar Bugs",
            cmd: '--message "Analisar o projeto, encontrar possíveis bugs ou erros de lógica e corrigi-los"',
          },
        ],
      },
      gemini: {
        name: "Gemini CLI",
        defaultCmd: "gemini-cli",
        keyName: "GEMINI_API_KEY",
        quickActions: [
          {
            label: "Explicar Projeto",
            cmd: 'ask "Explique a arquitetura geral deste projeto de forma técnica"',
          },
          {
            label: "Auditar Segurança",
            cmd: 'ask "Faça uma auditoria de segurança buscando falhas comuns OWASP"',
          },
        ],
      },
      codex: {
        name: "Codex CLI",
        defaultCmd: "codex-cli",
        keyName: "OPENAI_API_KEY",
        quickActions: [
          {
            label: "Refatorar funções",
            cmd: 'refactor "Simplificar funções complexas no diretório"',
          },
        ],
      },
      opencode: {
        name: "Open Code",
        defaultCmd: "opencode",
        keyName: "API_KEY",
        quickActions: [{ label: "Análise Estática", cmd: "analyze" }],
      },
    };
  }, []);

  const currentTool = toolConfig[tool];

  async function handleExecute(fullCommandString?: string) {
    if (isRunning) return;

    const baseCmd = localStorage.getItem(`omniforge.cli.${tool}.command`) || currentTool.defaultCmd;
    const apiKey = localStorage.getItem(`omniforge.cli.${tool}.key`) || "";

    // Comando final a ser executado
    let finalCmd = "";
    if (fullCommandString) {
      finalCmd = `${baseCmd} ${fullCommandString}`;
    } else {
      if (!customArgs.trim()) {
        toast.error("Por favor, digite os parâmetros do comando ou escolha uma ação rápida.");
        return;
      }
      finalCmd = `${baseCmd} ${customArgs.trim()}`;
    }

    setIsRunning(true);
    setConsoleOutput([
      `[SISTEMA] Iniciando comando: ${finalCmd}`,
      `[SISTEMA] Aguardando resposta do backend...`,
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/cli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          command: finalCmd,
          env: apiKey ? { [currentTool.keyName]: apiKey } : undefined,
          projectPath: cwd ? cwd.trim() : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro na requisição");
      }

      if (!response.body) {
        throw new Error("Resposta sem stream de dados");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // O último elemento pode ser incompleto, mantém no buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "stdout") {
              setConsoleOutput((prev) => [...prev, data.text]);
            } else if (data.type === "stderr") {
              setConsoleOutput((prev) => [...prev, `[ERRO] ${data.text}`]);
            } else if (data.type === "exit") {
              setConsoleOutput((prev) => [
                ...prev,
                `[SISTEMA] Processo encerrado com código de saída ${data.code}`,
              ]);
              setIsRunning(false);
            } else if (data.type === "error") {
              setConsoleOutput((prev) => [...prev, `[ERRO DO SISTEMA] ${data.message}`]);
              setIsRunning(false);
            }
          } catch {
            // Se falhar o parse JSON, imprime o chunk bruto
            setConsoleOutput((prev) => [...prev, line]);
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setConsoleOutput((prev) => [...prev, `[SISTEMA] Execução cancelada pelo usuário.`]);
      } else {
        setConsoleOutput((prev) => [...prev, `[ERRO] Falha na execução: ${e.message}`]);
      }
      setIsRunning(false);
    } finally {
      abortControllerRef.current = null;
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
    }
  }

  function handleClear() {
    setConsoleOutput([]);
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 font-mono text-xs text-zinc-200">
      {/* Barra de Controles */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-900/60 p-3 sticky top-0 z-10">
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Ferramenta:</span>
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value as any)}
            disabled={isRunning}
            className="bg-zinc-800 border border-white/15 rounded-md px-2.5 py-1 text-zinc-100 focus:outline-none focus:border-primary/50"
          >
            <option value="aider">Aider AI</option>
            <option value="gemini">Gemini CLI</option>
            <option value="codex">Codex CLI</option>
            <option value="opencode">Open Code</option>
          </select>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Configurar CLIs"
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 hover:border-white/15 transition cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-1.5 mr-auto">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Ações Rápidas:</span>
          <div className="flex flex-wrap gap-1">
            {currentTool.quickActions.map((act) => (
              <button
                key={act.label}
                disabled={isRunning}
                onClick={() => handleExecute(act.cmd)}
                className="bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded px-2.5 py-1 transition-all disabled:opacity-50"
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limpar Console */}
        <button
          onClick={handleClear}
          disabled={consoleOutput.length === 0}
          className="text-zinc-500 hover:text-zinc-300 text-[10px] uppercase font-bold px-2 py-1 transition-colors disabled:opacity-30"
        >
          Limpar Console
        </button>
      </div>

      {/* Barra de Diretório de Trabalho (CWD) */}
      <div className="border-b border-white/10 bg-zinc-900/20 p-2.5 flex items-center gap-2 px-3">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider select-none shrink-0">
          Diretório (CWD):
        </span>
        <input
          value={cwd}
          onChange={(e) => handleCwdChange(e.target.value)}
          placeholder="Caminho absoluto da pasta do projeto (ex: D:\Projetos\meu-app)"
          className="flex-1 bg-zinc-900/50 border border-white/10 rounded-md px-2.5 py-1 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/40 text-[11px]"
        />
        {cwd && (
          <span className="text-[9px] text-emerald-500 font-semibold shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            CWD ativo
          </span>
        )}
      </div>

      {/* Input de Prompt CLI */}
      <div className="border-b border-white/10 bg-zinc-900/40 p-3 flex gap-2">
        <div className="flex-1 flex items-center bg-zinc-900 border border-white/15 rounded-lg px-3 focus-within:border-primary/50 transition">
          <span className="text-zinc-500 font-bold select-none pr-2">$ {tool}</span>
          <input
            ref={inputRef}
            value={customArgs}
            onChange={(e) => setCustomArgs(e.target.value)}
            disabled={isRunning}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleExecute();
            }}
            placeholder="Digite os argumentos adicionais (ex: --message 'criar login')"
            className="flex-1 bg-transparent py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        {isRunning ? (
          <button
            onClick={handleStop}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg px-4 py-1.5 flex items-center gap-1.5 transition duration-150 glow-red"
          >
            <Square className="h-3.5 w-3.5 fill-white" />
            Parar
          </button>
        ) : (
          <button
            onClick={() => handleExecute()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-1.5 flex items-center gap-1.5 transition duration-150 glow"
          >
            <Play className="h-3.5 w-3.5 fill-primary-foreground" />
            Rodar
          </button>
        )}
      </div>

      {/* Log Screen do Terminal */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-auto p-4 space-y-1 bg-black/40 min-h-[300px] cursor-text"
      >
        {consoleOutput.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-16">
            <Terminal className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-xs">Terminal pronto.</p>
            <p className="text-[10px] opacity-60 mt-1">
              Escolha uma ação rápida acima ou digite argumentos adicionais para começar.
            </p>
          </div>
        ) : (
          consoleOutput.map((line, i) => (
            <div
              key={i}
              className="whitespace-pre-wrap break-all leading-relaxed font-mono text-[11px] text-zinc-300"
            >
              {line}
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}

// name="description" Head>
