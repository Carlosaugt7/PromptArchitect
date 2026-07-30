/**
 * /api/web-fetch — Faz fetch de uma URL e retorna o texto limpo (sem HTML tags).
 * Usado pelo frontend para injetar conteúdo de sites no contexto do LLM.
 */
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const MAX_CHARS = 24_000; // limite razoável para contexto

interface Body {
  url: string;
}

/** Remove tags HTML e normaliza espaços. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Detecta se a URL é de um repositório GitHub e usa a API para pegar o README. */
async function fetchGitHub(url: string): Promise<string | null> {
  const ghRepo = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\/|$)/);
  if (!ghRepo) return null;

  const repo = ghRepo[1].replace(/\.git$/, "");

  // Tenta buscar README via API do GitHub (sem autenticação — rate limit 60 req/h)
  const apiUrl = `https://api.github.com/repos/${repo}/readme`;
  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "PromptArchitect/1.0",
    },
  });

  if (!res.ok) {
    // Tenta pegar info básica do repo
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "PromptArchitect/1.0" },
    });
    if (!repoRes.ok) return null;
    const data = await repoRes.json() as Record<string, unknown>;
    return `# ${data.full_name}\n\n${data.description ?? "Sem descrição."}\n\nStars: ${data.stargazers_count} | Forks: ${data.forks_count} | Linguagem: ${data.language}\n\nURL: ${data.html_url}`;
  }

  const data = await res.json() as { content?: string; encoding?: string; name?: string };
  if (data.encoding === "base64" && data.content) {
    const decoded = atob(data.content.replace(/\n/g, ""));
    return `# README — ${repo}\n\n${decoded}`;
  }
  return null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export const Route = createFileRoute("/api/web-fetch")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const { url } = (await request.json()) as Body;
          if (!url || typeof url !== "string") {
            return json({ error: "Campo 'url' obrigatório" }, 400);
          }

          let targetUrl: URL;
          try {
            targetUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
          } catch {
            return json({ error: "URL inválida" }, 400);
          }

          // Bloqueia localhost e IPs privados
          const hostname = targetUrl.hostname;
          if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
            return json({ error: "Acesso a endereços locais não permitido" }, 403);
          }

          // Trata GitHub especialmente
          if (hostname === "github.com") {
            const ghContent = await fetchGitHub(targetUrl.toString());
            if (ghContent) {
              return json({ text: ghContent.slice(0, MAX_CHARS), url: targetUrl.toString(), source: "github-api" });
            }
          }

          // Fetch genérico
          const res = await fetch(targetUrl.toString(), {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; PromptArchitect/1.0; +https://promptarchitect.rsconsultoria.pro)",
              "Accept": "text/html,application/xhtml+xml,text/plain,*/*",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
          });

          if (!res.ok) {
            return json({ error: `Site retornou ${res.status} ${res.statusText}` }, 502);
          }

          const contentType = res.headers.get("content-type") ?? "";
          const rawText = await res.text();

          let text: string;
          if (contentType.includes("text/html")) {
            text = stripHtml(rawText);
          } else if (contentType.includes("application/json")) {
            text = rawText;
          } else {
            text = rawText.replace(/\s{2,}/g, " ").trim();
          }

          return json({
            text: text.slice(0, MAX_CHARS),
            truncated: text.length > MAX_CHARS,
            url: targetUrl.toString(),
            source: "fetch",
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          if (msg.includes("timeout") || msg.includes("TimeoutError")) {
            return json({ error: "Tempo limite excedido ao acessar o site (12s)" }, 504);
          }
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
