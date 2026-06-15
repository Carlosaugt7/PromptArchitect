// Histórico de conversas persistido em localStorage.

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** thumbnails (data URLs) de anexos de imagem do usuário */
  images?: string[];
  /** nomes de outros anexos */
  files?: string[];
  tokens?: number;
  costUsd?: number;
  model?: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  pinned?: boolean;
}

const KEY = "omniforge.chat.history";
const EVENT = "omniforge:chat-changed";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return sortConversations(list);
  } catch { return []; }
}

function persist(list: Conversation[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeConversations(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });
}

export function saveConversation(c: Conversation) {
  const others = loadConversations().filter(x => x.id !== c.id);
  const next = sortConversations([{ ...c, updatedAt: Date.now() }, ...others]).slice(0, 100);
  persist(next);
}

export function deleteConversation(id: string) {
  persist(loadConversations().filter(c => c.id !== id));
}

export function renameConversation(id: string, title: string) {
  const list = loadConversations().map(c => c.id === id ? { ...c, title: title.trim() || c.title } : c);
  persist(list);
}

export function togglePinned(id: string) {
  const list = loadConversations().map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
  persist(sortConversations(list));
}

export function importConversation(c: Conversation) {
  const list = [c, ...loadConversations().filter(x => x.id !== c.id)];
  persist(sortConversations(list).slice(0, 100));
}

export function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "Nova conversa", messages: [], updatedAt: Date.now() };
}

export function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 60 ? t.slice(0, 57) + "…" : t || "Nova conversa";
}

export function searchConversations(list: Conversation[], q: string): Conversation[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(c =>
    c.title.toLowerCase().includes(needle) ||
    c.messages.some(m => m.content.toLowerCase().includes(needle))
  );
}

/** Tenta importar de string .json ou .md. Lança em caso de formato inválido. */
export function parseImportedConversation(raw: string, filename: string): Conversation {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    const data = JSON.parse(trimmed) as Partial<Conversation>;
    if (!Array.isArray(data.messages)) throw new Error("JSON inválido: faltando 'messages'");
    return {
      id: data.id || crypto.randomUUID(),
      title: data.title || filename.replace(/\.\w+$/, ""),
      messages: data.messages as ChatMessage[],
      pinned: data.pinned,
      updatedAt: Date.now(),
    };
  }
  // Markdown: cabeçalhos "## 👤 Você" / "## 🤖 Assistente" (formato do export)
  const lines = trimmed.split(/\r?\n/);
  let title = filename.replace(/\.\w+$/, "");
  if (lines[0]?.startsWith("# ")) { title = lines[0].slice(2).trim(); lines.shift(); }
  const messages: ChatMessage[] = [];
  let role: "user" | "assistant" | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (role && buf.length) {
      const content = buf.join("\n").trim();
      if (content) messages.push({ id: crypto.randomUUID(), role, content, createdAt: Date.now() });
    }
    buf = [];
  };
  for (const ln of lines) {
    const h = ln.match(/^##\s+.*?(você|user|usuário|assistente|assistant)/i);
    if (h) {
      flush();
      role = /assist/i.test(h[1]) ? "assistant" : "user";
    } else if (role) {
      buf.push(ln);
    }
  }
  flush();
  if (messages.length === 0) throw new Error("Markdown sem mensagens reconhecidas");
  return { id: crypto.randomUUID(), title, messages, updatedAt: Date.now() };
}
