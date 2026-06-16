import { useEffect, useState } from "react";
import { Zap, RotateCcw, Pencil, Check, DollarSign } from "lucide-react";
import {
  loadTokens,
  subscribeTokens,
  formatTokens,
  setMonthlyLimit,
  resetTokens,
  type TokenBudget,
} from "@/lib/token-usage";
import { formatUsd } from "@/lib/llm-pricing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TokenMeter() {
  const [b, setB] = useState<TokenBudget>(() => loadTokens());
  const [editing, setEditing] = useState(false);
  const [limitDraft, setLimitDraft] = useState(String(b.monthlyLimit));

  useEffect(() => {
    const refresh = () => setB(loadTokens());
    refresh();
    return subscribeTokens(refresh);
  }, []);

  const hasLimit = b.monthlyLimit > 0;
  const pct = hasLimit ? Math.min(100, (b.used / b.monthlyLimit) * 100) : 0;
  const remaining = hasLimit ? Math.max(0, b.monthlyLimit - b.used) : 0;
  const tone =
    pct >= 90
      ? "bg-destructive"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-glow)]";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="group flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
          title="Uso de tokens neste mês"
        >
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium tabular-nums">{formatTokens(b.used)}</span>
          {hasLimit && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground tabular-nums">
                {formatTokens(b.monthlyLimit)}
              </span>
              <span className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <span
                  className={`block h-full ${tone} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </>
          )}
          <span className="ml-1 flex items-center gap-0.5 text-muted-foreground border-l border-border pl-2">
            <DollarSign className="h-3 w-3" />
            <span className="tabular-nums">{formatUsd(b.costUsd)}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Período: {b.period}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{formatTokens(b.used)}</span>
              {hasLimit && (
                <span className="text-sm text-muted-foreground">
                  de {formatTokens(b.monthlyLimit)} ({formatTokens(remaining)} restantes)
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Custo estimado:{" "}
              <strong className="text-foreground tabular-nums">{formatUsd(b.costUsd)}</strong>
            </div>

            {hasLimit && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Input
                  type="number"
                  min={0}
                  value={limitDraft}
                  onChange={(e) => setLimitDraft(e.target.value)}
                  placeholder="0 = sem limite"
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setMonthlyLimit(Number(limitDraft) || 0);
                    setEditing(false);
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => {
                    setLimitDraft(String(b.monthlyLimit));
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Limite mensal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={resetTokens}
                  title="Zerar contador"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Tokens são contabilizados localmente a cada resposta das LLMs configuradas. Defina{" "}
            <strong>0</strong> para desativar o limite.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
