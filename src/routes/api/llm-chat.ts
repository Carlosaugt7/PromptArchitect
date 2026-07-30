import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

type Provider = "openai" | "anthropic" | "google" | "deepseek" | "openrouter" | "ollama" | "custom";

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

interface Msg {
  role: "user" | "assistant" | "system";
  content: string | Part[];
}

interface Body {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
  model: string;
  system?: string;
  stream?: boolean;
  messages: Msg[];
}

export const Route = createFileRoute("/api/llm-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          if (
            !body.provider ||
            (body.provider !== "ollama" && !body.apiKey) ||
            !body.baseUrl ||
            !body.model ||
            !body.messages?.length
          ) {
            return json({ error: "Parâmetros obrigatórios ausentes" }, 400);
          }
          return body.stream ? streamResponse(body, request.signal) : nonStream(body);
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

/* ---------- Provider mapping ---------- */

function parseDataUrl(url: string): { mediaType: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(url);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}

function partsToAnthropic(content: string | Part[]): any[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return content.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.type === "image_url") {
      const d = parseDataUrl(p.image_url.url);
      return d
        ? { type: "image", source: { type: "base64", media_type: d.mediaType, data: d.base64 } }
        : { type: "image", source: { type: "url", url: p.image_url.url } };
    }
    const d = parseDataUrl(p.file.file_data);
    return d
      ? { type: "document", source: { type: "base64", media_type: d.mediaType, data: d.base64 } }
      : { type: "text", text: `[Arquivo ${p.file.filename}]` };
  });
}

function partsToGoogle(content: string | Part[]): any[] {
  if (typeof content === "string") return [{ text: content }];
  return content.map((p) => {
    if (p.type === "text") return { text: p.text };
    if (p.type === "image_url") {
      const d = parseDataUrl(p.image_url.url);
      return d
        ? { inline_data: { mime_type: d.mediaType, data: d.base64 } }
        : { text: p.image_url.url };
    }
    const d = parseDataUrl(p.file.file_data);
    return d
      ? { inline_data: { mime_type: d.mediaType, data: d.base64 } }
      : { text: `[Arquivo ${p.file.filename}]` };
  });
}

/* ---------- Non-streaming ---------- */

/** Remove sufixos como /chat/completions, /messages, /v1 finais e barras extras. */
function normalizeBase(url: string): string {
  return url
    .replace(/\/+$/, "")
    .replace(/\/(chat\/completions|messages|generateContent)$/i, "")
    .replace(/\/+$/, "");
}

