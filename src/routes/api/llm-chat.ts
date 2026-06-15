import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

type Provider = "openai" | "anthropic" | "google" | "deepseek" | "openrouter" | "custom";

interface Body {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
  model: string;
  system?: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}

export const Route = createFileRoute("/api/llm-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          const { provider, apiKey, baseUrl, model, system, messages } = body;
          if (!provider || !apiKey || !baseUrl || !model || !messages?.length) {
            return json({ error: "Parâmetros obrigatórios ausentes" }, 400);
          }

          const base = baseUrl.replace(/\/+$/, "");

          if (provider === "anthropic") {
            const res = await fetch(`${base}/messages`, {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model,
                max_tokens: 1024,
                system,
                messages: messages.filter(m => m.role !== "system"),
              }),
            });
            const data = await res.json();
            if (!res.ok) return json({ error: data?.error?.message ?? `${res.status}` }, res.status);
            const text = (data.content ?? []).map((c: any) => c.text).filter(Boolean).join("\n");
            const usage = {
              prompt: data.usage?.input_tokens ?? 0,
              completion: data.usage?.output_tokens ?? 0,
              total: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
            };
            return json({ text, usage });
          }

          if (provider === "google") {
            const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                systemInstruction: system ? { parts: [{ text: system }] } : undefined,
                contents: messages.map(m => ({
                  role: m.role === "assistant" ? "model" : "user",
                  parts: [{ text: m.content }],
                })),
              }),
            });
            const data = await res.json();
            if (!res.ok) return json({ error: data?.error?.message ?? `${res.status}` }, res.status);
            const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text).filter(Boolean).join("\n");
            const u = data.usageMetadata ?? {};
            const usage = {
              prompt: u.promptTokenCount ?? 0,
              completion: u.candidatesTokenCount ?? 0,
              total: u.totalTokenCount ?? ((u.promptTokenCount ?? 0) + (u.candidatesTokenCount ?? 0)),
            };
            return json({ text, usage });
          }

          // OpenAI-compatível (openai, deepseek, openrouter, custom)
          const all = system ? [{ role: "system" as const, content: system }, ...messages] : messages;
          const res = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
            body: JSON.stringify({ model, messages: all }),
          });
          const data = await res.json();
          if (!res.ok) return json({ error: data?.error?.message ?? `${res.status}` }, res.status);
          const text = data.choices?.[0]?.message?.content ?? "";
          const u = data.usage ?? {};
          const usage = {
            prompt: u.prompt_tokens ?? 0,
            completion: u.completion_tokens ?? 0,
            total: u.total_tokens ?? ((u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0)),
          };
          return json({ text, usage });
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
