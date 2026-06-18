import { useEffect, useMemo, useState } from "react";
import { Bug, X, Sparkles, Trash2, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  subscribe,
  clearIssues,
  removeIssue,
  markAllSeen,
  formatIssueForPrompt,
  type CapturedIssue,
} from "@/lib/auto-debug";
import { loadSelection, sendChat } from "@/lib/llm-providers";
import { Markdown } from "@/components/Markdown";

const SYSTEM = `Você é um engenheiro sênior especialista em depuração de aplicações web (React/TypeScript/TanStack Start).
Receberá um erro capturado em runtime. Responda em pt-BR, de forma OBJETIVA, com EXATAMENTE estas seções em markdown:

## Causa provável
(1-3 frases)

## Como corrigir
(passos numerados curtos)

## Patch sugerido
\`\`\`diff
- linha antiga
+ linha nova
\`\`\`
(se não souber o arquivo exato, mostre o padrão genérico do trecho a alterar)

## Como prevenir
(1-2 bullets)`;

export function AutoDebugPanel() {
  const [issues, setIssues] = useState<CapturedIssue[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<CapturedIssue | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribe(setIssues), []);

  const unseen = useMemo(() => issues.filter((i) => !i.seen).length, [issues]);

  async function analyze(issue: CapturedIssue) {
    const sel = loadSelection();
    if (!sel) {
      toast.error("Selecione um modelo de IA primeiro");
      return;
    }
    setActive(issue);
    setAnalysis("");
    setLoading(true);
    try {
      const { text } = await sendChat(
        sel,
        [{ role: "user", content: formatIssueForPrompt(issue) }],
        { system: SYSTEM },
      );
      setAnalysis(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Falha na análise: ${msg}`);
      setAnalysis(`**Erro ao analisar:** ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          markAllSeen();
        }}
        title="Bugs detectados"
        className="fixed bottom-4 right-4 z-50 grid h-11 w-11 place-items-center rounded-full border border-border bg-card shadow-lg hover:bg-accent transition-colors"
      >
        <Bug
          className={`h-5 w-5 ${issues.length ? "text-destructive" : "text-muted-foreground"}`}
        />
        {unseen > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] max-h-[70vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bug className="h-4 w-4 text-destructive" />
              Bugs detectados <Badge variant="outline">{issues.length}</Badge>
            </div>
            <div className="flex items-center gap-1">
              {issues.length > 0 && (
                <button
                  onClick={() => {
                    clearIssues();
                    setActive(null);
                    setAnalysis("");
                  }}
                  title="Limpar tudo"
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {issues.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Nenhum erro capturado. A coleta está ativa.
              </div>
            ) : !active ? (
              <ul className="divide-y divide-border">
                {issues.map((i) => (
                  <li
                    key={i.id}
                    className="p-3 hover:bg-accent/30 cursor-pointer"
                    onClick={() => setActive(i)}
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                        {i.kind}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{i.message}</p>
                        {i.source && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground truncate font-mono">
                            {i.source}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {i.count > 1 && <>×{i.count} · </>}
                          {new Date(i.lastAt).toLocaleTimeString("pt-BR")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 space-y-3">
                <button
                  onClick={() => {
                    setActive(null);
                    setAnalysis("");
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  ← voltar
                </button>
                <div className="rounded-md border border-border bg-background/40 p-2">
                  <p className="text-xs font-medium break-words">{active.message}</p>
                  {active.source && (
                    <p className="mt-1 text-[10px] font-mono text-muted-foreground break-all">
                      {active.source}
                    </p>
                  )}
                  {active.stack && (
                    <pre className="mt-2 max-h-32 overflow-auto text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                      {active.stack}
                    </pre>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => analyze(active)}
                    disabled={loading}
                    className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)] text-primary-foreground"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analisando…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Analisar com IA
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      removeIssue(active.id);
                      setActive(null);
                      setAnalysis("");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Descartar
                  </Button>
                </div>

                {analysis && (
                  <div className="rounded-md border border-border bg-background/40 p-3 text-xs">
                    <Markdown>{analysis}</Markdown>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(analysis);
                        toast.success("Sugestão copiada");
                      }}
                    >
                      Copiar sugestão
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// label placeholder aria-label
