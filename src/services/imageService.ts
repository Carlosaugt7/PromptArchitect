import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageServiceOptions,
  ImageServiceError,
} from "@/types";
import { ProvidersState } from "@/lib/llm-providers";

/**
 * Service Layer para o Módulo de Imagens (ImageForge)
 * Responsável por validação, retries exponenciais, tratamento gracioso de falhas
 * e comunicação com a API backend.
 */
export class ImageService {
  private static DEFAULT_MAX_RETRIES = 3;
  private static DEFAULT_RETRY_DELAY_MS = 1500;

  /**
   * Valida a requisição antes de enviar para a API
   */
  public static validateRequest(request: ImageGenerationRequest, providers: ProvidersState): void {
    if (!request || typeof request.prompt !== "string" || !request.prompt.trim()) {
      throw new ImageServiceError(
        "O prompt para a geração de imagem é obrigatório e não pode ser vazio.",
        {
          isRetryable: false,
        },
      );
    }

    if (request.prompt.trim().length < 3) {
      throw new ImageServiceError(
        "O prompt é muito curto. Por favor, forneça mais detalhes sobre a imagem desejada.",
        {
          isRetryable: false,
        },
      );
    }

    if (!providers || Object.keys(providers).length === 0) {
      throw new ImageServiceError(
        "Nenhum provedor de IA está configurado. Acesse as Configurações de IA e adicione uma chave de API.",
        {
          isRetryable: false,
        },
      );
    }

    const hasAnyActiveKey = Object.values(providers).some((p) => !!p?.apiKey);
    if (!hasAnyActiveKey) {
      throw new ImageServiceError(
        "Nenhuma chave de API válida foi encontrada nos provedores configurados.",
        {
          isRetryable: false,
        },
      );
    }
  }

  /**
   * Executa a geração de imagem com retry automático em caso de falhas temporárias de rede/API
   */
  public static async generateImage(
    request: ImageGenerationRequest,
    providers: ProvidersState,
    options: ImageServiceOptions = {},
  ): Promise<ImageGenerationResponse> {
    // 1. Validação prévia
    this.validateRequest(request, providers);

    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelayMs ?? this.DEFAULT_RETRY_DELAY_MS;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1 && options.onProgressLog) {
          options.onProgressLog(`[Retry] Tentativa ${attempt}/${maxRetries} iniciada...`);
        }

        const response = await this.executeFetch(request, providers, options.timeoutMs);
        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err instanceof ImageServiceError && !err.isRetryable) {
          // Erro não recuperável (ex: chave inválida, payload incorreto), interrompe retries
          throw err;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Aguarda com backoff exponencial simples antes da próxima tentativa
        const delay = retryDelay * Math.pow(2, attempt - 1);
        if (options.onProgressLog) {
          options.onProgressLog(
            `Falha na tentativa ${attempt}. Aguardando ${delay}ms para tentar novamente...`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new ImageServiceError(
      `Falha na geração de imagem após ${maxRetries} tentativas. Último erro: ${lastError?.message}`,
      { isRetryable: true },
    );
  }

  /**
   * Realiza a chamada fetch HTTP para o endpoint /api/imageforge
   */
  private static async executeFetch(
    request: ImageGenerationRequest,
    providers: ProvidersState,
    timeoutMs?: number,
  ): Promise<ImageGenerationResponse> {
    const controller = new AbortController();
    const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch("/api/imageforge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({ request, providers }),
      });

      if (timeoutId) clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const rawText = await response.text();
        throw new ImageServiceError(
          `Resposta inválida do servidor (${response.status}): ${rawText.slice(0, 150)}`,
          { statusCode: response.status, isRetryable: response.status >= 500 },
        );
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error || `Erro HTTP ${response.status}`;
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new ImageServiceError(errorMsg, {
          statusCode: response.status,
          isRetryable,
        });
      }

      return data as ImageGenerationResponse;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      if (err instanceof ImageServiceError) throw err;

      if ((err as Error).name === "AbortError") {
        throw new ImageServiceError(
          "A requisição para o gerador de imagem excedeu o tempo limite (timeout).",
          {
            isRetryable: true,
          },
        );
      }

      throw new ImageServiceError(
        `Erro de conexão/comunicação: ${err instanceof Error ? err.message : String(err)}`,
        { isRetryable: true },
      );
    }
  }
}
