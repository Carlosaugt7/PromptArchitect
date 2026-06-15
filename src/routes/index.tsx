import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, Plus, Globe, Send, History, MessageSquare, Check, Loader2,
  Monitor, Smartphone, Code2, Undo2, Redo2, Share2, RefreshCw, ExternalLink,
  LayoutDashboard, BarChart3, Users, Package, ArrowLeftRight, FileText, Bell,
  Settings, TrendingUp, ShoppingCart, UserPlus, DollarSign, ChevronDown, Crown,
  Database, ScrollText, Eye, X,
} from "lucide-react";

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
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      <ChatPanel />
      <WorkspacePanel />
    </div>
  );
}

/* ---------------- CHAT PANEL ---------------- */
function ChatPanel() {
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg font-semibold tracking-tight">OmniForge</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-3">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-4 w-4" />}>
          Chat
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<History className="h-4 w-4" />}>
          Histórico
        </TabButton>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* AI greeting */}
        <Message role="ai">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">OmniForge AI</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-primary/15 text-primary border border-primary/20">Beta</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            Olá! Sou seu copiloto de desenvolvimento. O que você quer forjar hoje?
          </p>
        </Message>

        {/* User msg */}
        <Message role="user">
          <p className="text-sm leading-relaxed">
            Quero uma dashboard de analytics com sidebar, cards de métricas, gráficos e tabela de últimos eventos.
          </p>
        </Message>

        {/* AI response with progress */}
        <Message role="ai">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">OmniForge AI</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90 mb-3">
            Perfeito! Estou criando uma dashboard moderna e responsiva com métricas, gráficos e tabela de eventos.
          </p>

          <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Construindo seu projeto…
            </div>
            <Step done label="Estruturando layout" />
            <Step done label="Criando sidebar de navegação" />
            <Step done label="Adicionando cards de métricas" />
            <Step loading label="Gerando gráficos interativos" />
            <Step label="Configurando tabela de eventos" />
            <Step label="Finalizando estilos" />
          </div>

          <button className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left text-xs hover:bg-card transition-colors">
            <div>
              <div className="font-medium text-foreground">Editando 8 arquivos</div>
              <div className="text-muted-foreground mt-0.5 truncate">
                Dashboard.tsx, Sidebar.tsx, MetricCard.tsx, Chart.tsx…
              </div>
            </div>
            <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
          </button>
        </Message>
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="surface rounded-2xl border border-border p-2.5 focus-within:border-primary/50 focus-within:glow transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva uma alteração ou nova feature…"
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <IconBtn><Plus className="h-4 w-4" /></IconBtn>
              <IconBtn><Globe className="h-4 w-4" /></IconBtn>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground glow hover:opacity-95 transition">
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

function Message({ role, children }: { role: "ai" | "user"; children: React.ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/30 px-4 py-2.5">
          {children}
        </div>
      </div>
    );
  }
  return <div className="max-w-[95%]">{children}</div>;
}

