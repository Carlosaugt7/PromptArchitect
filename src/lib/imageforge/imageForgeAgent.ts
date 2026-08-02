import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  DesignState,
  MarketingCopy,
  QualityScore,
} from "./types";
import { buildDirectorSystemPrompt, buildDirectorUserMessage } from "./promptArchitect";
import { generateOpenAIImage, resolveOpenAIImageModel } from "./providers/openai.provider";
import { generateGeminiImage, resolveGeminiImageModel } from "./providers/gemini.provider";
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
  const { provider, apiKey, model, system, messages } = params;

  // Garante um baseUrl válido — se vier vazio, usa o default do provedor
  let rawBase = params.baseUrl;
  if (!rawBase || !rawBase.startsWith("http")) {
    const defaults: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      google: "https://generativelanguage.googleapis.com/v1beta",
      anthropic: "https://api.anthropic.com/v1",
      deepseek: "https://api.deepseek.com/v1",
      openrouter: "https://openrouter.ai/api/v1",
    };
    rawBase = defaults[provider] || "https://api.openai.com/v1";
  }

  // Limpa o baseUrl de possíveis sufixos
  const cleanBase = rawBase
    .replace(/\/+$/, "")
    .replace(/\/(chat\/completions|messages|generateContent)$/i, "")
    .replace(/\/+$/, "");

  const isGoogle =
    provider === "google" ||
    /generativelanguage\.googleapis\.com/i.test(cleanBase) ||
    /^gemini[-_.]/i.test(model);
  const isAnthropic =
    provider === "anthropic" ||
    /anthropic\.com/i.test(cleanBase) ||
    (provider === "custom" && /^claude[-_.]/i.test(model));

  if (isGoogle) {
    const url = `${cleanBase}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages.map((m) => {
      let parts: any[] = [];
      if (typeof m.content === "string") {
        parts = [{ text: m.content }];
      } else {
        parts = m.content.map((p) => {
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
          contentArr = m.content.map((p) => {
            if (p.type === "text") return { type: "text", text: p.text };
            if (p.type === "image_url") {
              const mData = /^data:([^;]+);base64,(.+)$/.exec(p.image_url.url);
              if (mData) {
                return {
                  type: "image",
                  source: { type: "base64", media_type: mData[1], data: mData[2] },
                };
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
  const allMessages = system
    ? [{ role: "system" as const, content: system }, ...messages]
    : messages;
  const oaiMessages = allMessages.map((m) => {
    if (typeof m.content === "string") return m;
    // Visão na OpenAI
    const content = m.content.map((p) => {
      if (p.type === "text") return { type: "text" as const, text: p.text };
      if (p.type === "image_url")
        return { type: "image_url" as const, image_url: { url: p.image_url.url } };
      return p;
    });
    return { role: m.role, content };
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey && apiKey !== "undefined") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  let endpoint = `${cleanBase}/chat/completions`;
  if (
    !cleanBase.endsWith("/v1") &&
    !cleanBase.includes("/v1/") &&
    !cleanBase.endsWith("/chat/completions")
  ) {
    endpoint = `${cleanBase}/v1/chat/completions`;
  }

  let res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages: oaiMessages }),
  });

  if (res.status === 404 && !cleanBase.endsWith("/chat/completions")) {
    const fallbackEndpoint = `${cleanBase}/chat/completions`;
    if (fallbackEndpoint !== endpoint) {
      res = await fetch(fallbackEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages: oaiMessages }),
      });
    }
  }

  const d = await res.json();
  if (!res.ok) throw new Error(d?.error?.message ?? `Erro OpenAI API: ${res.status}`);
  return d.choices?.[0]?.message?.content ?? "";
}

/**
 * Tenta selecionar uma LLM ativa e robusta para tarefas de Diretor de Arte (texto)
 */
function getActiveTextModel(providers: ProvidersState): {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  if (providers.google?.apiKey) {
    return {
      provider: "google",
      apiKey: providers.google.apiKey,
      baseUrl: providers.google.baseUrl || "https://generativelanguage.googleapis.com/v1beta",
      model: providers.google.enabled?.[0] || providers.google.models?.[0] || "gemini-2.5-flash",
    };
  }
  if (providers.openai?.apiKey) {
    return {
      provider: "openai",
      apiKey: providers.openai.apiKey,
      baseUrl: providers.openai.baseUrl || "https://api.openai.com/v1",
      model: providers.openai.enabled?.[0] || providers.openai.models?.[0] || "gpt-4o-mini",
    };
  }
  if (providers.openrouter?.apiKey) {
    return {
      provider: "openrouter",
      apiKey: providers.openrouter.apiKey,
      baseUrl: providers.openrouter.baseUrl || "https://openrouter.ai/api/v1",
      model:
        providers.openrouter.enabled?.[0] ||
        providers.openrouter.models?.[0] ||
        "google/gemini-2.5-flash",
    };
  }
  if (providers.custom?.apiKey) {
    return {
      provider: "custom",
      apiKey: providers.custom.apiKey,
      baseUrl: providers.custom.baseUrl,
      model: providers.custom.enabled?.[0] || providers.custom.models?.[0] || "custom-model",
    };
  }
  if (providers.anthropic?.apiKey) {
    return {
      provider: "anthropic",
      apiKey: providers.anthropic.apiKey,
      baseUrl: providers.anthropic.baseUrl || "https://api.anthropic.com/v1",
      model:
        providers.anthropic.enabled?.[0] ||
        providers.anthropic.models?.[0] ||
        "claude-3-5-sonnet-latest",
    };
  }
  if (providers.deepseek?.apiKey) {
    return {
      provider: "deepseek",
      apiKey: providers.deepseek.apiKey,
      baseUrl: providers.deepseek.baseUrl || "https://api.deepseek.com/v1",
      model: providers.deepseek.enabled?.[0] || providers.deepseek.models?.[0] || "deepseek-chat",
    };
  }
  throw new Error(
    "Nenhum provedor de texto ativo com chave de API foi encontrado para rodar o Diretor de Artes.",
  );
}

/**
 * Tenta selecionar um modelo de Visão computacional ativo para o QA
 */
function getActiveVisionModel(
  providers: ProvidersState,
): { provider: ProviderId; apiKey: string; baseUrl: string; model: string } | null {
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
  providers: ProvidersState,
): Promise<ImageGenerationResponse> {
  const logs: string[] = [];
  logs.push(`Iniciando fluxo ImageForge para o prompt: "${request.prompt}"`);

  const currentRequest = { ...request };
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
  let textLlm = getActiveTextModel(providers);
  if (request.provider && request.model && providers[request.provider as ProviderId]?.apiKey) {
    const pObj = providers[request.provider as ProviderId]!;
    textLlm = {
      provider: request.provider as ProviderId,
      apiKey: pObj.apiKey,
      baseUrl: pObj.baseUrl || "",
      model: request.model,
    };
  }
  logs.push(`Diretor de Artes ativo via LLM: ${textLlm.provider} (${textLlm.model})`);

  while (attempts < maxAttempts) {
    attempts++;
    logs.push(
      `\n[Tentativa ${attempts}/${maxAttempts}] Executando Diretor de Artes (PromptArchitect)...`,
    );

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
      logs.push(
        `Erro na chamada da LLM do Diretor de Artes: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }

    // Fazer o parse do JSON da Direção de Arte
    try {
      const parsed = JSON.parse(cleanJsonString(llmResponse));
      refinedPrompt = parsed.refinedPrompt;
      finalDesignState = parsed.designState;
      finalCopy = parsed.copy;
      logs.push(
        `Direção de arte formulada com sucesso. Estilo: "${finalDesignState.style}". Texto solicitado: "${finalDesignState.text}"`,
      );
      logs.push(`Prompt refinado gerado em inglês: "${refinedPrompt}"`);
    } catch (e) {
      logs.push(
        `Falha ao fazer parse do JSON do Diretor de Artes. Resposta bruta: ${llmResponse.slice(0, 300)}...`,
      );
      if (attempts === 1) {
        logs.push(`Tentando recuperação simples no primeiro erro...`);
        // Fallback básico para não quebrar a primeira tentativa
        refinedPrompt = `High quality commercial art based on: ${request.prompt}, style is ${request.style ?? "modern"}`;
        finalDesignState.text = request.prompt.slice(0, 30);
      } else {
        throw new Error("Erro de resposta estruturada do Diretor de Artes.");
      }
    }

    // 2. Determinar e rodar o gerador de imagem (GPT Image, Nano Banana/Imagen, OpenRouter ou Custom)
    // Prioriza o provedor de IMAGEM explícito (imageProvider), que pode ser diferente do
    // provedor usado pelo Diretor de Artes (texto).
    let selectedProvider = request.imageProvider || request.provider;

    // Se o provedor especificado não tiver chave configurada, faz fallback para outro ativo
    if (selectedProvider && !providers[selectedProvider as ProviderId]?.apiKey) {
      selectedProvider = undefined;
    }

    if (!selectedProvider) {
      if (finalDesignState.text && providers.google?.apiKey) {
        selectedProvider = "google";
      } else if (providers.openai?.apiKey) {
        selectedProvider = "openai";
      } else if (providers.google?.apiKey) {
        selectedProvider = "google";
      } else if (providers.openrouter?.apiKey) {
        selectedProvider = "openrouter";
      } else if (providers.custom?.apiKey) {
        selectedProvider = "custom";
      } else {
        throw new Error(
          "Nenhum provedor com chave de API configurada foi encontrado nas Configurações de IA.",
        );
      }
    }

    logs.push(`Gerando imagem via provedor: ${selectedProvider}`);

    try {
      // IMPORTANTE: request.model é o modelo de TEXTO escolhido para o Diretor de Artes
      // (ex: "gpt-4o-mini"). Ele NUNCA deve ser reaproveitado como modelo de imagem — essa
      // era a causa do erro "escolhi OpenAI e deu erro". Usamos request.imageModel (se o
      // usuário escolheu um explicitamente) ou deixamos o resolver escolher um padrão seguro.
      if (selectedProvider === "google") {
        if (!providers.google?.apiKey) {
          throw new Error("Chave de API do Google Gemini não encontrada.");
        }
        imageUrl = await generateGeminiImage({
          apiKey: providers.google.apiKey,
          baseUrl: providers.google.baseUrl,
          model: resolveGeminiImageModel(request.imageModel),
          prompt: refinedPrompt,
          size: request.size,
        });
      } else if (selectedProvider === "openai") {
        if (!providers.openai?.apiKey) {
          throw new Error("Chave de API da OpenAI não encontrada.");
        }
        imageUrl = await generateOpenAIImage({
          apiKey: providers.openai.apiKey,
          baseUrl: providers.openai.baseUrl,
          model: resolveOpenAIImageModel(request.imageModel),
          prompt: refinedPrompt,
          size: request.size,
        });
      } else if (selectedProvider === "openrouter" || selectedProvider === "custom") {
        const activeProv =
          providers[selectedProvider as ProviderId] || providers.openai || providers.custom;
        if (!activeProv?.apiKey) {
          throw new Error(`Chave de API do provedor ${selectedProvider} não encontrada.`);
        }
        try {
          imageUrl = await generateOpenAIImage({
            apiKey: activeProv.apiKey,
            baseUrl: activeProv.baseUrl,
            model: resolveOpenAIImageModel(request.imageModel),
            prompt: refinedPrompt,
            size: request.size,
          });
        } catch (customErr) {
          // Se o servidor customizado não aceita /images/generations, tenta fallback em OpenAI/Gemini se disponíveis
          if (providers.openai?.apiKey) {
            logs.push(
              `Servidor customizado falhou na rota de imagens. Tentando fallback via OpenAI (GPT Image)...`,
            );
            imageUrl = await generateOpenAIImage({
              apiKey: providers.openai.apiKey,
              baseUrl: providers.openai.baseUrl,
              model: resolveOpenAIImageModel(request.imageModel),
              prompt: refinedPrompt,
              size: request.size,
            });
          } else if (providers.google?.apiKey) {
            logs.push(
              `Servidor customizado falhou na rota de imagens. Tentando fallback via Google Gemini (Imagen 3)...`,
            );
            imageUrl = await generateGeminiImage({
              apiKey: providers.google.apiKey,
              baseUrl: providers.google.baseUrl,
              prompt: refinedPrompt,
              size: request.size,
            });
          } else {
            throw new Error(
              `O servidor no modelo "${textLlm.model}" não possui suporte a geração de imagens (/images/generations). Configure uma chave OpenAI ou Gemini Imagen 3 nas Configurações de IA.`,
            );
          }
        }
      } else {
        throw new Error(`Provedor de imagem desconhecido: ${selectedProvider}`);
      }
      logs.push(`Imagem gerada com sucesso!`);
    } catch (e) {
      logs.push(`Falha na geração de imagem: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }

    // 3. Sistema de Validação por Visão (Vision QA) e Score
    const visionLlm = getActiveVisionModel(providers);
    if (!visionLlm) {
      logs.push(
        `Aviso: Nenhuma chave de modelo multimodal de visão disponível. Pulando QA de imagem.`,
      );
      break;
    }

    logs.push(
      `Iniciando Validação de Qualidade Visual com Vision LLM: ${visionLlm.provider} (${visionLlm.model})`,
    );

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
      {
        type: "text",
        text: `TEXTO COMERCIAL SOLICITADO: "${finalDesignState.text}"\nPROMPT USADO: "${refinedPrompt}"\nAqui está a imagem gerada:`,
      },
      { type: "image_url", image_url: { url: imageUrl } },
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
      logs.push(
        `[Vision QA Score]: Texto: ${finalScore.text}/100 | Composição: ${finalScore.composition}/100 | Stars: ${finalScore.stars} estrelas`,
      );
      logs.push(
        `Texto lido por OCR na imagem: "${parsedVision.ocrText}" (Válido? ${ocrValid ? "SIM" : "NÃO"})`,
      );

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
            content: `O prompt anterior gerou o texto com erros. O leitor automático detectou "${parsedVision.ocrText}" em vez de "${finalDesignState.text}".`,
          });
          currentRequest.prompt = `${request.prompt}. CERTIFIQUE-SE de escrever EXATAMENTE as palavras "${finalDesignState.text}". O texto anterior saiu errado como "${parsedVision.ocrText}". Corrija as letras e a ortografia no prompt de imagem.`;
        }
      }
    } catch (e) {
      logs.push(
        `Falha ao executar ou fazer parse da validação visual: ${e instanceof Error ? e.message : String(e)}`,
      );
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
