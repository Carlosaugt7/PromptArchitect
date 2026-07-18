import { 
  ImageGenerationRequest, 
  ImageGenerationResponse, 
  DesignState, 
  MarketingCopy, 
  QualityScore 
} from "./types";
import { buildDirectorSystemPrompt, buildDirectorUserMessage } from "./promptArchitect";
import { generateOpenAIImage } from "./providers/openai.provider";
import { generateGeminiImage } from "./providers/gemini.provider";
import { ProvidersState, ProviderId } from "../llm-providers";

/**
 * Função utilitária para chamar o Chat Completion de forma genérica no backend
 */
async function callChat(params: {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  system?: string;
  messages: { role: "user" | "assistant" | "system"; content: string | any[] }[];
}): Promise<string> {
  const { provider, apiKey, baseUrl, model, system, messages } = params;
  
  // Limpa o baseUrl de possíveis sufixos
  const cleanBase = baseUrl
    .replace(/\/+$/, "")
    .replace(/\/(chat\/completions|messages|generateContent)$/i, "")
    .replace(/\/+$/, "");

  const isGoogle = provider === "google" || /generativelanguage\.googleapis\.com/i.test(cleanBase) || /^gemini[-_.]/i.test(model);
  const isAnthropic = provider === "anthropic" || /anthropic\.com/i.test(cleanBase) || /^claude[-_.]/i.test(model);

  if (isGoogle) {
    const url = `${cleanBase}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages.map((m) => {
      let parts: any[] = [];
      if (typeof m.content === "string") {
        parts = [{ text: m.content }];
      } else {
        parts = m.content.map(p => {
          if (p.type === "text") return { text: p.text };
          if (p.type === "image_url") {
            const mData = /^data:([^;]+);base64,(.+)$/.exec(p.image_url.url);
            return mData 
              ? { inline_data: { mime_type: mData[1], data: mData[2] } }
              : { text: p.image_url.url };
          }
          return { text: String(p) };
        });
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
      }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d?.error?.message ?? `Erro Gemini API: ${res.status}`);
    return d.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  if (isAnthropic) {
    const anthropicBase = cleanBase.endsWith("/v1") ? cleanBase : `${cleanBase}/v1`;
    const filteredMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        let contentArr: any[] = [];
        if (typeof m.content === "string") {
          contentArr = [{ type: "text", text: m.content }];
        } else {
          contentArr = m.content.map(p => {
            if (p.type === "text") return { type: "text", text: p.text };
            if (p.type === "image_url") {
              const mData = /^data:([^;]+);base64,(.+)$/.exec(p.image_url.url);
              if (mData) {
                return { type: "image", source: { type: "base64", media_type: mData[1], data: mData[2] } };
              }
            }
            return { type: "text", text: "[Unsupported part]" };
          });
        }
        return { role: m.role, content: contentArr };
      });

    const res = await fetch(`${anthropicBase}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: filteredMessages,
      }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d?.error?.message ?? `Erro Anthropic API: ${res.status}`);
    return d.content?.[0]?.text ?? "";
  }

  // Padrão OpenAI / APIs Compatíveis
  const allMessages = system ? [{ role: "system" as const, content: system }, ...messages] : messages;
  const oaiMessages = allMessages.map(m => {
    if (typeof m.content === "string") return m;
    // Visão na OpenAI
    const content = m.content.map(p => {
      if (p.type === "text") return { type: "text" as const, text: p.text };
      if (p.type === "image_url") return { type: "image_url" as const, image_url: { url: p.image_url.url } };
      return p;
    });
    return { role: m.role, content };
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey && apiKey !== "undefined") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const endpoint = `${cleanBase}/chat/completions`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages: oaiMessages }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d?.error?.message ?? `Erro OpenAI API: ${res.status}`);
  return d.choices?.[0]?.message?.content ?? "";
}

/**
 * Tenta selecionar uma LLM ativa e robusta para tarefas de Diretor de Arte (texto)
 */