function Step({ done, loading, label }: { done?: boolean; loading?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`grid h-4 w-4 place-items-center rounded-full ${
        done ? "bg-success/20 text-success" : loading ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      }`}>
        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <div className="h-1 w-1 rounded-full bg-current" />}
      </span>
      <span className={done ? "text-foreground/80 line-through decoration-foreground/30" : loading ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

/* ---------------- WORKSPACE PANEL ---------------- */
function WorkspacePanel() {
  const [tab, setTab] = useState<"preview" | "code" | "database" | "logs">("preview");

  return (
    <section className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-colors text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">SaaS Dashboard Analytics</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="flex items-center gap-1.5 rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
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
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-[var(--brand-glow)] text-xs font-semibold text-primary-foreground">
            GS
          </div>
        </div>
      </div>

      {/* Workspace tabs */}
      <div className="flex items-center justify-between border-b border-border bg-card/30 px-3">
        <div className="flex items-center">
          <WorkTab active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye className="h-3.5 w-3.5" />}>Preview</WorkTab>
          <WorkTab active={tab === "code"} onClick={() => setTab("code")} icon={<Code2 className="h-3.5 w-3.5" />}>Código</WorkTab>
          <WorkTab active={tab === "database"} onClick={() => setTab("database")} icon={<Database className="h-3.5 w-3.5" />}>Database</WorkTab>
          <WorkTab active={tab === "logs"} onClick={() => setTab("logs")} icon={<ScrollText className="h-3.5 w-3.5" />}>Logs</WorkTab>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-2"><X className="h-4 w-4" /></button>
      </div>

      {/* Browser bar */}
      <div className="flex items-center gap-3 border-b border-border bg-background/40 px-4 py-2">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <span className="text-foreground/80">analytics-pro.omniforge.app</span>
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-success" />
        </div>
        <IconBtn><RefreshCw className="h-3.5 w-3.5" /></IconBtn>
        <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:bg-accent transition-colors">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir
        </button>
      </div>

      {/* Artifact preview */}
      <div className="flex-1 overflow-auto bg-background/20">
        <ArtifactDashboard />
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

/* ---------------- ARTIFACT (rendered dashboard preview) ---------------- */
function ArtifactDashboard() {
  return (
    <div className="flex min-h-full bg-[oklch(0.14_0.02_270)] text-foreground">
      {/* App sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/60 bg-[oklch(0.17_0.02_270)] p-4 flex flex-col">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)]">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sm">Analytics Pro</span>
        </div>
        <nav className="mt-4 space-y-0.5 text-sm flex-1">
          <NavItem active icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavItem>
          <NavItem icon={<TrendingUp className="h-4 w-4" />}>Overview</NavItem>
          <NavItem icon={<BarChart3 className="h-4 w-4" />}>Analytics</NavItem>
          <NavItem icon={<Users className="h-4 w-4" />}>Customers</NavItem>
          <NavItem icon={<Package className="h-4 w-4" />}>Products</NavItem>
          <NavItem icon={<ArrowLeftRight className="h-4 w-4" />}>Transactions</NavItem>
          <NavItem icon={<FileText className="h-4 w-4" />}>Reports</NavItem>
          <NavItem icon={<Bell className="h-4 w-4" />}>Alerts</NavItem>
          <NavItem icon={<Settings className="h-4 w-4" />}>Settings</NavItem>
        </nav>

        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/15 to-transparent p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Crown className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-semibold">Upgrade to Pro</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">Desbloqueie recursos avançados</p>
          <button className="w-full rounded-md bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] py-1.5 text-[11px] font-medium text-primary-foreground">
            Upgrade agora
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary to-[var(--brand-glow)] text-[10px] font-semibold text-primary-foreground">GS</div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">Guilherme Santos</div>
            <div className="text-[10px] text-muted-foreground truncate">guilherme@email.com</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral do seu negócio em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs">
              7 dias <ChevronDown className="h-3 w-3" />
            </button>
            <button className="rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Exportar
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Receita Total" value="R$ 128.430" delta="+12,5%" up icon={<DollarSign className="h-4 w-4" />} color="295" />
          <MetricCard label="Novos Clientes" value="1.429" delta="+8,2%" up icon={<UserPlus className="h-4 w-4" />} color="220" />
          <MetricCard label="Pedidos" value="3.256" delta="+15,7%" up icon={<ShoppingCart className="h-4 w-4" />} color="75" />
          <MetricCard label="Taxa de Conversão" value="3,42%" delta="-2,1%" icon={<TrendingUp className="h-4 w-4" />} color="155" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Receita ao longo do tempo</h3>
              <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px]">
                Diário <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <LineChart />
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Visitantes</h3>
              <button className="text-[11px] text-primary">Ver detalhes ›</button>
            </div>
            <DonutChart />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Eventos recentes</h3>
            <button className="text-[11px] text-primary">Ver todos ›</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Evento</th>
                <th className="pb-2 font-medium">Usuário</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium">Data/Hora</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {events.map((e, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="py-3">{e.event}</td>
                  <td className="py-3 text-foreground/80">{e.user}</td>
                  <td className="py-3"><Tag variant={e.tagVariant}>{e.type}</Tag></td>
                  <td className="py-3 text-foreground/80">{e.value}</td>
                  <td className="py-3 text-muted-foreground text-xs">{e.date}</td>
                  <td className="py-3"><StatusTag ok={e.status === "Concluído"}>{e.status}</StatusTag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, icon, children }: { active?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors cursor-pointer ${
      active
        ? "bg-gradient-to-r from-primary/20 to-transparent text-foreground border border-primary/20"
        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
    }`}>
      {icon}<span>{children}</span>
    </div>
  );
}

function MetricCard({ label, value, delta, up, icon, color }: { label: string; value: string; delta: string; up?: boolean; icon: React.ReactNode; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `oklch(0.7 0.2 ${color} / 0.2)`, color: `oklch(0.75 0.2 ${color})` }}>
          {icon}
        </div>
      </div>
      <div className="font-display text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[11px]">
        <span className={up ? "text-success" : "text-destructive"}>{delta}</span>
        <span className="text-muted-foreground"> vs período anterior</span>
      </div>
      <Sparkline color={color} />
    </div>
  );
}

function Sparkline({ color }: { color: string }) {
  const pts = "0,30 15,22 30,28 45,18 60,24 75,12 90,20 105,8 120,16 135,4";
  return (
    <svg viewBox="0 0 135 35" className="mt-3 w-full h-10">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={`oklch(0.75 0.2 ${color})`} stopOpacity="0.5" />
          <stop offset="100%" stopColor={`oklch(0.75 0.2 ${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} 135,35 0,35`} fill={`url(#g-${color})`} />
      <polyline points={pts} fill="none" stroke={`oklch(0.75 0.2 ${color})`} strokeWidth="1.5" />
    </svg>
  );
}

function LineChart() {
  const pts = [
    [0, 140], [80, 100], [160, 130], [240, 60], [320, 95], [400, 40], [480, 70],
  ];
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  return (
    <svg viewBox="0 0 500 200" className="w-full h-52">
      <defs>
        <linearGradient id="line-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.7 0.2 295)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.7 0.2 295)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160].map(y => (
        <line key={y} x1="20" x2="490" y1={y} y2={y} stroke="oklch(0.3 0.025 270)" strokeDasharray="3 4" />
      ))}
      {["R$ 40k","R$ 30k","R$ 20k","R$ 10k","R$ 0"].map((l, i) => (
        <text key={l} x="0" y={45 + i * 40} fontSize="9" fill="oklch(0.6 0.02 270)">{l}</text>
      ))}
      <path d={`${d} L480,200 L0,200 Z`} fill="url(#line-g)" />
      <path d={d} fill="none" stroke="oklch(0.72 0.2 295)" strokeWidth="2" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="oklch(0.78 0.18 320)" stroke="oklch(0.16 0.02 270)" strokeWidth="2" />
      ))}
      {["12 Mai","13 Mai","14 Mai","15 Mai","16 Mai","17 Mai","18 Mai"].map((l, i) => (
        <text key={l} x={i * 80} y="195" fontSize="9" fill="oklch(0.6 0.02 270)">{l}</text>
      ))}
    </svg>
  );
}

function DonutChart() {
  const segments = [
    { p: 48.5, color: "oklch(0.72 0.2 295)" },
    { p: 24.7, color: "oklch(0.7 0.2 240)" },
    { p: 16.3, color: "oklch(0.72 0.17 155)" },
    { p: 10.5, color: "oklch(0.78 0.16 75)" },
  ];
  const labels = [
    { name: "Orgânico", v: "48,5%", color: "oklch(0.72 0.2 295)" },
    { name: "Direto", v: "24,7%", color: "oklch(0.7 0.2 240)" },
    { name: "Social", v: "16,3%", color: "oklch(0.72 0.17 155)" },
    { name: "Referência", v: "10,5%", color: "oklch(0.78 0.16 75)" },
  ];
  const C = 2 * Math.PI * 40;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
        {segments.map((s, i) => {
          const len = (s.p / 100) * C;
          const el = (
            <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />
          );
          acc += len;
          return el;
        })}
        <text x="50" y="48" textAnchor="middle" fontSize="10" fill="oklch(0.97 0.005 270)" transform="rotate(90 50 50)" fontWeight="600">24.630</text>
        <text x="50" y="58" textAnchor="middle" fontSize="6" fill="oklch(0.6 0.02 270)" transform="rotate(90 50 50)">Total</text>
      </svg>
      <div className="flex-1 space-y-2 text-xs">
        {labels.map(l => (
          <div key={l.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.name}
            </div>
            <span className="font-medium text-foreground/80">{l.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ variant, children }: { variant: "blue" | "green" | "purple"; children: React.ReactNode }) {
  const styles = {
    blue: "bg-[oklch(0.7_0.2_240/0.15)] text-[oklch(0.75_0.18_240)] border-[oklch(0.7_0.2_240/0.3)]",
    green: "bg-success/15 text-success border-success/30",
    purple: "bg-primary/15 text-primary border-primary/30",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${styles[variant]}`}>{children}</span>;
}

function StatusTag({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
      ok ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"
    }`}>{children}</span>
  );
}

const events: { event: string; user: string; type: string; tagVariant: "blue" | "green" | "purple"; value: string; date: string; status: string }[] = [
  { event: "Novo pedido realizado", user: "João Silva",      type: "Pedido",    tagVariant: "blue",   value: "R$ 1.250,00", date: "18/05/2024 14:32", status: "Concluído" },
  { event: "Novo cliente cadastrado", user: "Maria Oliveira", type: "Cadastro",  tagVariant: "purple", value: "—",            date: "18/05/2024 14:21", status: "Concluído" },
  { event: "Pagamento aprovado",    user: "Pedro Santos",     type: "Pagamento", tagVariant: "green",  value: "R$ 320,00",    date: "18/05/2024 14:15", status: "Concluído" },
  { event: "Pedido cancelado",      user: "Ana Costa",        type: "Pedido",    tagVariant: "blue",   value: "R$ 560,00",    date: "18/05/2024 13:51", status: "Cancelado" },
  { event: "Novo pedido realizado", user: "Lucas Pereira",    type: "Pedido",    tagVariant: "blue",   value: "R$ 910,00",    date: "18/05/2024 13:47", status: "Concluído" },
];
