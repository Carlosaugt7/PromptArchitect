import { useEffect, useState } from "react";
import { Sparkles, X, Settings } from "lucide-react";
import { loadProviders } from "@/lib/llm-providers";
import { LlmSettingsDialog } from "./LlmSettingsDialog";

const DISMISS_KEY = "omniforge.onboarding.dismissed";

export function OnboardingHint() {
  const [show, setShow] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const state = loadProviders();
    const hasAny = Object.values(state).some((p) => p?.apiKey);
    if (!hasAny) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <>
      <div
        role="dialog"
        aria-labelledby="onboarding-title"
        className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-2xl backdrop-blur"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="onboarding-title" className="text-sm font-semibold">
              Bem-vindo ao OmniForge
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Para começar, conecte um provedor de IA em <strong>Configurações → Provedores</strong>
              {" "}(OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter ou um endpoint próprio).
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => { setOpenSettings(true); dismiss(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] px-3 py-1.5 text-xs font-medium text-primary-foreground glow hover:opacity-95"
              >
                <Settings className="h-3.5 w-3.5" /> Configurar agora
              </button>
              <button
                onClick={dismiss}
                className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-accent"
              >
                Depois
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dispensar boas-vindas"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <LlmSettingsDialog open={openSettings} onOpenChange={setOpenSettings} />
    </>
  );
}
