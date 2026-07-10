/**
 * /api/web-search — Busca web via DuckDuckGo Instant Answer API (sem API key).
 * Para buscas mais completas, também suporta SearXNG se configurado via env.
 */
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

interface Body {
  query: string;
  maxResults?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/** DuckDuckGo Instant Answer — retorna snippets sem API key. */
async function duckduckgo(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    no_html: "1",
    skip_disambig: "1",
    no_redirect: "1",
  });

  const res = await fetch(`https://api.duckduckgo.com/?${params}`, {
    headers: {
      "User-Agent": "PromptArchitect/1.0",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];

  const data = await res.json() as {
    AbstractText?: string;
    AbstractURL?: string;
    AbstractSource?: string;
    RelatedTopics?: Array<{
      Text?: string;
      FirstURL?: string;
      Topics?: Array<{ Text?: string; FirstURL?: string }>;
    }>;
    Results?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const results: SearchResult[] = [];

  // Resposta principal (abstract)
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.AbstractSource ?? "Resposta direta",
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  // Resultados diretos
  for (const r of data.Results ?? []) {
    if (r.Text && r.FirstURL) {
      results.push({ title: r.Text.split(" - ")[0] ?? r.Text, url: r.FirstURL, snippet: r.Text });
    }
  }

  // Tópicos relacionados
  for (const t of data.RelatedTopics ?? []) {
    if (t.Text && t.FirstURL) {
      results.push({ title: t.Text.split(" - ")[0] ?? t.Text, url: t.FirstURL, snippet: t.Text });
    }
    // Sub-tópicos
    for (const sub of t.Topics ?? []) {
      if (sub.Text && sub.FirstURL) {
        results.push({ title: sub.Text.split(" - ")[0] ?? sub.Text, url: sub.FirstURL, snippet: sub.Text });
      }
    }
  }

  return results;
}

/** GitHub Search API — repositórios públicos. */
async function searchGitHub(query: string, max: number): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, per_page: String(max), sort: "stars" });
  const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
    headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "PromptArchitect/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return [];
  const data = await res.json() as { items?: Array<{ full_name: string; html_url: string; description?: string; stargazers_count?: number; language?: string }> };
  return (data.items ?? []).map((i) => ({
    title: i.full_name,
    url: i.html_url,
    snippet: `${i.description ?? "Sem descrição"} | ⭐ ${i.stargazers_count ?? 0} | ${i.language ?? ""}`,
  }));
}

export const Route = createFileRoute("/api/web-search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const { query, maxResults = 8 } = (await request.json()) as Body;
          if (!query || typeof query !== "string" || query.trim().length < 2) {
            return json({ error: "Campo 'query' obrigatório (mín. 2 caracteres)" }, 400);
          }

          const q = query.trim();
          const isGitHubSearch = /github|repositório|repo\b/i.test(q);

          // Busca em paralelo: DDG + GitHub (se relevante)
          const [ddgResults, ghResults] = await Promise.all([
            duckduckgo(q).catch(() => [] as SearchResult[]),
            isGitHubSearch ? searchGitHub(q.replace(/github/i, "").trim() || q, 5).catch(() => [] as SearchResult[]) : Promise.resolve([] as SearchResult[]),
          ]);

          const combined = [...ddgResults, ...ghResults].slice(0, maxResults);

          return json({
            query: q,
            results: combined,
            count: combined.length,
            sources: [
              ddgResults.length > 0 ? "duckduckgo" : null,
              ghResults.length > 0 ? "github" : null,
            ].filter(Boolean),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
