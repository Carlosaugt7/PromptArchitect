import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Layers,
  Target,
  Copy,
  Check,
  ChevronRight,
  Info,
  Sliders,
  RefreshCw,
  Download,
  Star,
  ShieldAlert,
  MessageSquare,
  Send,
  Camera,
  Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  loadProviders,
  listEnabledModels,
  IMAGE_MODELS,
  type ModelSelection,
  type ProviderId,
} from "@/lib/llm-providers";
import { ImageService } from "@/services/imageService";
import {
  ImageStyle,
  ImageSize,
  BrandTheme,
  DesignState,
  ProfessionalSettings,
  ImageGenerationResponse,
} from "@/types";
import { NICHES, ADVANCED_STYLES, BRAND_THEMES, TEMPLATES } from "@/lib/imageforge/promptArchitect";

export function ImageForgePanel() {
  // Inputs Principais
  const [prompt, setPrompt] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("ultra-realista");
  const [selectedSize, setSelectedSize] = useState("1:1");
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);

  // Modelos de IA Habilitados (Diretor de Artes — texto)
  const [enabledModels, setEnabledModels] = useState<ModelSelection[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState<string>("");

  // Modelo de IMAGEM (gerador final) — independente do modelo de texto acima
  const [imageProvider, setImageProvider] = useState<ProviderId | "">("");
  const [imageModel, setImageModel] = useState<string>("");

  useEffect(() => {
    const refresh = () => {
      setEnabledModels(listEnabledModels());
      const providers = loadProviders();
      // Escolhe automaticamente o primeiro provedor com chave configurada que também gere imagem
      setImageProvider((prev) => {
        if (prev && providers[prev]?.apiKey && IMAGE_MODELS[prev]) return prev;
        const firstAvailable = (Object.keys(IMAGE_MODELS) as ProviderId[]).find(
          (p) => providers[p]?.apiKey,
        );
        return firstAvailable ?? "";
      });
    };
    refresh();
    window.addEventListener("omniforge.llm.providers-changed", refresh);
    return () => window.removeEventListener("omniforge.llm.providers-changed", refresh);
  }, []);

  // Sempre que o provedor de imagem mudar, seleciona o modelo padrão (recomendado) dessa lista
  useEffect(() => {
    if (imageProvider && IMAGE_MODELS[imageProvider]?.length) {
      setImageModel(IMAGE_MODELS[imageProvider]![0].id);
    } else {
      setImageModel("");
    }
  }, [imageProvider]);

  // Quando o modelo de texto selecionado mudar (ou ao carregar/atualizar provedores),
  // ajusta automaticamente o Provedor de Imagem para corresponder à API selecionada
  useEffect(() => {
    const providers = loadProviders();
    let targetProvider: ProviderId | "" = "";

    if (selectedModelKey && selectedModelKey.includes("::")) {
      const [p] = selectedModelKey.split("::") as [ProviderId, string];
      if (IMAGE_MODELS[p] && providers[p]?.apiKey) {
        targetProvider = p;
      }
    }

    if (!targetProvider) {
      const firstAvailable = (Object.keys(IMAGE_MODELS) as ProviderId[]).find(
        (p) => providers[p]?.apiKey,
      );
      targetProvider = firstAvailable ?? "";
    }

    if (targetProvider && targetProvider !== imageProvider) {
      setImageProvider(targetProvider);
    }
  }, [selectedModelKey, enabledModels, imageProvider]);

  // Detector de Marca
  const [brandName, setBrandName] = useState("");
  const [brandColors, setBrandColors] = useState("#0b0b14, #3b82f6");
  const [brandFonts, setBrandFonts] = useState("Inter, Space Grotesk");
  const [brandVoice, setBrandVoice] = useState("Inovador e Premium");

  // Estado Interno do Agente & Histórico (Memória)
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [currentDesignState, setCurrentDesignState] = useState<DesignState | null>(null);
  const [lastResponse, setLastResponse] = useState<ImageGenerationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [ocrFailedNotice, setOcrFailedNotice] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("Processo de geração cancelado.");
    }
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lastResponse?.logs, loading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleGenerate = async (isIteration = false, directPrompt = "") => {
    const activePrompt = isIteration ? directPrompt : prompt;

    if (!activePrompt.trim()) {
      toast.error("Por favor, digite o que você deseja criar.");
      return;
    }

    const providers = loadProviders();
    const hasAnyActiveKey = Object.values(providers).some((p) => !!p?.apiKey);

    if (!hasAnyActiveKey) {
      toast.error(
        "Configure ao menos um provedor de IA com chave de API nas Configurações primeiro.",
      );
      return;
    }

    setLoading(true);
    setOcrFailedNotice(false);

    // Estrutura a marca se preenchida
    const brandTheme: BrandTheme | undefined = brandName.trim()
      ? {
          name: brandName.trim(),
          colors: brandColors.split(",").map((c) => c.trim()),
          fonts: brandFonts.split(",").map((f) => f.trim()),
          toneOfVoice: brandVoice.trim(),
        }
      : undefined;

    // Define o tamanho da imagem (preset ou resolução customizada WxH)
    const size =
      selectedSize === "custom"
        ? `${customWidth || 1024}x${customHeight || 1024}`
        : (selectedSize as ImageSize);

    let chosenProvider: string | undefined = undefined;
    let chosenModel: string | undefined = undefined;

    if (selectedModelKey && selectedModelKey.includes("::")) {
      const [p, m] = selectedModelKey.split("::");
      chosenProvider = p;
      chosenModel = m;
    }

    if (!imageProvider || !providers[imageProvider]?.apiKey) {
      toast.error(
        "Selecione um Modelo de Imagem válido (com chave de API configurada) antes de gerar.",
      );
      setLoading(false);
      return;
    }

    const requestPayload = {
      prompt: activePrompt,
      provider: chosenProvider,
      model: chosenModel,
      imageProvider,
      imageModel,
      size,
      style: selectedStyle as ImageStyle,
      brandTheme,
      designState: currentDesignState || undefined,
      history: isIteration ? history : [],
    };

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await ImageService.generateImage(requestPayload, providers, {
        maxRetries: 3,
        onProgressLog: (log) => toast.info(log),
        signal: controller.signal,
      });

      setLastResponse(res);
      setCurrentDesignState(res.designState);

      // Se for a primeira geração, cria o histórico
      if (!isIteration) {
        setHistory([
          { role: "user", content: activePrompt },
          {
            role: "assistant",
            content: `Arte forjada com sucesso. Adotei o estilo "${res.designState.style}" e a paleta: ${res.designState.palette.join(", ")}.`,
          },
        ]);
      } else {
        setHistory((prev) => [
          ...prev,
          { role: "user", content: activePrompt },
          {
            role: "assistant",
            content: `Arte atualizada. Mudanças aplicadas no layout e na composição.`,
          },
        ]);
      }

      if (!res.ocrValid && res.designState.text) {
        setOcrFailedNotice(true);
      }

      toast.success("Imagem gerada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const message = chatInput;
    setChatInput("");
    handleGenerate(true, message);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 p-6 bg-background max-h-[calc(100vh-60px)] overflow-y-auto">
      {/* Coluna de Configuração (Esquerda) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <h2 className="font-display font-semibold text-base">Diretor de Artes IA</h2>
          </div>

          {/* Prompt Inicial */}
          <div className="space-y-2">
            <Label htmlFor="prompt">O que você deseja criar?</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva sua ideia em poucas palavras (Ex: 'um letreiro vintage para uma sorveteria chamada Gelato Fino')"
              className="resize-none text-xs bg-background/50 h-20"
              disabled={loading || history.length > 0}
            />
          </div>

          {/* Seletor de Modelo de IA (Texto) e Configurações Visuais */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Modelo de Texto (Diretor de Artes / Copy)
            </Label>
            <select
              value={selectedModelKey}
              onChange={(e) => setSelectedModelKey(e.target.value)}
              className="w-full text-xs bg-background/50 rounded-lg border border-border p-2 focus:ring-1 focus:ring-primary focus:outline-none"
              disabled={loading}
            >
              <option value="">✨ Automático (IA Seleciona o Melhor Modelo)</option>
              {enabledModels.map((m) => (
                <option key={`${m.provider}::${m.model}`} value={`${m.provider}::${m.model}`}>
                  {m.model} ({m.provider === "custom" ? "Personalizado" : m.provider})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Escreve o prompt refinado e a copy de marketing. Não é usado para desenhar a imagem.
            </p>
          </div>

          {/* Seletor de Modelo de IMAGEM (gerador final) — independente do modelo de texto acima */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" /> Provedor de Imagem
              </Label>
              <select
                value={imageProvider}
                onChange={(e) => setImageProvider(e.target.value as ProviderId)}
                className="w-full text-xs bg-background/50 rounded-lg border border-border p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                disabled={loading}
              >
                <option value="">Selecione…</option>
                {(Object.keys(IMAGE_MODELS) as ProviderId[]).map((p) => (
                  <option
                    key={p}
                    value={p}
                    disabled={
                      !enabledModels.some((m) => m.provider === p) && !loadProviders()[p]?.apiKey
                    }
                  >
                    {p === "openai" ? "OpenAI" : "Google Gemini"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Modelo de Imagem</Label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full text-xs bg-background/50 rounded-lg border border-border p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                disabled={loading || !imageProvider}
              >
                {imageProvider &&
                  IMAGE_MODELS[imageProvider]?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {imageProvider && !loadProviders()[imageProvider]?.apiKey && (
            <p className="text-[10px] text-destructive flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Configure uma chave de API para{" "}
              {imageProvider === "openai" ? "OpenAI" : "Google Gemini"} nas Configurações.
            </p>
          )}

          {/* Estilo Visual e Tamanho da Imagem */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estilo da Imagem</Label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full text-xs bg-background/50 rounded-lg border border-border p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                disabled={loading}
              >
                {ADVANCED_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tamanho da Imagem</Label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full text-xs bg-background/50 rounded-lg border border-border p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                disabled={loading}
              >
                <option value="1:1">Quadrado (1024 x 1024)</option>
                <option value="16:9">Widescreen / Banner (1344 x 768)</option>
                <option value="9:16">Stories / Reels / TikTok (768 x 1344)</option>
                <option value="4:5">Retrato Feed Instagram (1080 x 1350)</option>
                <option value="3:2">Paisagem Fotográfica (1152 x 768)</option>
                <option value="2:3">Retrato Poster (768 x 1152)</option>
                <option value="21:9">Ultrawide Hero (1536 x 656)</option>
                <option value="custom">📐 Dimensões Personalizadas (WxH)</option>
              </select>
            </div>
          </div>

          {/* Resolução Personalizada (Quando selecionado custom) */}
          {selectedSize === "custom" && (
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-3 space-y-2 animate-fade-in">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Dimensões Personalizadas (em pixels)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Largura (px)</Label>
                  <Input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value, 10) || 1024)}
                    placeholder="1024"
                    className="h-8 text-xs bg-background/60"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Altura (px)</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value, 10) || 1024)}
                    placeholder="1024"
                    className="h-8 text-xs bg-background/60"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Accordion: Identidade de Marca (Branding Opcional) */}
          <div className="border border-border/60 bg-background/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between pointer-events-auto">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Paintbrush className="h-3.5 w-3.5" /> Identidade de Marca (Opcional)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <Label className="text-[10px]">Nome da Marca</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ex: RS Consultoria"
                  className="h-7 text-[10px] bg-background/40"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Cores (HEX/Lista)</Label>
                <Input
                  value={brandColors}
                  onChange={(e) => setBrandColors(e.target.value)}
                  placeholder="#0b0b14, #3b82f6"
                  className="h-7 text-[10px] bg-background/40"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Botão de Ação */}
          {history.length === 0 && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerate(false)}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary to-[var(--brand-glow)] text-primary-foreground font-semibold glow flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Forjando Direção de Arte...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Forjar Nova Arte
                  </>
                )}
              </Button>
              {loading && (
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  className="px-3"
                  title="Parar Processo"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {history.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setHistory([]);
                setCurrentDesignState(null);
                setLastResponse(null);
                setPrompt("");
                setOcrFailedNotice(false);
              }}
              className="w-full text-xs text-muted-foreground border-border hover:bg-accent/40"
              disabled={loading}
            >
              Resetar e Iniciar Novo Design
            </Button>
          )}
        </div>

        {/* Chat de Iteração (Memória de Conversa) */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-4 flex flex-col gap-3 min-h-[220px]">
            <div className="flex items-center gap-1.5 pb-2 border-b border-border">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold">Memória de Design</h3>
            </div>

            {/* Mensagens do chat */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[160px] pr-1 scrollbar-thin">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`flex flex-col p-2.5 rounded-xl text-xs max-w-[85%] ${
                    h.role === "user"
                      ? "bg-primary/10 border border-primary/20 self-end ml-auto"
                      : "bg-muted/40 border border-border/50 self-start"
                  }`}
                >
                  <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    {h.role === "user" ? "Você" : "Diretor de Artes"}
                  </span>
                  <p className="leading-relaxed text-foreground/90">{h.content}</p>
                </div>
              ))}
            </div>

            {/* Input do chat */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  loading
                    ? "Geração em andamento..."
                    : "Solicite alterações (ex: 'deixe mais premium e dourado')"
                }
                className="text-xs bg-background/50 h-9"
                disabled={loading}
              />
              {loading ? (
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="destructive"
                  size="icon"
                  className="h-9 w-9"
                  title="Parar Processo"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  size="icon"
                  className="h-9 w-9 bg-primary glow"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Coluna de Visualização do Output (Direita) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        {/* Placeholder quando não gerado */}
        {!lastResponse && (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center border border-dashed border-border bg-card/20 rounded-2xl p-8 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-60"
              style={{ backgroundImage: "var(--gradient-glow)" }}
            />
            <div className="relative mb-4">
              <div
                className="absolute inset-0 rounded-2xl blur-2xl opacity-50 animate-pulse"
                style={{ background: "var(--gradient-brand)" }}
              />
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-border bg-background shadow-lg">
                <ImageIcon className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="relative font-display font-semibold text-base">
              Nenhuma imagem forjada ainda
            </h3>
            <p className="relative text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
              Configure as opções no painel à esquerda — incluindo o{" "}
              <strong className="text-foreground/80">Modelo de Imagem</strong> — e clique em{" "}
              <strong className="text-foreground/80">Forjar Nova Arte</strong>. O Diretor de Artes
              criará o design e a copy para você.
            </p>
          </div>
        )}

        {/* Exibição da Imagem & Detalhes */}
        {lastResponse && (
          <div className="space-y-5">
            {/* Faixa de destaque com a marca do OmniForge */}
            <div
              className="rounded-2xl p-[1px] shadow-lg"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              <div className="rounded-[15px] bg-card/95 overflow-hidden">
                {/* Visualizador de Imagem */}
                <div className="relative group">
                  <img
                    src={lastResponse.imageUrl}
                    alt="Arte gerada com IA"
                    className="w-full object-contain bg-background max-h-[500px]"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-md border border-border rounded-full px-2.5 py-1 text-[10px] font-semibold text-foreground/80">
                    <Camera className="h-3 w-3 text-primary" />
                    {imageProvider === "google" ? "Gemini" : "OpenAI"} · {imageModel || "auto"}
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={lastResponse.imageUrl}
                      download="imageforge-art.png"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-background/80 backdrop-blur-md shadow-md border border-border"
                      >
                        <Download className="h-4 w-4 text-foreground" />
                      </Button>
                    </a>
                  </div>

                  {/* Banner de Aviso de OCR */}
                  {ocrFailedNotice && (
                    <div className="absolute bottom-0 inset-x-0 bg-destructive/90 text-destructive-foreground p-2 text-xs flex items-center justify-center gap-2 backdrop-blur-sm">
                      <ShieldAlert className="h-4 w-4" />
                      <span>
                        O Inspetor de Visão detectou possíveis distorções no texto. Você pode pedir
                        correções no chat de design.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quality Score & OCR QA Report */}
            <div
              className="rounded-2xl p-[1px] shadow-lg relative group overflow-hidden"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              <div className="absolute inset-0 bg-background/50 mix-blend-overlay group-hover:opacity-0 transition-opacity duration-500" />
              <div className="relative rounded-[15px] bg-card/95 backdrop-blur-xl p-5 space-y-4 h-full">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-lg shadow-sm"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      <Star className="h-3.5 w-3.5 text-primary-foreground" fill="currentColor" />
                    </div>
                    <h3 className="text-sm font-semibold font-display">
                      Inspetor de Visão (Vision QA)
                    </h3>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < lastResponse.score.stars ? "text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "text-muted-foreground/30"}`}
                        fill="currentColor"
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  {[
                    {
                      name: "Legibilidade",
                      score: lastResponse.score.text,
                      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                    },
                    {
                      name: "Composição",
                      score: lastResponse.score.composition,
                      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                    },
                    {
                      name: "Fotografia",
                      score: lastResponse.score.photography,
                      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                    },
                    {
                      name: "Copy/Marketing",
                      score: lastResponse.score.marketing,
                      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
                    },
                    {
                      name: "Branding",
                      score: lastResponse.score.branding,
                      color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
                    },
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      className="border border-border/50 bg-background/40 hover:bg-background/60 transition-colors p-2.5 rounded-xl space-y-2 shadow-sm"
                    >
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        {s.name}
                      </span>
                      <div className={`h-1.5 w-full rounded-full bg-muted/50 overflow-hidden`}>
                        <div
                          className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${s.color.split(" ")[0].replace("text-", "bg-")}`}
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                      <div
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${s.color}`}
                      >
                        {s.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Copywriter de Marketing & CTA */}
            <div
              className="rounded-2xl p-[1px] shadow-lg relative group overflow-hidden"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              <div className="absolute inset-0 bg-background/50 mix-blend-overlay group-hover:opacity-0 transition-opacity duration-500" />
              <div className="relative rounded-[15px] bg-card/95 backdrop-blur-xl p-5 space-y-4 h-full">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <div
                    className="grid h-7 w-7 place-items-center rounded-lg shadow-sm"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <Target className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold font-display">Copy de Marketing Sugerida</h3>
                </div>

                <div className="space-y-4">
                  {/* Headline */}
                  <div className="space-y-1 relative group/item">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider pl-1">
                      Headline
                    </span>
                    <div className="flex items-center justify-between bg-background/60 hover:bg-background/80 transition-colors border border-border/60 p-3 rounded-xl text-[13px] font-semibold shadow-sm">
                      <p className="text-foreground">{lastResponse.copy.headline}</p>
                      <button
                        onClick={() => handleCopy(lastResponse.copy.headline, "hl")}
                        className="text-muted-foreground hover:text-primary bg-background/50 p-1.5 rounded-md transition-colors"
                      >
                        {copiedText === "hl" ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Subheadline */}
                  <div className="space-y-1 relative group/item">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider pl-1">
                      Subheadline
                    </span>
                    <div className="flex items-center justify-between bg-background/60 hover:bg-background/80 transition-colors border border-border/60 p-3 rounded-xl text-xs shadow-sm">
                      <p className="text-muted-foreground leading-relaxed pr-2">
                        {lastResponse.copy.subheadline}
                      </p>
                      <button
                        onClick={() => handleCopy(lastResponse.copy.subheadline, "shl")}
                        className="text-muted-foreground hover:text-primary bg-background/50 p-1.5 rounded-md transition-colors"
                      >
                        {copiedText === "shl" ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bullet Points */}
                  {lastResponse.copy.bullets.length > 0 && (
                    <div className="space-y-1 relative group/item">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider pl-1">
                        Pontos Fortes (Bullets)
                      </span>
                      <div className="bg-background/60 hover:bg-background/80 transition-colors border border-border/60 p-3.5 rounded-xl text-xs space-y-2 relative shadow-sm">
                        {lastResponse.copy.bullets.map((b, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-primary text-[10px] mt-0.5">•</span>
                            <p className="text-foreground/90 leading-relaxed">{b}</p>
                          </div>
                        ))}
                        <button
                          onClick={() => handleCopy(lastResponse.copy.bullets.join("\n"), "bl")}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-primary bg-background/50 p-1.5 rounded-md transition-colors"
                        >
                          {copiedText === "bl" ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CTA & Hashtags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1 relative group/item">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider pl-1">
                        Call to Action (CTA)
                      </span>
                      <div className="flex items-center justify-between bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors p-3 rounded-xl text-[13px] font-bold text-primary shadow-sm">
                        <span>{lastResponse.copy.cta}</span>
                        <button
                          onClick={() => handleCopy(lastResponse.copy.cta, "cta")}
                          className="text-primary/70 hover:text-primary bg-background/50 p-1.5 rounded-md transition-colors"
                        >
                          {copiedText === "cta" ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 relative group/item">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider pl-1">
                        Hashtags
                      </span>
                      <div className="flex items-center justify-between bg-background/60 hover:bg-background/80 transition-colors border border-border/60 p-3 rounded-xl text-[11px] font-mono text-muted-foreground shadow-sm">
                        <span className="truncate pr-2">
                          {lastResponse.copy.hashtags.join(" ")}
                        </span>
                        <button
                          onClick={() => handleCopy(lastResponse.copy.hashtags.join(" "), "tags")}
                          className="text-muted-foreground hover:text-primary bg-background/50 p-1.5 rounded-md transition-colors flex-shrink-0"
                        >
                          {copiedText === "tags" ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Detalhados do Diretor de Artes */}
            <div
              className="rounded-2xl p-[1px] shadow-lg relative group overflow-hidden"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              <div className="absolute inset-0 bg-background/50 mix-blend-overlay group-hover:opacity-0 transition-opacity duration-500" />
              <div className="relative rounded-[15px] bg-card/95 backdrop-blur-xl p-4 space-y-3 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Logs do Diretor de Artes
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 text-primary border-primary/30 bg-primary/10"
                  >
                    {lastResponse.logs.length} eventos
                  </Badge>
                </div>
                <div className="bg-background/60 shadow-inner font-mono text-[10px] p-3 rounded-xl max-h-[140px] overflow-y-auto space-y-1.5 border border-border/60 text-muted-foreground leading-relaxed scrollbar-thin">
                  {lastResponse.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-1.5 ${log.includes("Erro") || log.includes("falhou") ? "text-destructive" : log.includes("sucesso") ? "text-success" : ""}`}
                    >
                      <span className="opacity-50 mt-0.5">{">"}</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
