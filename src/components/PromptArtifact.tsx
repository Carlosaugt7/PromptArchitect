/**
 * PromptArtifact — painel lateral + card de download estilo Claude.
 *
 * Uso:
 *   <PromptArtifactCard content={text} onOpen={() => setOpen(true)} />
 *   <PromptArtifactPanel content={text} open={open} onClose={() => setOpen(false)} />
 */
import { useState, useCallback } from "react";
import {
  FileText,
  Download,
  X,
  Copy,
  Check,
  ChevronRight,
  FileDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Detecta se o texto parece um prompt estruturado (>120 chars com marcadores típicos). */
export function looksLikePrompt(text: string): boolean {
  if (text.length < 120) return false;
  const markers = [
    /^#{1,3}\s/m, // headings markdown
    /\*\*[^*]+\*\*/, // negrito
    /^[-*]\s/m, // lista
    /você é|you are|agente|instrução|regra|objetivo|contexto|persona|role|task|format/i,
    /```/, // bloco de código
  ];
  return markers.filter((r) => r.test(text)).length >= 2;
}

/** Gera um nome de arquivo limpo a partir do início do conteúdo. */
function makeFilename(text: string): string {
  const first = text
    .trim()
    .replace(/^#+\s*/, "")
    .split("\n")[0]
    .trim();
  const slug =
    first
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "prompt";
  return slug;
}

/** Download de texto como arquivo. */
function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Gera HTML bonito para impressão/PDF. */
function buildPrintHtml(content: string, title: string): string {
  // Conversão básica markdown → HTML para o PDF
  const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = escaped
    // headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // lists
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // line breaks
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; line-height: 1.7;
         color: #111; background: #fff; padding: 48px 56px; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; color: #115e59; margin: 24px 0 10px; border-bottom: 2px solid #ccfbf1; padding-bottom: 6px; }
  h2 { font-size: 17px; font-weight: 600; color: #134e4a; margin: 20px 0 8px; }
  h3 { font-size: 15px; font-weight: 600; color: #0f766e; margin: 16px 0 6px; }
  p { margin: 8px 0; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 3px 0; }
  code { font-family: 'JetBrains Mono', monospace; font-size: 12px;
         background: #f0fdfa; color: #115e59; padding: 1px 5px; border-radius: 4px; }
  pre { background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px;
        font-size: 12px; overflow-x: auto; margin: 12px 0; }
  pre code { background: none; color: inherit; padding: 0; }
  strong { font-weight: 600; }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px;
            padding-bottom: 20px; border-bottom: 1px solid #ccfbf1; }
  .logo { width: 36px; height: 36px; background: linear-gradient(135deg, #0d9488, #14b8a6);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 16px; }
  .brand { font-weight: 700; font-size: 15px; color: #115e59; }
  .meta { font-size: 11px; color: #888; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">P</div>
  <div>
    <div class="brand">PromptArchitect</div>
    <div class="meta">Gerado em ${new Date().toLocaleDateString("pt-BR", { dateStyle: "long" })}</div>
  </div>
</div>
<p>${html}</p>
</body>
</html>`;
}

// ─── Card inline (aparece no final da mensagem) ───────────────────────────────

interface CardProps {
  content: string;
  onOpen: () => void;
}

export function PromptArtifactCard({ content, onOpen }: CardProps) {
  const slug = makeFilename(content);
  const filename = slug + ".md";

  function downloadMd() {
    downloadText(content, filename, "text/markdown");
    toast.success("Prompt baixado como .md");
  }

  return (
    <div
      aria-label="Prompt Card"
      className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/8 px-4 py-3 transition-colors group"
    >
      {/* Ícone documento */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
        <FileText className="h-4 w-4 text-primary" />
      </div>

      {/* Nome e tipo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{filename}</p>
        <p className="text-[11px] text-muted-foreground">Documento · MD</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={downloadMd}
          title="Baixar como .md"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 hover:bg-accent px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Baixar</span>
        </button>
        <button
          onClick={onOpen}
          title="Abrir artefato"
          className="flex items-center gap-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/25 px-2.5 py-1.5 text-xs text-primary font-medium transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Abrir</span>
        </button>
      </div>
    </div>
  );
}

// ─── Painel lateral ───────────────────────────────────────────────────────────

interface PanelProps {
  content: string;
  open: boolean;
  onClose: () => void;
}

export function PromptArtifactPanel({ content, open, onClose }: PanelProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const slug = makeFilename(content);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [content]);

  function downloadMd() {
    downloadText(content, slug + ".md", "text/markdown");
    toast.success("Baixado como .md");
  }

  function downloadPdf() {
    const html = buildPrintHtml(content, slug);
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup bloqueado. Permita popups para gerar o PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.print();
    };
    toast.info("Use Ctrl+P → Salvar como PDF para salvar o arquivo.");
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay para fechar */}
      <div className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm" onClick={onClose} />

      {/* Painel */}
      <div
        className={`
          fixed z-40 inset-y-0 right-0 flex flex-col
          bg-card border-l border-border shadow-2xl
          transition-all duration-300
          ${expanded ? "w-full md:w-[780px]" : "w-full md:w-[520px]"}
        `}
      >
        {/* Header do painel */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{slug}.md</p>
            <p className="text-[10px] text-muted-foreground">Prompt gerado · PromptArchitect</p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={copyAll}
              title="Copiar tudo"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 hover:bg-accent px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{copied ? "Copiado!" : "Copiar"}</span>
            </button>
            <button
              onClick={downloadMd}
              title="Baixar .md"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 hover:bg-accent px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">.md</span>
            </button>
            <button
              onClick={downloadPdf}
              title="Imprimir / Salvar como PDF"
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 text-xs text-primary font-medium transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Reduzir" : "Expandir"}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              title="Fechar"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo com preview renderizado */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6">
            <Markdown>{content}</Markdown>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-4 py-3 shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {content.length.toLocaleString("pt-BR")} caracteres ·{" "}
            {content.split(/\s+/).filter(Boolean).length.toLocaleString("pt-BR")} palavras
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadMd}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Download className="h-3 w-3" /> Baixar .md
            </button>
            <button
              onClick={downloadPdf}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground font-medium hover:opacity-90 transition-colors"
            >
              <FileDown className="h-3 w-3" /> Salvar PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
