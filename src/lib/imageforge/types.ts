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

export type ImageSize =
  | "1:1"    // Quadrado (1024x1024)
  | "3:2"    // Paisagem Clássica (1152x768)
  | "2:3"    // Retrato Clássico (768x1152)
  | "16:9"   // Banner/Widescreen (1344x768)
  | "9:16"   // Story/Reels (768x1344)
  | "21:9";  // Ultrawide (1536x656)

export interface BrandTheme {
  name: string;
  logoText?: string;
  colors: string[]; // Cores em HSL/Hex
  fonts: string[];
  margins?: string;
  toneOfVoice?: string;
}

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

export interface ImageGenerationRequest {
  prompt: string;
  provider?: "openai" | "google";
  size?: ImageSize;
  style?: ImageStyle;
  niche?: string;
  template?: string;
  brandTheme?: BrandTheme;
  designState?: DesignState;
  professionalMode?: ProfessionalSettings;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface MarketingCopy {
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  hashtags: string[];
}

export interface QualityScore {
  stars: number;
  text: number;         // 0 a 100
  composition: number;  // 0 a 100
  photography: number;  // 0 a 100
  marketing: number;    // 0 a 100
  branding: number;     // 0 a 100
}

export interface ImageGenerationResponse {
  imageUrl: string;
  refinedPrompt: string;
  designState: DesignState;
  copy: MarketingCopy;
  score: QualityScore;
  ocrValid: boolean;
  logs: string[];
}
