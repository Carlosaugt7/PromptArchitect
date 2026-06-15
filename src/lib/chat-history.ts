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
}

const KEY = "omniforge.chat.history";
const EVENT = "omniforge:chat-changed";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
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

export function saveConversation(c: Conversation) {
  const list = loadConversations().filter(x => x.id !== c.id);
  list.unshift({ ...c, updatedAt: Date.now() });
  persist(list.slice(0, 100));
}

export function deleteConversation(id: string) {
  persist(loadConversations().filter(c => c.id !== id));
}

export function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "Nova conversa", messages: [], updatedAt: Date.now() };
}

export function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 60 ? t.slice(0, 57) + "…" : t || "Nova conversa";
}
