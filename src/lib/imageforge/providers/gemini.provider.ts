import { ImageSize } from "../types";

export interface GeminiImageParams {
  apiKey: string;
  baseUrl?: string;
  /** Modelo de IMAGEM. Padrão: "gemini-2.5-flash-image" (Nano Banana). */
  model?: string;
  prompt: string;
  size?: ImageSize;
}

/**
 * Modelos de imagem válidos na Gemini Developer API (Ago/2026).
 * - gemini-2.5-flash-image / gemini-3.1-flash-image ("Nano Banana"): geração via generateContent,
 *   rápidos, baratos e recomendados pelo Google para a maioria dos casos.
 * - imagen-4.0-generate-001: modelo Imagen dedicado, via endpoint :predict, com melhor fidelidade
 *   fotográfica pura, porém sem suporte nativo a chat/refinamento iterativo.
 * https://ai.google.dev/gemini-api/docs/image-generation
 */
const NANO_BANANA_MODELS = new Set(["gemini-2.5-flash-image", "gemini-3.1-flash-image"]);
const IMAGEN_PREDICT_MODELS = new Set(["imagen-4.0-generate-001", "imagen-3.0-generate-002"]);
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

export function resolveGeminiImageModel(requested?: string): string {
  if (requested && (NANO_BANANA_MODELS.has(requested) || IMAGEN_PREDICT_MODELS.has(requested))) {
    return requested;
  }
  return DEFAULT_IMAGE_MODEL;
}

/** Mapeia as proporções do ImageForge para o parâmetro aspectRatio aceito pelo Gemini. */
function mapAspectRatio(size: ImageSize = "1:1"): string {
  if (typeof size === "string" && size.includes("x")) {
    const [w, h] = size.split("x").map((n) => parseInt(n.trim(), 10));
    if (w && h) {
      if (w > h * 1.15) return "16:9";
      if (h > w * 1.15) return "9:16";
      return "1:1";
    }
  }

  switch (size) {
    case "16:9":
    case "21:9":
      return "16:9";
    case "9:16":
      return "9:16";
    case "4:5":
    case "2:3":
      return "3:4";
    case "3:2":
      return "4:3";
    case "1:1":
    default:
      return "1:1";
  }
}

/**
 * Gera uma imagem usando o modelo Gemini "Nano Banana" (gemini-2.5-flash-image / 3.1-flash-image)
 * através do endpoint padrão generateContent, retornando a imagem embutida (inlineData) na resposta.
 */
async function generateWithNanoBanana(
  params: Required<Pick<GeminiImageParams, "apiKey" | "prompt">> & GeminiImageParams,
): Promise<string> {
  const { apiKey, baseUrl, prompt, size, model } = params;
  const cleanBaseUrl = baseUrl
    ? baseUrl.replace(/\/+$/, "")
    : "https://generativelanguage.googleapis.com/v1beta";
  const endpoint = `${cleanBaseUrl}/models/${encodeURIComponent(model!)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: mapAspectRatio(size) },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await extractGeminiError(response, model!));
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
  const inline = imagePart?.inlineData ?? imagePart?.inline_data;

  if (!inline?.data) {
    // Se o modelo recusou (safety) ou só devolveu texto, o motivo geralmente vem no texto
    const textPart = parts.find((p: any) => p.text)?.text;
    throw new Error(
      `O modelo Gemini "${model}" não retornou dados de imagem.${textPart ? ` Resposta: ${textPart.slice(0, 200)}` : ""}`,
    );
  }

  const mimeType = inline.mimeType ?? inline.mime_type ?? "image/png";
  return `data:${mimeType};base64,${inline.data}`;
}

/**
 * Gera uma imagem usando um modelo Imagen dedicado (imagen-4/imagen-3) através do endpoint :predict.
 */
async function generateWithImagen(
  params: Required<Pick<GeminiImageParams, "apiKey" | "prompt">> & GeminiImageParams,
): Promise<string> {
  const { apiKey, baseUrl, prompt, size, model } = params;
  const cleanBaseUrl = baseUrl
    ? baseUrl.replace(/\/+$/, "")
    : "https://generativelanguage.googleapis.com/v1beta";
  const endpoint = `${cleanBaseUrl}/models/${encodeURIComponent(model!)}:predict?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: mapAspectRatio(size) },
    }),
  });

  if (!response.ok) {
    throw new Error(await extractGeminiError(response, model!));
  }

  const data = await response.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;

  if (!b64) {
    throw new Error(`O modelo Imagen "${model}" não retornou dados de imagem (Base64).`);
  }

  return `data:image/png;base64,${b64}`;
}

async function extractGeminiError(response: Response, model: string): Promise<string> {
  const errorText = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(errorText);
    if (parsed.error?.message) return `Erro Gemini (${model}): ${parsed.error.message}`;
  } catch {}
  return `Erro ao chamar Gemini (${model}): ${response.status} ${response.statusText}${errorText ? ` — ${errorText.slice(0, 200)}` : ""}`;
}

/**
 * Ponto de entrada: escolhe automaticamente entre a rota Nano Banana (generateContent)
 * ou Imagen dedicado (predict) conforme o modelo resolvido.
 */
export async function generateGeminiImage(params: GeminiImageParams): Promise<string> {
  const { apiKey, prompt } = params;

  if (!apiKey) {
    throw new Error("Chave de API do Gemini não fornecida.");
  }
  if (!prompt) {
    throw new Error("Prompt vazio para geração de imagem via Gemini.");
  }

  const model = resolveGeminiImageModel(params.model);
  const fullParams = { ...params, apiKey, prompt, model };

  if (IMAGEN_PREDICT_MODELS.has(model)) {
    return generateWithImagen(fullParams);
  }
  return generateWithNanoBanana(fullParams);
}
