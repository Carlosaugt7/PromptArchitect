/**
 * PromptArchitect - Central Type Definitions
 * Tipagem abrangente para o módulo de imagem, provedores de LLM e serviço de geração.
 */

// Estilos visuais suportados no ImageForge
export type ImageStyle =
  | "ultra-realista"
  | "fotografico"
  | "ilustracao"
  | "3d"
  | "flat"
  | "aquarela"
  | "anime"
  | "cyberpunk"
  | "minimalista"
  | "vintage";

// Proporções de imagem suportadas
export type ImageSize =
  | "1:1"    // Quadrado (1024x1024)
  | "3:2"    // Paisagem Clássica (1152x768)
  | "2:3"    // Retrato Clássico (768x1152)
  | "16:9"   // Banner/Widescreen (1344x768)
  | "9:16"   // Story/Reels (768x1344)
  | "21:9";  // Ultrawide (1536x656)

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
  provider?: "openai" | "google" | "custom" | string;
  size?: ImageSize;
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
  text: number;         // 0 a 100
  composition: number;  // 0 a 100
  photography: number;  // 0 a 100
  marketing: number;    // 0 a 100
  branding: number;     // 0 a 100
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

  constructor(message: string, options?: { provider?: string; statusCode?: number; isRetryable?: boolean }) {
    super(message);
    this.name = "ImageServiceError";
    this.provider = options?.provider;
    this.statusCode = options?.statusCode;
    this.isRetryable = options?.isRetryable ?? true;
  }
}
