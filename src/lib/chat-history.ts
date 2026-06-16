// Histórico de conversas persistido em localStorage com sincronização do Firestore no backend.
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from "firebase/firestore";
import { db } from "./firebase-config";

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

const EVENT = "omniforge:chat-changed";
let isFirestoreActive = false;
let syncPromise: Promise<void> | null = null;

/** Obtém o userId atual do localStorage ou gera um novo */
export function getUserId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("omniforge.userId");
  if (!id) {
    id = "user-" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("omniforge.userId", id);
  }
  return id;
}

/** Define um novo userId e notifica a aplicação para atualizar os dados */
export function setUserId(id: string) {
  if (typeof window === "undefined" || !id.trim()) return;
  localStorage.setItem("omniforge.userId", id.trim());
  window.dispatchEvent(new Event(EVENT));

  // Re-inicia sincronização para o novo usuário
  initSync().catch(() => {});
}

/** Chave dinâmica com base no userId atual */
function getStorageKey(): string {
  return `omniforge.chat.history.${getUserId()}`;
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return sortConversations(list);
  } catch {
    return [];
  }
}

function persist(list: Conversation[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(list));
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
  const updatedConvo = { ...c, updatedAt: Date.now() };
  const others = loadConversations().filter((x) => x.id !== c.id);
  const next = sortConversations([updatedConvo, ...others]).slice(0, 100);
  persist(next);

  if (isFirestoreActive) {
    setDoc(doc(db, "conversations", updatedConvo.id), {
      ...updatedConvo,
      userId: getUserId(),
      updatedAt: Date.now()
    }).catch((e) => console.error("Erro ao salvar no Firestore (background):", e));
  }
}

export function deleteConversation(id: string) {
  persist(loadConversations().filter((c) => c.id !== id));

  if (isFirestoreActive) {
    deleteDoc(doc(db, "conversations", id))
      .catch((e) => console.error("Erro ao excluir no Firestore (background):", e));
  }
}

export function renameConversation(id: string, title: string) {
  const list = loadConversations().map((c) =>
    c.id === id ? { ...c, title: title.trim() || c.title, updatedAt: Date.now() } : c,
  );
  const updated = list.find((c) => c.id === id);
  persist(list);

  if (updated && isFirestoreActive) {
    setDoc(doc(db, "conversations", updated.id), {
      ...updated,
      userId: getUserId(),
      updatedAt: Date.now()
    }).catch(() => {});
  }
}

export function togglePinned(id: string) {
  const list = loadConversations().map((c) =>
    c.id === id ? { ...c, pinned: !c.pinned, updatedAt: Date.now() } : c,
  );
  const updated = list.find((c) => c.id === id);
  persist(sortConversations(list));

  if (updated && isFirestoreActive) {
    setDoc(doc(db, "conversations", updated.id), {
      ...updated,
      userId: getUserId(),
      updatedAt: Date.now()
    }).catch(() => {});
  }
}

export function importConversation(c: Conversation) {
  const list = [c, ...loadConversations().filter((x) => x.id !== c.id)];
  persist(sortConversations(list).slice(0, 100));

  if (isFirestoreActive) {
    setDoc(doc(db, "conversations", c.id), {
      ...c,
      userId: getUserId(),
      updatedAt: Date.now()
    }).catch(() => {});
  }
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
  return list.filter(
    (c) =>
      c.title.toLowerCase().includes(needle) ||
      c.messages.some((m) => m.content.toLowerCase().includes(needle)),
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
  if (lines[0]?.startsWith("# ")) {
    title = lines[0].slice(2).trim();
    lines.shift();
  }
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

/**
 * Inicializa a sincronização com o Firestore.
 * Verifica o status de ativação do Firestore no servidor e executa o sync de duas vias.
 */
export async function initSync(): Promise<void> {
  if (typeof window === "undefined") return;

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      isFirestoreActive = db !== null;

      if (isFirestoreActive) {
        const userId = getUserId();

        // 1. Carrega dados remotos do Firestore
        const q = query(collection(db, "conversations"), where("userId", "==", userId));
        const snap = await getDocs(q);
        const remoteList: Conversation[] = snap.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: d.id,
            title: d.title || "Conversa",
            messages: d.messages || [],
            pinned: d.pinned || false,
            updatedAt: d.updatedAt || Date.now(),
          } as Conversation;
        });

        // 2. Carrega dados locais do localStorage do usuário atual
        const localList = loadConversations();

        // 3. Mescla bidirecional
        const mergedMap = new Map<string, Conversation>();

        // Adiciona todos os remotos inicialmente
        for (const c of remoteList) {
          mergedMap.set(c.id, c);
        }

        // Para cada item local, decide se substitui o remoto ou atualiza o remoto
        for (const c of localList) {
          const remoteItem = mergedMap.get(c.id);
          if (!remoteItem || (c.updatedAt ?? 0) > (remoteItem.updatedAt ?? 0)) {
            mergedMap.set(c.id, c);
            // Sincroniza alteração mais nova local para o servidor
            setDoc(doc(db, "conversations", c.id), {
              ...c,
              userId,
              updatedAt: Date.now()
            }).catch(() => {});
          }
        }

        // Se houver conversas no Firestore que não estão locais, ou se as remotas forem mais novas
        const nextList = sortConversations(Array.from(mergedMap.values()));
        persist(nextList);
      }
    } catch (e) {
      console.warn("Firestore sync init failed, offline mode active:", e);
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}
