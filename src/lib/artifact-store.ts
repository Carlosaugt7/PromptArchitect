// Store simples para o artefato atual exibido no WorkspacePanel.
// O ChatPanel publica quando a resposta termina; o WorkspacePanel ouve.

export interface Artifact {
  id?: string;
  title?: string;
  /** linguagem do bloco principal (html, tsx, jsx, js, py, ...) */
  lang: string;
  /** conteúdo do bloco principal */
  code: string;
  /** HTML pronto para iframe (auto-construído quando lang=html ou quando há blocos css/js) */
  html: string;
  /** todos os blocos encontrados, em ordem */
  blocks: { lang: string; code: string }[];
  /** indica se o artefato possui blocos react/tsx/jsx para sandpack */
  hasReact?: boolean;
  updatedAt: number;
}

const KEY = "omniforge.artifact.current";
type Listener = (a: Artifact | null) => void;
const listeners = new Set<Listener>();

export function loadArtifact(): Artifact | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}
export function saveArtifact(a: Artifact | null) {
  if (typeof window === "undefined") return;
  if (a) localStorage.setItem(KEY, JSON.stringify(a));
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l(a));
}
export function subscribeArtifact(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
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
    blocks.find((b) => /^html?$/.test(b.lang) && /<html[\s>]/i.test(b.code)) ??
    blocks.find((b) => /^html?$/.test(b.lang)) ??
    blocks[0];

  const css = blocks.find((b) => b.lang === "css")?.code ?? "";
  const js = blocks.find((b) => /^(js|javascript)$/.test(b.lang))?.code ?? "";

  const isRenderableHTML =
    /^html?$/.test(htmlBlock.lang) ||
    (htmlBlock.lang === "" && /<\w+[\s>]/.test(htmlBlock.code));

  let html: string;
  if (/<html[\s>]/i.test(htmlBlock.code)) {
    html = htmlBlock.code;
  } else if (isRenderableHTML) {
    html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;padding:16px;background:#0a0a0f;color:#eee}${css}</style></head><body>${htmlBlock.code}<script>${js}</script></body></html>`;
  } else {
    // Não é renderizável → apenas mostra como código
    html = "";
  }

  const hasReact = blocks.some((b) => /^(tsx|jsx|ts|react)$/i.test(b.lang));

  return {
    lang: htmlBlock.lang || "text",
    code: htmlBlock.code,
    html,
    blocks,
    hasReact,
    updatedAt: Date.now(),
  };
}

/** Converte um projeto importado em artefato visualizável. */
export function projectToArtifact(p: {
  name: string;
  files: { path: string; size: number; content?: string }[];
}): Artifact {
  // 1) tenta index.html
  const idx =
    p.files.find((f) => /(^|\/)index\.html?$/i.test(f.path) && f.content) ??
    p.files.find((f) => /\.html?$/i.test(f.path) && f.content);
  if (idx?.content) {
    return {
      lang: "html",
      code: idx.content,
      html: idx.content,
      blocks: [{ lang: "html", code: idx.content }],
      updatedAt: Date.now(),
    };
  }
  // 2) fallback: árvore de arquivos
  const tree = p.files
    .slice(0, 500)
    .map(
      (f) =>
        `<li><code>${f.path}</code> <span style="opacity:.5">(${(f.size / 1024).toFixed(1)} KB)</span></li>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${p.name}</title><style>body{margin:0;font-family:system-ui;background:#0a0a0f;color:#eee;padding:24px}h1{font-size:18px}code{color:#9ad}ul{line-height:1.6;padding-left:18px}.note{opacity:.6;font-size:13px;margin:8px 0 18px}</style></head><body><h1>📦 ${p.name}</h1><p class="note">Projeto importado — ${p.files.length} arquivo(s). Sem index.html renderizável; exibindo árvore.</p><ul>${tree}</ul></body></html>`;
  return {
    lang: "tree",
    code: p.files.map((f) => f.path).join("\n"),
    html,
    blocks: [],
    updatedAt: Date.now(),
  };
}
