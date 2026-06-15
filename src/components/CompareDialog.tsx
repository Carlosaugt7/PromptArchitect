import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Markdown } from "@/components/Markdown";
import { Play, X, Loader2 } from "lucide-react";
import {
  listEnabledModels, sendChatStream, type ModelSelection, type WireMessage,
} from "@/lib/llm-providers";
import { estimateCostUsd, formatUsd } from "@/lib/llm-pricing";
import { toast } from "sonner";

interface Run {
  sel: ModelSelection;
  text: string;
  done: boolean;
  cost: number;
  tokens: number;
  ctrl: AbortController;
}

export function CompareDialog({ open, onOpenChange, prompt }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prompt: string;
}) {
  const [available, setAvailable] = useState<ModelSelection[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // "provider:model"
  const [input, setInput] = useState(prompt);
  const [runs, setRuns] = useState<Run[]>([]);
  const runsRef = useRef<Run[]>([]);

  useEffect(() => { if (open) { setAvailable(listEnabledModels()); setInput(prompt); } }, [open, prompt]);

  function toggle(key: string) {
    setPicked(p => p.includes(key) ? p.filter(k => k !== key) : p.length < 3 ? [...p, key] : p);
  }

  async function run() {
    if (!input.trim() || picked.length < 2) { toast.error("Escolha 2–3 modelos e escreva um prompt"); return; }
    runsRef.current.forEach(r => r.ctrl.abort());
    const newRuns: Run[] = picked.map(k => {
      const [provider, ...rest] = k.split(":");
      return {
        sel: { provider: provider as ModelSelection["provider"], model: rest.join(":") },
        text: "", done: false, cost: 0, tokens: 0, ctrl: new AbortController(),
      };
    });
    runsRef.current = newRuns;
    setRuns([...newRuns]);
    const messages: WireMessage[] = [{ role: "user", content: input }];
    await Promise.all(newRuns.map(async (r) => {
      try {
        const { usage } = await sendChatStream(r.sel, messages, (chunk) => {
          r.text += chunk;
          setRuns([...runsRef.current]);
        }, { signal: r.ctrl.signal });
        r.cost = estimateCostUsd(r.sel.model, usage.prompt, usage.completion);
        r.tokens = usage.total;
      } catch (e) {
        if ((e as Error).name !== "AbortError") r.text += `\n\n**Erro:** ${(e as Error).message}`;
      } finally {
        r.done = true;
        setRuns([...runsRef.current]);
      }
    }));
  }

  function stopAll() { runsRef.current.forEach(r => { if (!r.done) r.ctrl.abort(); }); }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopAll(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comparar modelos</DialogTitle>
          <DialogDescription>Envie o mesmo prompt para 2–3 modelos e veja as respostas lado a lado.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {available.length === 0 && <p className="text-sm text-muted-foreground">Nenhum modelo habilitado.</p>}
          {available.map((m) => {
            const key = `${m.provider}:${m.model}`;
            const on = picked.includes(key);
            return (
              <button key={key} onClick={() => toggle(key)}
                className={`rounded-md border px-2 py-1 text-[11px] transition ${on ? "border-primary bg-primary/15" : "border-border bg-card/40 hover:bg-accent"}`}>
                {m.provider} · {m.model}
              </button>
            );
          })}
        </div>

        <textarea
          value={input} onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="Prompt para comparar…"
          className="w-full resize-none rounded-lg border border-border bg-card/40 p-2.5 text-sm focus:outline-none focus:border-primary"
        />

        <div className="flex items-center justify-end gap-2">
          <button onClick={stopAll} className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm hover:bg-accent">
            <X className="h-3.5 w-3.5 inline mr-1" /> Parar
          </button>
          <button onClick={run} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:opacity-90">
            <Play className="h-3.5 w-3.5 inline mr-1" /> Executar
          </button>
        </div>

        <div className="grid gap-3 overflow-auto flex-1" style={{ gridTemplateColumns: `repeat(${Math.max(runs.length, 1)}, minmax(0, 1fr))` }}>
          {runs.map((r, i) => (
            <div key={i} className="flex flex-col rounded-lg border border-border bg-card/40 p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-2 text-[11px]">
                <span className="font-mono truncate">{r.sel.model}</span>
                {!r.done ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-muted-foreground">{r.tokens} tok · {formatUsd(r.cost)}</span>}
              </div>
              <div className="text-sm overflow-auto"><Markdown>{r.text || "…"}</Markdown></div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
