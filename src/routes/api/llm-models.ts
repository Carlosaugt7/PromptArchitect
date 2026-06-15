import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
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
            return json({ error: "provider, apiKey e URL base são obrigatórios" }, 400);
          }

          const base = normalizeBaseUrl(baseUrl);
          if (isBlockedHost(base.hostname)) {
            return json({ error: "Use uma URL pública HTTPS do provedor de LLM" }, 400);
          }

          const attempts = buildModelUrls(provider, base, apiKey);
          const headers = buildHeaders(provider, apiKey);
          let lastError = "Não foi possível detectar modelos nesse endpoint";

          for (const target of attempts) {
            const res = await fetch(target, { headers });
            const text = await res.text();
            if (!res.ok) {
              lastError = `${res.status} ${res.statusText}: ${text.slice(0, 220)}`;
              if ([400, 404, 405].includes(res.status)) continue;
              break;
            }

            try {
              const parsed = JSON.parse(text);
              const models = extractModels(parsed, provider);
              if (models.length > 0) {
                return json({ models: [...new Set(models)].sort(), endpoint: target });
              }
              lastError = "A API respondeu, mas não retornou uma lista de modelos reconhecível";
            } catch {
              lastError = "Resposta inválida do provedor (não-JSON)";
            }
          }

          return json({ error: lastError }, 502);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
        }
      },
    },
  },
});

function normalizeBaseUrl(raw: string) {
  const url = new URL(raw.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("A URL base deve começar com http:// ou https://");
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function buildModelUrls(provider: Provider, base: URL, apiKey: string) {
  const clean = base.toString().replace(/\/$/, "");
  if (provider === "google") return [`${clean}/models?key=${encodeURIComponent(apiKey)}`];
  if (/\/models$/i.test(base.pathname)) return [clean];
  const urls = new Set<string>([`${clean}/models`]);
  if (!/\/v\d+(beta)?$/i.test(base.pathname)) urls.add(`${clean}/v1/models`);
  return [...urls];
}

function buildHeaders(provider: Provider, apiKey: string): Record<string, string> {
  if (provider === "anthropic") {
    return { "x-api-key": apiKey, "anthropic-version": "2023-06-01", Accept: "application/json" };
  }
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
}

function extractModels(data: any, provider: Provider): string[] {
  if (provider === "google") {
    return (data.models ?? [])
      .filter((m: any) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m: any) => String(m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);
  }

  const list = Array.isArray(data) ? data : data.data ?? data.models ?? [];
  return list
    .map((m: any) => (typeof m === "string" ? m : m?.id ?? m?.name ?? m?.model))
    .filter(Boolean)
    .map(String);
}

function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h === "localhost" || h.endsWith(".local") || h === "0.0.0.0" || h === "::1" ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
