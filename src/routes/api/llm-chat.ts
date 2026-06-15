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
  stream?: boolean;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}

export const Route = createFileRoute("/api/llm-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          const { provider, apiKey, baseUrl, model, system, messages, stream } = body;
          if (!provider || !apiKey || !baseUrl || !model || !messages?.length) {
            return json({ error: "Parâmetros obrigatórios ausentes" }, 400);
          }
          if (stream) return streamResponse(body);

          const base = baseUrl.replace(/\/+$/, "");

          if (provider === "anthropic") {
            const res = await fetch(`${base}/messages`, {
              method: "POST",
              headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
              body: JSON.stringify({ model, max_tokens: 4096, system, messages: messages.filter(m => m.role !== "system") }),
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
                contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
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
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

/* ---------------- STREAMING ---------------- */

async function streamResponse(body: Body): Promise<Response> {
  const { provider, apiKey, baseUrl, model, system, messages } = body;
  const base = baseUrl.replace(/\/+$/, "");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        if (provider === "anthropic") {
          const r = await fetch(`${base}/messages`, {
            method: "POST",
            headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
            body: JSON.stringify({ model, max_tokens: 4096, system, stream: true, messages: messages.filter(m => m.role !== "system") }),
          });
          if (!r.ok || !r.body) { send({ error: `${r.status} ${await r.text()}` }); return controller.close(); }
          let usage = { prompt: 0, completion: 0, total: 0 };
          await readSSE(r.body, (evt) => {
            try {
              const j = JSON.parse(evt);
              if (j.type === "content_block_delta" && j.delta?.text) send({ delta: j.delta.text });
              if (j.type === "message_start" && j.message?.usage) usage.prompt = j.message.usage.input_tokens ?? 0;
              if (j.type === "message_delta" && j.usage) {
                usage.completion = j.usage.output_tokens ?? 0;
                usage.total = usage.prompt + usage.completion;
              }
            } catch {}
          });
          send({ usage });
          return controller.close();
        }

        if (provider === "google") {
          const url = `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
          const r = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              systemInstruction: system ? { parts: [{ text: system }] } : undefined,
              contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
            }),
          });
          if (!r.ok || !r.body) { send({ error: `${r.status} ${await r.text()}` }); return controller.close(); }
          let usage = { prompt: 0, completion: 0, total: 0 };
          await readSSE(r.body, (evt) => {
            try {
              const j = JSON.parse(evt);
              const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text).filter(Boolean).join("");
              if (text) send({ delta: text });
              if (j.usageMetadata) {
                usage = {
                  prompt: j.usageMetadata.promptTokenCount ?? usage.prompt,
                  completion: j.usageMetadata.candidatesTokenCount ?? usage.completion,
                  total: j.usageMetadata.totalTokenCount ?? usage.total,
                };
              }
            } catch {}
          });
          send({ usage });
          return controller.close();
        }

        // OpenAI-compatível
        const all = system ? [{ role: "system" as const, content: system }, ...messages] : messages;
        const r = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ model, messages: all, stream: true, stream_options: { include_usage: true } }),
        });
        if (!r.ok || !r.body) { send({ error: `${r.status} ${await r.text()}` }); return controller.close(); }
        let usage = { prompt: 0, completion: 0, total: 0 };
        await readSSE(r.body, (evt) => {
          if (evt === "[DONE]") return;
          try {
            const j = JSON.parse(evt);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) send({ delta });
            if (j.usage) usage = {
              prompt: j.usage.prompt_tokens ?? 0,
              completion: j.usage.completion_tokens ?? 0,
              total: j.usage.total_tokens ?? 0,
            };
          } catch {}
        });
        send({ usage });
        controller.close();
      } catch (e) {
        send({ error: e instanceof Error ? e.message : "stream error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache", ...cors },
  });
}

async function readSSE(body: ReadableStream<Uint8Array>, onEvent: (data: string) => void) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith("data:")) onEvent(line.slice(5).trim());
    }
  }
}
