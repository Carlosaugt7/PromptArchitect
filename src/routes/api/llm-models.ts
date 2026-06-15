import { createFileRoute } from "@tanstack/react-router";

// Proxy server-side para listagem de modelos de provedores LLM.
// Resolve o problema de CORS quando o navegador chama URLs como
// custom endpoints (ex: api.deepseek.com, openrouter, etc.) que não
// liberam Access-Control-Allow-Origin para o navegador.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Provider = "openai" | "anthropic" | "google" | "deepseek" | "openrouter" | "custom";

interface Body {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
}

export const Route = createFileRoute("/api/llm-models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const { provider, apiKey, baseUrl } = (await request.json()) as Body;
          if (!provider || !apiKey || !baseUrl) {
            return json({ error: "provider, apiKey e baseUrl são obrigatórios" }, 400);
          }
          const url = baseUrl.replace(/\/$/, "");

          let res: Response;
          if (provider === "anthropic") {
            res = await fetch(`${url}/models`, {
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
              },
            });
          } else if (provider === "google") {
            res = await fetch(`${url}/models?key=${encodeURIComponent(apiKey)}`);
          } else {
            res = await fetch(`${url}/models`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
          }

          const text = await res.text();
          if (!res.ok) {
            return json({ error: `${res.status} ${res.statusText}: ${text.slice(0, 300)}` }, 502);
          }

          let models: string[] = [];
          try {
            const data = JSON.parse(text);
            if (provider === "google") {
              models = (data.models ?? [])
                .filter((m: any) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
                .map((m: any) => String(m.name).replace(/^models\//, ""));
            } else {
              models = (data.data ?? []).map((m: any) => String(m.id));
            }
          } catch {
            return json({ error: "Resposta inválida do provedor (não-JSON)" }, 502);
          }

          return json({ models: models.sort() });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
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
