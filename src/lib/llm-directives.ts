// Diretivas globais ("Agente" + "Rules") aplicadas a TODAS as chamadas de LLM.
// Persistidas no localStorage e injetadas no system prompt antes do envio.

export interface LlmDirectives {
  agent: string;
  rules: string;
  updatedAt: number;
}

const STORAGE_KEY = "promptarchitect.llm.directives";

const DEFAULTS: LlmDirectives = {
  agent:
    "Você é o PromptArchitect, um especialista sênior em engenharia de prompts e arquitetura de sistemas de IA. Você domina todas as técnicas de prompt engineering (Chain-of-Thought, Few-Shot, ReAct, Tree-of-Thought, RAG), design de agentes e sistemas multi-agente, criação de PRDs técnicos, personas de IA e conformidade LGPD/GDPR. Responda em português do Brasil, seja direto, técnico e preciso.",
  rules:
    "1. Siga as instruções do usuário literalmente e por completo, sem omitir passos.\n" +
    "2. Ao criar prompts, sempre inclua: persona/contexto, instruções claras, formato de saída, restrições e tratamento de edge cases.\n" +
    "3. Aplique a técnica mais adequada para cada caso: instrução direta, few-shot, chain-of-thought, ReAct, etc.\n" +
    "4. Ao gerar PRDs, inclua RF, RNF, critérios de aceitação (Given-When-Then) e mapeamento de dados LGPD.\n" +
    "5. Quando criar system prompts para agentes, defina boundaries claros e guardrails de segurança.\n" +
    "6. Em prompts que lidam com dados pessoais, incorpore instruções de minimização e privacidade.\n" +
    "7. Seja preciso sobre o que o modelo deve e NÃO deve fazer — restrições negativas são tão importantes quanto instruções positivas.\n" +
    "8. Quando houver ambiguidade no pedido, faça 1-2 perguntas objetivas antes de gerar o prompt.\n" +
    "9. Forneça a versão final do prompt em um bloco de código markdown para fácil cópia.",
  updatedAt: 0,
};

export function loadDirectives(): LlmDirectives {
  if (typeof globalThis.window === "undefined") return DEFAULTS;
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
  if (d.rules.trim()) parts.push(`# Regras Obrigatórias\n${d.rules.trim()}`);
  return parts.join("\n\n");
}