function resolveOpenAIEndpoint(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/chat/completions`;
  if (!/\/v\d+(\/|$)/i.test(clean)) {
    return `${clean}/v1/chat/completions`;
  }
  return `${clean}/chat/completions`;
}

async function nonStream(body: Body): Promise<Response> {
  const { provider, apiKey, baseUrl, model, system, messages } = body;
  const base = normalizeBase(baseUrl);
  const isAnthropic =
    provider === "anthropic" ||
    /anthropic\.com/i.test(base) ||
    (provider === "custom" && /^claude[-_.]/i.test(model));
  const isGoogle =
    provider === "google" ||
    /generativelanguage\.googleapis\.com/i.test(base) ||
    /^gemini[-_.]/i.test(model);

  if (isAnthropic) {
    const anthropicBase = /\/v\d+$/.test(base) ? base : `${base}/v1`;
    const r = await fetch(`${anthropicBase}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "User-Agent": "PromptArchitect/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: partsToAnthropic(m.content) })),
      }),
    });
    const d = await r.json();
    if (!r.ok) return json({ error: d?.error?.message ?? `${r.status}` }, r.status);
    const text = (d.content ?? [])
      .map((c: any) => c.text)
      .filter(Boolean)
      .join("\n");
    return json({ text, usage: anthropicUsage(d.usage) });
  }

  if (isGoogle) {
    const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "User-Agent": "PromptArchitect/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: partsToGoogle(m.content),
        })),
      }),
    });
    const d = await r.json();
    if (!r.ok) return json({ error: d?.error?.message ?? `${r.status}` }, r.status);
    const text = (d.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text)
      .filter(Boolean)
      .join("\n");
    return json({ text, usage: googleUsage(d.usageMetadata) });
  }

  const all = system ? [{ role: "system" as const, content: system }, ...messages] : messages;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "User-Agent": "PromptArchitect/1.0",
    "HTTP-Referer": "http://localhost:8080",
    "X-Title": "PromptArchitect",
  };
  if (apiKey && apiKey !== "undefined" && apiKey !== "ollama") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  
  const endpoint = provider === "ollama"
    ? (base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`)
    : resolveOpenAIEndpoint(baseUrl);

  let r = await fetch(endpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(55000),
    body: JSON.stringify({ model, messages: all }),
  }).catch((err) => {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("Tempo limite excedido na resposta do modelo de IA (55s). Verifique as configurações da URL/provedor ou ative o modo streaming.");
    }
    throw err;
  });

  if (r.status === 404 && provider !== "ollama" && !baseUrl.endsWith("/chat/completions")) {
    const fallbackEndpoint = `${base}/chat/completions`;
    if (fallbackEndpoint !== endpoint) {
      r = await fetch(fallbackEndpoint, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(55000),
        body: JSON.stringify({ model, messages: all }),
      });
    }
  }

  if (r.status === 524 || r.status === 504) {
    return json({ error: `Tempo limite de conexão excedido no provedor de IA (Erro ${r.status}). O servidor de IA demorou para responder.` }, 504);
  }

  const d = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: d?.error?.message ?? `${r.status} ${r.statusText}` }, r.status);
  return json({ text: d.choices?.[0]?.message?.content ?? "", usage: openaiUsage(d.usage) });
}

function anthropicUsage(u: any) {
  const p = u?.input_tokens ?? 0,
    c = u?.output_tokens ?? 0;
  return { prompt: p, completion: c, total: p + c };
}
function googleUsage(u: any) {
  const p = u?.promptTokenCount ?? 0,
    c = u?.candidatesTokenCount ?? 0;
  return { prompt: p, completion: c, total: u?.totalTokenCount ?? p + c };
}
function openaiUsage(u: any) {
  const p = u?.prompt_tokens ?? 0,
    c = u?.completion_tokens ?? 0;
  return { prompt: p, completion: c, total: u?.total_tokens ?? p + c };
}

/* ---------- Streaming ---------- */

async function streamResponse(body: Body, signal: AbortSignal): Promise<Response> {
  const { provider, apiKey, baseUrl, model, system, messages } = body;
  const base = normalizeBase(baseUrl);
  const isAnthropic =
    provider === "anthropic" ||
    /anthropic\.com/i.test(base) ||
    (provider === "custom" && /^claude[-_.]/i.test(model));
  const isGoogle =
    provider === "google" ||
    /generativelanguage\.googleapis\.com/i.test(base) ||
    /^gemini[-_.]/i.test(model);
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      try {
        if (isAnthropic) {
          const anthropicBase = /\/v\d+$/.test(base) ? base : `${base}/v1`;
          const r = await fetch(`${anthropicBase}/messages`, {
            method: "POST",
            signal,
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 4096,
              system,
              stream: true,
              messages: messages
                .filter((m) => m.role !== "system")
                .map((m) => ({ role: m.role, content: partsToAnthropic(m.content) })),
            }),
          });
          if (!r.ok || !r.body) {
            send({ error: `${r.status} ${await r.text()}` });
            return controller.close();
          }
          const usage = { prompt: 0, completion: 0, total: 0 };
          await readSSE(r.body, (evt) => {
            try {
              const j = JSON.parse(evt);
              if (j.type === "content_block_delta" && j.delta?.text) send({ delta: j.delta.text });
              if (j.type === "message_start" && j.message?.usage)
                usage.prompt = j.message.usage.input_tokens ?? 0;
              if (j.type === "message_delta" && j.usage) {
                usage.completion = j.usage.output_tokens ?? 0;
                usage.total = usage.prompt + usage.completion;
              }
            } catch {}
          });
          send({ usage });
          return controller.close();
        }

        if (isGoogle) {
          const url = `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
          const r = await fetch(url, {
            method: "POST",
            signal,
            headers: {
              "content-type": "application/json",
              "User-Agent": "PromptArchitect/1.0",
              Accept: "application/json",
            },
            body: JSON.stringify({
              systemInstruction: system ? { parts: [{ text: system }] } : undefined,
              contents: messages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: partsToGoogle(m.content),
              })),
            }),
          });
          if (!r.ok || !r.body) {
            send({ error: `${r.status} ${await r.text()}` });
            return controller.close();
          }
          let usage = { prompt: 0, completion: 0, total: 0 };
          await readSSE(r.body, (evt) => {
            try {
              const j = JSON.parse(evt);
              const text = (j.candidates?.[0]?.content?.parts ?? [])
                .map((p: any) => p.text)
                .filter(Boolean)
                .join("");
              if (text) send({ delta: text });
              if (j.usageMetadata) usage = googleUsage(j.usageMetadata);
            } catch {}
          });
          send({ usage });
          return controller.close();
        }

        const all = system ? [{ role: "system" as const, content: system }, ...messages] : messages;
        const headers: Record<string, string> = {
          "content-type": "application/json",
          "User-Agent": "PromptArchitect/1.0",
          "HTTP-Referer": "http://localhost:8080",
          "X-Title": "PromptArchitect",
        };
        if (apiKey && apiKey !== "undefined" && apiKey !== "ollama") {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        const endpoint =
          provider === "ollama"
            ? base.endsWith("/v1")
              ? `${base}/chat/completions`
              : `${base}/v1/chat/completions`
            : resolveOpenAIEndpoint(baseUrl);

        const requestBody: Record<string, any> = {
          model,
          messages: all,
          stream: true,
        };
        if (provider !== "ollama" && provider !== "custom") {
          requestBody.stream_options = { include_usage: true };
        }

        let r = await fetch(endpoint, {
          method: "POST",
          signal,
          headers,
          body: JSON.stringify(requestBody),
        });

        // Se falhar por erro do provedor quando enviado stream_options, tenta sem stream_options
        if (!r.ok && requestBody.stream_options) {
          delete requestBody.stream_options;
          r = await fetch(endpoint, {
            method: "POST",
            signal,
            headers,
            body: JSON.stringify(requestBody),
          });
        }

        // Se der 404 no endpoint primário, tenta o fallback em /chat/completions
        if (r.status === 404 && provider !== "ollama") {
          const fallbackEndpoint = `${base}/chat/completions`;
          if (fallbackEndpoint !== endpoint) {
            r = await fetch(fallbackEndpoint, {
              method: "POST",
              signal,
              headers,
              body: JSON.stringify(requestBody),
            });
          }
        }

        if (!r.ok || !r.body) {
          const errText = await r.text().catch(() => "");
          if (r.status === 524 || r.status === 504) {
            send({ error: `Tempo limite de conexão excedido no provedor de IA (Erro ${r.status}). O modelo demorou para responder.` });
          } else {
            send({ error: `${r.status} ${errText || r.statusText}` });
          }
          return controller.close();
        }

        let usage = { prompt: 0, completion: 0, total: 0 };
        await readSSE(r.body, (evt) => {
          if (evt === "[DONE]") return;
          try {
            const j = JSON.parse(evt);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) send({ delta });
            if (j.usage) usage = openaiUsage(j.usage);
          } catch {}
        });
        send({ usage });
        controller.close();
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          send({ error: e instanceof Error ? e.message : "Erro no streaming de resposta" });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
      ...cors,
    },
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
