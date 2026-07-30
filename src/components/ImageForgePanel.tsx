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
  Paintbrush
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { loadProviders, listEnabledModels, type ModelSelection } from "@/lib/llm-providers";
import { ImageService } from "@/services/imageService";
import { 
  ImageStyle, 
  ImageSize, 
  BrandTheme, 
  DesignState, 
  ProfessionalSettings, 
  ImageGenerationResponse 
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

  // Modelos de IA Habilitados
  const [enabledModels, setEnabledModels] = useState<ModelSelection[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState<string>("");

  useEffect(() => {
    setEnabledModels(listEnabledModels());
    const handler = () => setEnabledModels(listEnabledModels());
    window.addEventListener("omniforge.llm.providers-changed", handler);
    return () => window.removeEventListener("omniforge.llm.providers-changed", handler);
  }, []);

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
      toast.error("Configure ao menos um provedor de IA com chave de API nas Configurações primeiro.");
      return;
    }

    setLoading(true);
    setOcrFailedNotice(false);

    // Estrutura a marca se preenchida
    const brandTheme: BrandTheme | undefined = brandName.trim() ? {
      name: brandName.trim(),
      colors: brandColors.split(",").map(c => c.trim()),
      fonts: brandFonts.split(",").map(f => f.trim()),
      toneOfVoice: brandVoice.trim(),
    } : undefined;

    // Define o tamanho da imagem (preset ou resolução customizada WxH)
    const size = selectedSize === "custom"
      ? `${customWidth || 1024}x${customHeight || 1024}`
      : (selectedSize as ImageSize);

    let chosenProvider: string | undefined = undefined;
    let chosenModel: string | undefined = undefined;

    if (selectedModelKey && selectedModelKey.includes("::")) {
      const [p, m] = selectedModelKey.split("::");
      chosenProvider = p;
      chosenModel = m;
    }

    const requestPayload = {
      prompt: activePrompt,
      provider: chosenProvider,
      model: chosenModel,
      size,
      style: selectedStyle as ImageStyle,
      brandTheme,
      designState: currentDesignState || undefined,
      history: isIteration ? history : [],
    };

    try {
      const res = await ImageService.generateImage(requestPayload, providers, {
        maxRetries: 3,
        onProgressLog: (log) => toast.info(log),
      });

      setLastResponse(res);
      setCurrentDesignState(res.designState);
      
      // Se for a primeira geração, cria o histórico
      if (!isIteration) {
        setHistory([
          { role: "user", content: activePrompt },
          { role: "assistant", content: `Arte forjada com sucesso. Adotei o estilo "${res.designState.style}" e a paleta: ${res.designState.palette.join(", ")}.` }
        ]);
      } else {
        setHistory(prev => [
          ...prev,
          { role: "user", content: activePrompt },
          { role: "assistant", content: `Arte atualizada. Mudanças aplicadas no layout e na composição.` }
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

          {/* Seletor de Modelo de IA e Configurações Visuais */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Modelo de IA (Direção de Arte / LLM)</Label>
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
          </div>

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
                {ADVANCED_STYLES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
            <Button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-[var(--brand-glow)] text-primary-foreground font-semibold glow flex items-center justify-center gap-1.5"
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
                placeholder="Solicite alterações (ex: 'deixe mais premium e dourado')"
                className="text-xs bg-background/50 h-9"
                disabled={loading}
              />
              <Button type="submit" disabled={loading} size="icon" className="h-9 w-9 bg-primary glow">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Coluna de Visualização do Output (Direita) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        {/* Placeholder quando não gerado */}
        {!lastResponse && (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center border border-dashed border-border bg-card/20 rounded-2xl p-8 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-40 animate-pulse" />
              <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-semibold text-sm">Nenhuma imagem forjada</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Configure as opções no painel da esquerda e clique em **Forjar Nova Arte**. O Diretor de Artes da IA criará o design e a copy para você.
            </p>
          </div>
        )}

        {/* Exibição da Imagem & Detalhes */}
        {lastResponse && (
          <div className="space-y-5">
            {/* Visualizador de Imagem */}
            <div className="rounded-2xl border border-border bg-card/40 overflow-hidden relative group">
              <img 
                src={lastResponse.imageUrl} 
                alt="Arte gerada com IA" 
                className="w-full object-contain bg-background max-h-[500px]"
              />
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={lastResponse.imageUrl} 
                  download="imageforge-art.jpg"
                  target="_blank" 
                  rel="noreferrer"
                >
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/80 backdrop-blur-md shadow-md border border-border">
                    <Download className="h-4 w-4 text-foreground" />
                  </Button>
                </a>
              </div>

              {/* Banner de Aviso de OCR */}
              {ocrFailedNotice && (
                <div className="absolute bottom-0 inset-x-0 bg-destructive/90 text-destructive-foreground p-2 text-xs flex items-center justify-center gap-2 backdrop-blur-sm">
                  <ShieldAlert className="h-4 w-4" />
                  <span>O Inspetor de Visão detectou possíveis distorções no texto. Você pode pedir correções no chat de design.</span>
                </div>
              )}
            </div>

            {/* Quality Score & OCR QA Report */}
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4.5 w-4.5 text-primary filled" fill="currentColor" />
                  <h3 className="text-sm font-semibold font-display">Relatório do Inspetor de Visão (Vision QA)</h3>
                </div>
                <div className="flex items-center gap-0.5 text-primary font-bold text-sm">
                  {lastResponse.score.stars}
                  <span className="text-xs text-muted-foreground font-normal"> / 5 estrelas</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                {[
                  { name: "Legibilidade", score: lastResponse.score.text, color: "text-blue-500 bg-blue-500/10" },
                  { name: "Composição", score: lastResponse.score.composition, color: "text-emerald-500 bg-emerald-500/10" },
                  { name: "Fotografia", score: lastResponse.score.photography, color: "text-amber-500 bg-amber-500/10" },
                  { name: "Copy/Marketing", score: lastResponse.score.marketing, color: "text-rose-500 bg-rose-500/10" },
                  { name: "Branding", score: lastResponse.score.branding, color: "text-purple-500 bg-purple-500/10" },
                ].map((s, idx) => (
                  <div key={idx} className="border border-border/50 bg-background/20 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground block font-medium mb-1.5">{s.name}</span>
                    <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-muted">
                      {s.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Copywriter de Marketing & CTA */}
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5 space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b border-border">
                <Target className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-sm font-semibold font-display">Copy de Marketing Sugerida</h3>
              </div>

              <div className="space-y-3.5">
                {/* Headline */}
                <div className="space-y-1 relative group">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Headline</span>
                  <div className="flex items-center justify-between bg-background/40 border border-border/60 p-2.5 rounded-xl text-xs font-medium">
                    <p>{lastResponse.copy.headline}</p>
                    <button 
                      onClick={() => handleCopy(lastResponse.copy.headline, "hl")} 
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    >
                      {copiedText === "hl" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Subheadline */}
                <div className="space-y-1 relative group">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Subheadline</span>
                  <div className="flex items-center justify-between bg-background/40 border border-border/60 p-2.5 rounded-xl text-xs">
                    <p className="text-muted-foreground">{lastResponse.copy.subheadline}</p>
                    <button 
                      onClick={() => handleCopy(lastResponse.copy.subheadline, "shl")} 
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    >
                      {copiedText === "shl" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Bullet Points */}
                {lastResponse.copy.bullets.length > 0 && (
                  <div className="space-y-1 relative group">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pontos Fortes (Bullets)</span>
                    <div className="bg-background/40 border border-border/60 p-2.5 rounded-xl text-xs space-y-1 relative">
                      {lastResponse.copy.bullets.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-primary text-[10px] mt-0.5">•</span>
                          <p>{b}</p>
                        </div>
                      ))}
                      <button 
                        onClick={() => handleCopy(lastResponse.copy.bullets.join("\n"), "bl")} 
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        {copiedText === "bl" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* CTA & Hashtags */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Call to Action (CTA)</span>
                    <div className="flex items-center justify-between bg-background/40 border border-border/60 px-3 py-2 rounded-xl text-xs font-bold text-primary">
                      <span>{lastResponse.copy.cta}</span>
                      <button 
                        onClick={() => handleCopy(lastResponse.copy.cta, "cta")} 
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        {copiedText === "cta" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Hashtags</span>
                    <div className="flex items-center justify-between bg-background/40 border border-border/60 px-3 py-2 rounded-xl text-[11px] font-mono text-muted-foreground">
                      <span className="truncate">{lastResponse.copy.hashtags.join(" ")}</span>
                      <button 
                        onClick={() => handleCopy(lastResponse.copy.hashtags.join(" "), "tags")} 
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        {copiedText === "tags" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Detalhados do Diretor de Artes */}
            <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-4 space-y-2">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Logs do Diretor de Artes</span>
              <div className="bg-background/80 font-mono text-[10px] p-3 rounded-xl max-h-[140px] overflow-y-auto space-y-1 border border-border/50 text-muted-foreground leading-relaxed">
                {lastResponse.logs.map((log, idx) => (
                  <div key={idx} className={log.includes("Erro") || log.includes("falhou") ? "text-destructive" : log.includes("sucesso") ? "text-success" : ""}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
