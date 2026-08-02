import { createFileRoute } from "@tanstack/react-router";
import { generateImageWithDirector } from "../../lib/imageforge/imageForgeAgent";
import { ImageGenerationRequest } from "../../lib/imageforge/types";
import { ProvidersState } from "../../lib/llm-providers";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

interface Body {
  request: ImageGenerationRequest;
  providers: ProvidersState;
}

export const Route = createFileRoute("/api/imageforge")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;

          if (!body.request || !body.request.prompt) {
            return json({ error: "O parâmetro request.prompt é obrigatório." }, 400);
          }

          if (!body.providers) {
            return json({ error: "Os dados de chaves de API (providers) são obrigatórios." }, 400);
          }

          // Executa a orquestração do Diretor de Artes + Provedores de Imagem + Vision QA
          const result = await generateImageWithDirector(body.request, body.providers);

          return json(result);
        } catch (err) {
          console.error("Erro no endpoint /api/imageforge:", err);
          return json(
            {
              error:
                err instanceof Error
                  ? err.message
                  : "Erro desconhecido ao processar direção de arte",
            },
            500,
          );
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
