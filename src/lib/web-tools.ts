/**
 * web-tools.ts — Detecta URLs e pedidos de busca na mensagem do usuário,
 * faz fetch/search via API do servidor e injeta o conteúdo como contexto
 * antes de enviar para o LLM.
 */

export interface WebContext {
  /** Texto enriquecido a ser adicionado antes da mensagem do usuário */
  contextBlock: string;
  /** URLs que foram buscadas */
  fetchedUrls: string[];
  /** Queries de busca executadas */
  searchedQueries: string[];
}

// ─── Detecção ─────────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s"'<>\]()]+|(?:www\.|github\.com\/)[^\s"'<>\]()]+/gi;

const SEARCH_PHRASES = [
  /busqu[ea]|pesquis[ae]|procur[ae]|search|find|look up|o que é|what is|como funciona|how does/i,
  /site:|inurl:|filetype:/i,
];

const GITHUB_RE = /github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/i;

/** Extrai URLs mencionadas na mensagem. */
function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches.map((u) => (u.startsWith("http") ? u : `https://${u}`)))];
}

/** Verifica se o texto parece ser um pedido de busca web. */
function isSearchRequest(text: string): boolean {
  return SEARCH_PHRASES.some((r) => r.test(text));
}

/** Extrai a query de busca de uma frase de pedido. */
function extractSearchQuery(text: string): string {
  return text
    .replace(/^(busqu[ea]|pesquis[ae]|procur[ea]|search for|find|look up)\s+/i, "")
    .replace(/^(o que é|what is|como funciona|how does)\s+/i, "")
    .replace(/[?.!]+$/, "")
    .trim()
    .slice(0, 200);
}

// ─── Chamadas à API ───────────────────────────────────────────────────────────

async function fetchUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch("/api/web-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      return `[Erro ao acessar ${url}: ${err.error ?? res.statusText}]`;
    }
    const data = await res.json() as { text?: string; truncated?: boolean; url?: string };
    const truncNote = data.truncated ? "\n[Conteúdo truncado — exibindo primeiros 24.000 caracteres]" : "";
    return `**Conteúdo de ${data.url ?? url}:**\n\n${data.text ?? ""}${truncNote}`;
  } catch (err) {
    return `[Falha ao buscar ${url}: ${err instanceof Error ? err.message : "erro desconhecido"}]`;
  }
}

async function searchWeb(query: string): Promise<string | null> {
  try {
    const res = await fetch("/api/web-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, maxResults: 6 }),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      results?: Array<{ title: string; url: string; snippet: string }>;
      count?: number;
    };
    if (!data.results?.length) return `[Busca por "${query}" não retornou resultados]`;

    const lines = data.results.map((r, i) =>
      `${i + 1}. **${r.title}**\n   ${r.snippet}\n   🔗 ${r.url}`
    );
    return `**Resultados da busca por "${query}":**\n\n${lines.join("\n\n")}`;
  } catch {
    return null;
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Analisa a mensagem do usuário, detecta URLs e pedidos de busca,
 * executa os fetches em paralelo e retorna o bloco de contexto.
 *
 * Retorna null se não houver nada para buscar.
 */
export async function enrichWithWebContext(userMessage: string): Promise<WebContext | null> {
  const urls = extractUrls(userMessage);
  const needsSearch = isSearchRequest(userMessage) && urls.length === 0;
  const searchQuery = needsSearch ? extractSearchQuery(userMessage) : null;

  if (urls.length === 0 && !searchQuery) return null;

  const parts: string[] = [];
  const fetchedUrls: string[] = [];
  const searchedQueries: string[] = [];

  // Fetch URLs em paralelo (máx 3 para não sobrecarregar)
  if (urls.length > 0) {
    const targets = urls.slice(0, 3);
    const results = await Promise.all(targets.map(fetchUrl));
    for (let i = 0; i < targets.length; i++) {
      if (results[i]) {
        parts.push(results[i]!);
        fetchedUrls.push(targets[i]);
      }
    }
  }

  // Busca web se solicitada
  if (searchQuery) {
    const searchResult = await searchWeb(searchQuery);
    if (searchResult) {
      parts.push(searchResult);
      searchedQueries.push(searchQuery);
    }
  }

  if (parts.length === 0) return null;

  const contextBlock = [
    "---",
    "**[Contexto Web — coletado automaticamente pelo PromptArchitect]**",
    "",
    parts.join("\n\n---\n\n"),
    "---",
    "",
    "Use o conteúdo acima como contexto para responder à solicitação do usuário.",
  ].join("\n");

  return { contextBlock, fetchedUrls, searchedQueries };
}

/** Prefixa a mensagem do usuário com o contexto web coletado. */
export function prependWebContext(userMessage: string, ctx: WebContext): string {
  return `${ctx.contextBlock}\n\n**Solicitação do usuário:**\n${userMessage}`;
}
