// Diretivas globais ("Agente" + "Rules") aplicadas a TODAS as chamadas de LLM.
// Persistidas no localStorage e injetadas no system prompt antes do envio.

export interface LlmDirectives {
  agent: string; // Persona / papel do agente
  rules: string; // Regras obrigatórias que toda LLM deve seguir
  updatedAt: number;
}

const STORAGE_KEY = "omniforge.llm.directives";

const DEFAULTS: LlmDirectives = {
  agent:
    "Você é o OmniForge, um agente de engenharia de software sênior. Responda em português do Brasil, seja direto, técnico e proativo. Sempre explique decisões importantes e sugira melhorias quando fizer sentido.",
  rules:
    "1. Siga as instruções do usuário literalmente e por completo, sem omitir passos.\n" +
    "2. Nunca invente APIs, bibliotecas ou arquivos — confirme antes de assumir.\n" +
    "3. Produza código pronto para produção: tipado, seguro e testável.\n" +
    "4. Quando houver ambiguidade, faça uma pergunta objetiva antes de codar.\n" +
    "5. Respeite o contexto do projeto e as configurações já existentes.",
  updatedAt: 0,
};

export function loadDirectives(): LlmDirectives {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LlmDirectives>) };
  } catch {
    return DEFAULTS;
  }
}

export function saveDirectives(d: Omit<LlmDirectives, "updatedAt">): LlmDirectives {
  const next: LlmDirectives = { ...d, updatedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Bloco a ser concatenado no início do system prompt de qualquer LLM. */
export function buildSystemPreamble(d: LlmDirectives = loadDirectives()): string {
  const parts: string[] = [];
  if (d.agent.trim()) parts.push(`# Agente\n${d.agent.trim()}`);
  if (d.rules.trim()) parts.push(`# Rules (obrigatórias)\n${d.rules.trim()}`);
  return parts.join("\n\n");
}
