import { ImageSize } from "../types";

export interface GeminiImageParams {
  apiKey: string;
  baseUrl?: string;
  prompt: string;
  size?: ImageSize;
}

/**
 * Mapeia as proporções de tela do ImageForge para as resoluções de aspecto do Imagen 3.
 */
function mapSizeToGemini(size: ImageSize = "1:1"): string {
  switch (size) {
    case "16:9":
    case "21:9":
      return "16:9";
    case "9:16":
      return "9:16";
    case "3:2":
      return "4:3"; // Proporção mais próxima
    case "2:3":
      return "3:4"; // Proporção mais próxima
    case "1:1":
    default:
      return "1:1";
  }
}

/**
 * Realiza a chamada direta à API do Google Gemini (Imagen 3) para gerar uma imagem.
 */
export async function generateGeminiImage(params: GeminiImageParams): Promise<string> {
  const { apiKey, baseUrl, prompt, size } = params;

  if (!apiKey) {
    throw new Error("Chave de API do Gemini não fornecida.");
  }

  // O Imagen 3 normalmente usa o modelo imagen-3.0-generate-002 no v1beta
  const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : "https://generativelanguage.googleapis.com/v1beta";
  const aspectRatio = mapSizeToGemini(size);
  
  // Endpoint oficial do Google AI Studio para o Imagen 3
  const endpoint = `${cleanBaseUrl}/models/imagen-3.0-generate-002:generateImages?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: aspectRatio,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorMessage = `Erro ao chamar Imagen 3 (Gemini): ${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const imageBase64 = data.generatedImages?.[0]?.image?.imageBytes;

  if (!imageBase64) {
    throw new Error("A API do Gemini Imagen 3 não retornou dados de imagem (Base64).");
  }

  // Retorna como Data URL base64 para uso direto no navegador
  return `data:image/jpeg;base64,${imageBase64}`;
}
