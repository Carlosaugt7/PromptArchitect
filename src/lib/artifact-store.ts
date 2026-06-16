// Store simples para o artefato atual exibido no WorkspacePanel.
// O ChatPanel publica quando a resposta termina; o WorkspacePanel ouve.

export interface Artifact {
  /** linguagem do bloco principal (html, tsx, jsx, js, py, ...) */
  lang: string;
  /** conteúdo do bloco principal */
  code: string;
  /** HTML pronto para iframe (auto-construído quando lang=html ou quando há blocos css/js) */
  html: string;
  /** todos os blocos encontrados, em ordem */
  blocks: { lang: string; code: string }[];
  updatedAt: number;
}

const KEY = "omniforge.artifact.current";
type Listener = (a: Artifact | null) => void;
const listeners = new Set<Listener>();

export function loadArtifact(): Artifact | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function saveArtifact(a: Artifact | null) {
  if (typeof window === "undefined") return;
  if (a) localStorage.setItem(KEY, JSON.stringify(a));
  else localStorage.removeItem(KEY);
  listeners.forEach(l => l(a));
}
export function subscribeArtifact(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Extrai blocos ```lang ... ``` de uma resposta markdown. */
export function extractArtifact(markdown: string): Artifact | null {
  const re = /```([a-zA-Z0-9+\-_.]*)\n([\s\S]*?)```/g;
  const blocks: { lang: string; code: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    blocks.push({ lang: (m[1] || "").toLowerCase().trim(), code: m[2] });
  }
  if (!blocks.length) return null;

  // Preferência: HTML completo > primeiro bloco
  const htmlBlock =
    blocks.find(b => /^html?$/.test(b.lang) && /<html[\s>]/i.test(b.code)) ??
    blocks.find(b => /^html?$/.test(b.lang)) ??
    blocks[0];

  const css = blocks.find(b => b.lang === "css")?.code ?? "";
  const js  = blocks.find(b => /^(js|javascript)$/.test(b.lang))?.code ?? "";

  let html: string;
  if (/<html[\s>]/i.test(htmlBlock.code)) {
    html = htmlBlock.code;
  } else if (/^html?$/.test(htmlBlock.lang) || /<\w+[\s>]/.test(htmlBlock.code)) {
    html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;padding:16px;background:#0a0a0f;color:#eee}${css}</style></head><body>${htmlBlock.code}<script>${js}<\/script></body></html>`;
  } else {
    // Não é renderizável → apenas mostra como código
    html = "";
  }

  return {
    lang: htmlBlock.lang || "text",
    code: htmlBlock.code,
    html,
    blocks,
    updatedAt: Date.now(),
  };
}
