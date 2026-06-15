// Captura erros de runtime no cliente: window.error, unhandledrejection,
// console.error e respostas fetch 4xx/5xx. Mantém um buffer com de-duplicação
// e notifica subscribers (usado pelo AutoDebugPanel).

export interface CapturedIssue {
  id: string;
  kind: "error" | "unhandledrejection" | "console" | "http";
  message: string;
  stack?: string;
  url?: string;
  status?: number;
  source?: string; // arquivo:linha quando disponível
  count: number;
  firstAt: number;
  lastAt: number;
  seen: boolean;
}

type Listener = (issues: CapturedIssue[]) => void;

const issues: CapturedIssue[] = [];
const listeners = new Set<Listener>();
let started = false;

function fingerprint(parts: Array<string | number | undefined>): string {
  return parts.filter(Boolean).join("|").slice(0, 400);
}

function emit() {
  const snap = [...issues];
  listeners.forEach((l) => {
    try { l(snap); } catch { /* noop */ }
  });
}

function push(partial: Omit<CapturedIssue, "id" | "count" | "firstAt" | "lastAt" | "seen">) {
  const id = fingerprint([partial.kind, partial.message, partial.source, partial.status]);
  const now = Date.now();
  const existing = issues.find((i) => i.id === id);
  if (existing) {
    existing.count += 1;
    existing.lastAt = now;
    existing.seen = false;
  } else {
    issues.unshift({ ...partial, id, count: 1, firstAt: now, lastAt: now, seen: false });
    // limita buffer
    if (issues.length > 50) issues.length = 50;
  }
  emit();
}

function parseSource(stack?: string): string | undefined {
  if (!stack) return undefined;
  const m = stack.match(/\(?(https?:\/\/[^\s)]+|\/[^\s)]+):(\d+):(\d+)\)?/);
  return m ? `${m[1]}:${m[2]}:${m[3]}` : undefined;
}

export function startAutoDebug() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("error", (ev) => {
    const err = ev.error instanceof Error ? ev.error : undefined;
    push({
      kind: "error",
      message: err?.message ?? String(ev.message ?? "Erro desconhecido"),
      stack: err?.stack,
      source: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : parseSource(err?.stack),
      url: location.href,
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const err = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
    push({
      kind: "unhandledrejection",
      message: err.message,
      stack: err.stack,
      source: parseSource(err.stack),
      url: location.href,
    });
  });

  // intercept console.error
  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origErr(...args);
    const first = args[0];
    const msg = first instanceof Error ? first.message : args.map((a) => (typeof a === "string" ? a : safe(a))).join(" ");
    const stack = first instanceof Error ? first.stack : undefined;
    // ignora ruído conhecido
    if (/Download the React DevTools|HMR|\[vite\]/i.test(msg)) return;
    push({ kind: "console", message: msg.slice(0, 500), stack, source: parseSource(stack), url: location.href });
  };

  // intercept fetch
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await origFetch(...args);
    if (!res.ok && res.status >= 400) {
      const reqUrl = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0]);
      // ignora a própria chamada de análise para não criar loops
      if (!reqUrl.includes("/api/llm-chat")) {
        push({
          kind: "http",
          message: `HTTP ${res.status} em ${reqUrl}`,
          status: res.status,
          url: reqUrl,
        });
      }
    }
    return res;
  };
}

function safe(v: unknown): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  l([...issues]);
  return () => { listeners.delete(l); };
}

export function clearIssues() {
  issues.length = 0;
  emit();
}

export function removeIssue(id: string) {
  const i = issues.findIndex((x) => x.id === id);
  if (i >= 0) { issues.splice(i, 1); emit(); }
}

export function markAllSeen() {
  issues.forEach((i) => { i.seen = true; });
  emit();
}

export function formatIssueForPrompt(i: CapturedIssue): string {
  const lines = [
    `Tipo: ${i.kind}`,
    `Mensagem: ${i.message}`,
    i.status ? `Status HTTP: ${i.status}` : "",
    i.source ? `Origem: ${i.source}` : "",
    i.url ? `Página: ${i.url}` : "",
    i.stack ? `Stack:\n${i.stack.slice(0, 2000)}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
