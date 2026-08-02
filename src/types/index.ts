/**
 * PromptArchitect - Central Type Definitions
 * Tipagem abrangente para o módulo de imagem, provedores de LLM e serviço de geração.
 */

// Estilos visuais suportados no ImageForge
export type ImageStyle =
  | "auto"
  | "ultra-realista"
  | "fotografico"
  | "pixel-art"
  | "gibi-hq"
  | "anime"
  | "ilustracao-digital"
  | "flat"
  | "aquarela"
  | "cyberpunk"
  | "3d-render"
  | "minimalista"
  | "vintage"
  | "apple-keynote"
  | string;

// Proporções e formatos de imagem suportados
export type ImageSize =
  | "1:1" // Quadrado (1024x1024)
  | "16:9" // Widescreen / Banner (1344x768)
  | "9:16" // Stories / Reels / TikTok (768x1344)
  | "4:5" // Retrato Feed Instagram (1080x1350)
  | "3:2" // Paisagem Clássica (1152x768)
  | "2:3" // Retrato Clássico (768x1152)
  | "21:9" // Ultrawide (1536x656)
  | "custom" // Personalizado (Largura x Altura)
  | string;

// Identidade visual e marca
export interface BrandTheme {
  name: string;
  logoText?: string;
  colors: string[]; // Cores em HSL/Hex
  fonts: string[];
  margins?: string;
  toneOfVoice?: string;
}

// Estado detalhado de design gerado pelo Diretor de Artes
export interface DesignState {
  palette: string[];
  typography: string[];
  characters: string[];
  layout: string;
  objects: string[];
  lighting: string;
  style: string;
  text: string;
  composition: string;
}

// Configurações profissionais de fotografia
export interface ProfessionalSettings {
  lens?: string;
  iso?: string;
  hdr?: boolean;
  dof?: string; // Depth of field
  lighting?: string;
  negativePrompt?: string;
  seed?: number;
  cfg?: number;
}

// Estrutura de mensagem no histórico do chat
export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Requisição de geração de imagem
export interface ImageGenerationRequest {
  prompt: string;
  /** Provedor usado tanto para o Diretor de Artes (texto) quanto, se imageModel não for definido, para a imagem */
  provider?: "openai" | "google" | "openrouter" | "custom" | string;
  /** Modelo de TEXTO (LLM) usado pelo Diretor de Artes — NUNCA deve ser usado para gerar a imagem final */
  model?: string;
  /** Modelo de IMAGEM explícito (ex: "gpt-image-1", "gemini-2.5-flash-image"). Se ausente, um padrão seguro por provedor é usado */
  imageModel?: string;
  /** Provedor usado especificamente para a geração da IMAGEM final (pode ser diferente do provedor de texto) */
  imageProvider?: "openai" | "google" | "openrouter" | "custom" | string;
  size?: ImageSize;
  customWidth?: number;
  customHeight?: number;
  style?: ImageStyle;
  niche?: string;
  template?: string;
  brandTheme?: BrandTheme;
  designState?: DesignState;
  professionalMode?: ProfessionalSettings;
  history?: ChatHistoryMessage[];
}

// Copy comercial gerada junto com a imagem
export interface MarketingCopy {
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  hashtags: string[];
}

// Avaliação de qualidade e validação por Visão Computacional (Vision QA)
export interface QualityScore {
  stars: number;
  text: number; // 0 a 100
  composition: number; // 0 a 100
  photography: number; // 0 a 100
  marketing: number; // 0 a 100
  branding: number; // 0 a 100
}

// Resposta final da geração de imagem
export interface ImageGenerationResponse {
  imageUrl: string;
  refinedPrompt: string;
  designState: DesignState;
  copy: MarketingCopy;
  score: QualityScore;
  ocrValid: boolean;
  logs: string[];
  error?: string;
}

// Opções para a Service Layer (ImageService)
export interface ImageServiceOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  onProgressLog?: (log: string) => void;
}

// Estrutura de erro padronizada para o módulo de imagem
export class ImageServiceError extends Error {
  public provider?: string;
  public statusCode?: number;
  public isRetryable: boolean;

  constructor(
    message: string,
    options?: { provider?: string; statusCode?: number; isRetryable?: boolean },
  ) {
    super(message);
    this.name = "ImageServiceError";
    this.provider = options?.provider;
    this.statusCode = options?.statusCode;
    this.isRetryable = options?.isRetryable ?? true;
  }
}
