import { ImageSize } from "../types";

export interface OpenAIImageParams {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  prompt: string;
  size?: ImageSize;
  quality?: "standard" | "hd";
}

/**
 * Mapeia as proporções de tela do ImageForge para as resoluções aceitas pelo DALL-E 3.
 */
function mapSizeToOpenAI(size: ImageSize = "1:1"): string {
  if (typeof size === "string" && size.includes("x")) {
    const [w, h] = size.split("x").map((n) => parseInt(n.trim(), 10));
    if (w && h) {
      if (w > h * 1.15) return "1792x1024";
      if (h > w * 1.15) return "1024x1792";
      return "1024x1024";
    }
  }

  switch (size) {
    case "16:9":
    case "21:9":
    case "3:2":
      return "1792x1024"; // Landscape
    case "9:16":
    case "2:3":
    case "4:5":
      return "1024x1792"; // Portrait
    case "1:1":
    default:
      return "1024x1024"; // Square
  }
}

/**
 * Realiza a chamada à API da OpenAI / Proxies Compatíveis para gerar uma imagem.
 */
export async function generateOpenAIImage(params: OpenAIImageParams): Promise<string> {
  const { apiKey, baseUrl, model, prompt, size, quality } = params;

  if (!apiKey) {
    throw new Error("Chave de API do provedor de imagem não fornecida.");
  }

  // Permite custom baseUrl, como proxies ou gateways de terceiros
  const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : "https://api.openai.com/v1";
  const endpoint = `${cleanBaseUrl}/images/generations`;

  const sizeString = mapSizeToOpenAI(size);
  const targetModel = model || "dall-e-3";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      prompt: prompt,
      n: 1,
      size: sizeString,
      quality: quality ?? "standard",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorMessage = `Erro na API de imagem (${targetModel}): ${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;

  if (url) return url;
  if (b64) return `data:image/png;base64,${b64}`;

  throw new Error(`A API (${targetModel}) não retornou Nenhuma URL ou dados Base64 de imagem válidos.`);
}