function getActiveTextModel(providers: ProvidersState): { provider: ProviderId; apiKey: string; baseUrl: string; model: string } {
  if (providers.google?.apiKey) {
    return {
      provider: "google",
      apiKey: providers.google.apiKey,
      baseUrl: providers.google.baseUrl || "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.5-flash",
    };
  }
  if (providers.openai?.apiKey) {
    return {
      provider: "openai",
      apiKey: providers.openai.apiKey,
      baseUrl: providers.openai.baseUrl || "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    };
  }
  if (providers.openrouter?.apiKey) {
    return {
      provider: "openrouter",
      apiKey: providers.openrouter.apiKey,
      baseUrl: providers.openrouter.baseUrl || "https://openrouter.ai/api/v1",
      model: "google/gemini-2.5-flash",
    };
  }
  throw new Error("Nenhum provedor de texto (Gemini/OpenAI) com chave de API ativa foi encontrado para rodar o Diretor de Artes.");
}

/**
 * Tenta selecionar um modelo de Visão computacional ativo para o QA
 */
function getActiveVisionModel(providers: ProvidersState): { provider: ProviderId; apiKey: string; baseUrl: string; model: string } | null {
  try {
    const textConfig = getActiveTextModel(providers);
    // gpt-4o-mini e gemini-2.5-flash suportam visão nativamente, então reutilizamos o mesmo seletor
    if (textConfig.provider === "google") {
      return { ...textConfig, model: "gemini-2.5-flash" };
    }
    if (textConfig.provider === "openai") {
      return { ...textConfig, model: "gpt-4o-mini" };
    }
    return textConfig;
  } catch {
    return null;
  }
}

/**
 * Limpa blocos de código markdown do JSON retornado pela LLM
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
    cleaned = cleaned.replace(/\n```$/, "");
  }
  return cleaned.trim();
}

/**
 * Orquestrador principal da Geração com Diretor de Arte (ImageForge)
 */
export async function generateImageWithDirector(
  request: ImageGenerationRequest,
  providers: ProvidersState
): Promise<ImageGenerationResponse> {
  const logs: string[] = [];
  logs.push(`Iniciando fluxo ImageForge para o prompt: "${request.prompt}"`);

  let currentRequest = { ...request };
  let attempts = 0;
  const maxAttempts = 2;

  let refinedPrompt = "";
  let finalDesignState: DesignState = {
    palette: ["#0b0b14", "#ffffff"],
    typography: ["Inter"],
    characters: [],
    layout: "Centralizado",
    objects: [],
    lighting: "Natural",
    style: "Fotográfico",
    text: "",
    composition: "Regra dos Terços",
  };
  let finalCopy: MarketingCopy = {
    headline: "",
    subheadline: "",
    bullets: [],
    cta: "",
    hashtags: [],
  };
  let imageUrl = "";
  let finalScore: QualityScore = {
    stars: 5,
    text: 100,
    composition: 100,
    photography: 100,
    marketing: 100,
    branding: 100,
  };
  let ocrValid = true;

  // Resolve qual LLM usaremos para o Diretor de Artes (texto)
  const textLlm = getActiveTextModel(providers);
  logs.push(`Diretor de Artes ativo via LLM: ${textLlm.provider} (${textLlm.model})`);

  while (attempts < maxAttempts) {
    attempts++;
    logs.push(`\n[Tentativa ${attempts}/${maxAttempts}] Executando Diretor de Artes (PromptArchitect)...`);

    // 1. Chamar o PromptArchitect para detalhar a arte e copy
    const sysPrompt = buildDirectorSystemPrompt();
    const userMsg = buildDirectorUserMessage(currentRequest);

    let llmResponse = "";
    try {
      llmResponse = await callChat({
        ...textLlm,
        system: sysPrompt,
        messages: [{ role: "user", content: userMsg }],
      });
    } catch (e) {
      logs.push(`Erro na chamada da LLM do Diretor de Artes: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }

    // Fazer o parse do JSON da Direção de Arte
    try {
      const parsed = JSON.parse(cleanJsonString(llmResponse));
      refinedPrompt = parsed.refinedPrompt;
      finalDesignState = parsed.designState;
      finalCopy = parsed.copy;
      logs.push(`Direção de arte formulada com sucesso. Estilo: "${finalDesignState.style}". Texto solicitado: "${finalDesignState.text}"`);
      logs.push(`Prompt refinado gerado em inglês: "${refinedPrompt}"`);
    } catch (e) {
      logs.push(`Falha ao fazer parse do JSON do Diretor de Artes. Resposta bruta: ${llmResponse.slice(0, 300)}...`);
      if (attempts === 1) {
        logs.push(`Tentando recuperação simples no primeiro erro...`);
        // Fallback básico para não quebrar a primeira tentativa
        refinedPrompt = `High quality commercial art based on: ${request.prompt}, style is ${request.style ?? "modern"}`;
        finalDesignState.text = request.prompt.slice(0, 30);
      } else {
        throw new Error("Erro de resposta estruturada do Diretor de Artes.");
      }
    }

    // 2. Determinar e rodar o gerador de imagem (DALL-E 3 ou Imagen 3)
    let selectedProvider = request.provider;
    if (!selectedProvider) {
      // Regra inteligente: se tem texto na imagem e temos Gemini Imagen 3, preferimos Gemini.
      if (finalDesignState.text && providers.google?.apiKey) {
        selectedProvider = "google";
      } else if (providers.openai?.apiKey) {
        selectedProvider = "openai";
      } else if (providers.google?.apiKey) {
        selectedProvider = "google";
      } else {
        throw new Error("Nenhum provedor de imagem (OpenAI/Gemini) configurado.");
      }
    }

    logs.push(`Gerando imagem via provedor: ${selectedProvider === "google" ? "Google Gemini (Imagen 3)" : "OpenAI (DALL-E 3)"}`);

    try {
      if (selectedProvider === "google") {
        imageUrl = await generateGeminiImage({
          apiKey: providers.google!.apiKey,
          baseUrl: providers.google?.baseUrl,
          prompt: refinedPrompt,
          size: request.size,
        });
      } else {
        imageUrl = await generateOpenAIImage({
          apiKey: providers.openai!.apiKey,
          baseUrl: providers.openai?.baseUrl,
          prompt: refinedPrompt,
          size: request.size,
        });
      }
      logs.push(`Imagem gerada com sucesso!`);
    } catch (e) {
      logs.push(`Falha na geração de imagem: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }

    // 3. Sistema de Validação por Visão (Vision QA) e Score
    const visionLlm = getActiveVisionModel(providers);
    if (!visionLlm) {
      logs.push(`Aviso: Nenhuma chave de modelo multimodal de visão disponível. Pulando QA de imagem.`);
      break; 
    }

    logs.push(`Iniciando Validação de Qualidade Visual com Vision LLM: ${visionLlm.provider} (${visionLlm.model})`);

    const visionSystemPrompt = `Você é o "Vision QA", o Inspetor de Qualidade de Imagem do OmniForge IDE.
Sua tarefa é auditar a imagem gerada a partir do prompt de imagem fornecido e do texto comercial solicitado.

Você deve responder rigorosamente no formato JSON com o seguinte esquema:
{
  "ocrText": "string (o texto exato que você consegue ler na imagem)",
  "ocrValid": true/false (true se o texto lido bater perfeitamente ou 95% com o solicitado, ignorando pequenos detalhes de estilização de fonte)",
  "score": {
    "stars": number (1 a 5, avaliação geral em estrelas),
    "text": number (0 a 100, legibilidade e correção do texto),
    "composition": number (0 a 100, enquadramento e harmonia),
    "photography": number (0 a 100, luz e nitidez),
    "marketing": number (0 a 100, apelo comercial e CTA),
    "branding": number (0 a 100, fidelidade às cores/estilo requisitados)
  },
  "feedback": "string (resumo em português das falhas ou pontos positivos detectados)"
}`;

    const visionUserMessageContent = [
      { type: "text", text: `TEXTO COMERCIAL SOLICITADO: "${finalDesignState.text}"\nPROMPT USADO: "${refinedPrompt}"\nAqui está a imagem gerada:` },
      { type: "image_url", image_url: { url: imageUrl } }
    ];

    try {
      const visionResponse = await callChat({
        ...visionLlm,
        system: visionSystemPrompt,
        messages: [{ role: "user", content: visionUserMessageContent }],
      });

      const parsedVision = JSON.parse(cleanJsonString(visionResponse));
      finalScore = parsedVision.score;
      ocrValid = parsedVision.ocrValid;

      logs.push(`[Vision QA Feedback]: ${parsedVision.feedback}`);
      logs.push(`[Vision QA Score]: Texto: ${finalScore.text}/100 | Composição: ${finalScore.composition}/100 | Stars: ${finalScore.stars} estrelas`);
      logs.push(`Texto lido por OCR na imagem: "${parsedVision.ocrText}" (Válido? ${ocrValid ? "SIM" : "NÃO"})`);

      if (ocrValid || !finalDesignState.text) {
        // Se o texto estiver correto (ou não houver texto solicitado), terminamos com sucesso
        break;
      } else {
        logs.push(`Validação de texto falhou. Texto incorreto gerado na imagem.`);
        if (attempts < maxAttempts) {
          logs.push(`Preparando para regeneração com reforço de escrita...`);
          // Adiciona feedback de erro no histórico do request para forçar o PromptArchitect a reforçar a escrita no próximo prompt
          currentRequest.history = currentRequest.history ?? [];
          currentRequest.history.push({ role: "user", content: request.prompt });
          currentRequest.history.push({ 
            role: "assistant", 
            content: `O prompt anterior gerou o texto com erros. O leitor automático detectou "${parsedVision.ocrText}" em vez de "${finalDesignState.text}".`
          });
          currentRequest.prompt = `${request.prompt}. CERTIFIQUE-SE de escrever EXATAMENTE as palavras "${finalDesignState.text}". O texto anterior saiu errado como "${parsedVision.ocrText}". Corrija as letras e a ortografia no prompt de imagem.`;
        }
      }
    } catch (e) {
      logs.push(`Falha ao executar ou fazer parse da validação visual: ${e instanceof Error ? e.message : String(e)}`);
      // Não trava o fluxo principal se a validação falhar, apenas assume score padrão
      break;
    }
  }

  logs.push(`Fluxo ImageForge finalizado.`);

  return {
    imageUrl,
    refinedPrompt,
    designState: finalDesignState,
    copy: finalCopy,
    score: finalScore,
    ocrValid,
    logs,
  };
}
