import { ImageSize } from "../types";

export interface OpenAIImageParams {
  apiKey: string;
  baseUrl?: string;
  /** Modelo de IMAGEM (ex: "gpt-image-1"). NUNCA passe aqui um modelo de chat como "gpt-4o-mini". */
  model?: string;
  prompt: string;
  size?: ImageSize;
  quality?: "standard" | "hd" | "low" | "medium" | "high" | "auto";
}

/**
 * Modelos de imagem válidos na API da OpenAI (Ago/2026).
 * DALL-E 2 e DALL-E 3 foram DESATIVADOS pela OpenAI em 12/05/2026 e não respondem mais.
 * A família "GPT Image" é a substituta oficial recomendada pela OpenAI.
 * https://developers.openai.com/api/docs/deprecations
 */
const GPT_IMAGE_MODELS = new Set([
  "gpt-image-1",
  "gpt-image-1-mini",
  "gpt-image-1.5",
  "gpt-image-2",
]);
const LEGACY_DALLE_MODELS = new Set(["dall-e-2", "dall-e-3"]);
const DEFAULT_IMAGE_MODEL = "gpt-image-1";

/**
 * Garante que o modelo usado na chamada de geração de imagem é de fato um modelo de imagem.
 * Protege contra o bug clássico de reaproveitar o modelo de CHAT (ex: "gpt-4o-mini", escolhido
 * para o Diretor de Artes) na chamada de /images/generations, que sempre retorna erro 400.
 */
export function resolveOpenAIImageModel(requested?: string): string {
  if (requested && (GPT_IMAGE_MODELS.has(requested) || LEGACY_DALLE_MODELS.has(requested))) {
    return requested;
  }
  return DEFAULT_IMAGE_MODEL;
}

/**
 * Mapeia as proporções de tela do ImageForge para resoluções aceitas pelos modelos GPT Image.
 * Tamanhos válidos: "1024x1024", "1536x1024" (paisagem), "1024x1536" (retrato) ou "auto".
 */
function mapSizeToGptImage(size: ImageSize = "1:1"): string {
  if (typeof size === "string" && size.includes("x")) {
    const [w, h] = size.split("x").map((n) => parseInt(n.trim(), 10));
    if (w && h) {
      if (w > h * 1.15) return "1536x1024";
      if (h > w * 1.15) return "1024x1536";
      return "1024x1024";
    }
  }

  switch (size) {
    case "16:9":
    case "21:9":
    case "3:2":
      return "1536x1024"; // Paisagem
    case "9:16":
    case "2:3":
    case "4:5":
      return "1024x1536"; // Retrato
    case "1:1":
    default:
      return "1024x1024"; // Quadrado
  }
}

/** Mapeamento legado, usado apenas se o usuário explicitamente forçar dall-e-3/2 (modelos desativados). */
function mapSizeToDalle(size: ImageSize = "1:1", model: string): string {
  if (model === "dall-e-2") return "1024x1024";
  switch (size) {
    case "16:9":
    case "21:9":
    case "3:2":
      return "1792x1024";
    case "9:16":
    case "2:3":
    case "4:5":
      return "1024x1792";
    default:
      return "1024x1024";
  }
}

/**
 * Realiza a chamada à API da OpenAI (ou proxies compatíveis) para gerar uma imagem.
 */
export async function generateOpenAIImage(params: OpenAIImageParams): Promise<string> {
  const { apiKey, baseUrl, prompt, size, quality } = params;

  if (!apiKey) {
    throw new Error("Chave de API do provedor de imagem não fornecida.");
  }

  const targetModel = resolveOpenAIImageModel(params.model);
  const isLegacyDalle = LEGACY_DALLE_MODELS.has(targetModel);

  // Permite custom baseUrl, como proxies ou gateways de terceiros
  const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : "https://api.openai.com/v1";
  const endpoint = `${cleanBaseUrl}/images/generations`;

  const body: Record<string, unknown> = {
    model: targetModel,
    prompt,
    n: 1,
  };

  if (isLegacyDalle) {
    // Modelos legados (desativados pela OpenAI em 12/05/2026, mantidos apenas para proxies
    // de terceiros que ainda os hospedam). Aceitam response_format e quality standard/hd.
    body.size = mapSizeToDalle(size, targetModel);
    body.response_format = "url";
    body.quality = quality === "hd" ? "hd" : "standard";
  } else {
    // Modelos GPT Image: NÃO aceitam response_format (sempre retornam base64) e usam
    // quality low/medium/high/auto, e tamanhos fixos 1024x1024 / 1536x1024 / 1024x1536 / auto.
    body.size = mapSizeToGptImage(size);
    body.quality =
      quality && ["low", "medium", "high", "auto"].includes(quality) ? quality : "auto";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorMessage = `Erro na API de imagem (${targetModel}): ${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      if (errorText) errorMessage += ` — ${errorText.slice(0, 200)}`;
    }

    if (isLegacyDalle && (response.status === 404 || response.status === 400)) {
      errorMessage += ` (Aviso: DALL-E 2/3 foram desativados pela OpenAI em 12/05/2026. Use "gpt-image-1" ou outro modelo GPT Image.)`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;

  if (url) return url;
  if (b64) return `data:image/png;base64,${b64}`;

  throw new Error(
    `A API (${targetModel}) não retornou nenhuma URL ou dado Base64 de imagem válido.`,
  );
}
