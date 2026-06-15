// Templates de prompt acessíveis por slash commands.

export interface PromptTemplate {
  slug: string;        // sem a barra
  label: string;
  description: string;
  /** Função que recebe o resto do input após o comando e devolve o prompt final. */
  apply: (rest: string) => string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    slug: "refatorar",
    label: "/refatorar",
    description: "Refatorar código mantendo o comportamento",
    apply: (r) => `Refatore o código a seguir mantendo o mesmo comportamento, melhorando legibilidade, nomes e separação de responsabilidades. Explique brevemente as mudanças.\n\n${r}`,
  },
  {
    slug: "explicar",
    label: "/explicar",
    description: "Explicar trecho passo a passo",
    apply: (r) => `Explique o que o seguinte trecho faz, passo a passo, em português, destacando pontos sutis e possíveis bugs.\n\n${r}`,
  },
  {
    slug: "testes",
    label: "/testes",
    description: "Gerar testes unitários",
    apply: (r) => `Gere testes unitários cobrindo casos felizes e de borda para o código abaixo. Use o framework idiomático da linguagem detectada.\n\n${r}`,
  },
  {
    slug: "traduzir",
    label: "/traduzir",
    description: "Traduzir para inglês",
    apply: (r) => `Traduza o conteúdo abaixo para inglês natural e idiomático, preservando termos técnicos.\n\n${r}`,
  },
  {
    slug: "revisar",
    label: "/revisar",
    description: "Revisar código (code review)",
    apply: (r) => `Faça um code review do trecho abaixo: aponte bugs, riscos de segurança, problemas de performance e melhorias de estilo.\n\n${r}`,
  },
];

export function matchTemplate(input: string): PromptTemplate | null {
  const m = input.match(/^\/(\w+)\b/);
  if (!m) return null;
  return PROMPT_TEMPLATES.find(t => t.slug === m[1].toLowerCase()) ?? null;
}

export function applyTemplate(input: string): string {
  const t = matchTemplate(input);
  if (!t) return input;
  const rest = input.replace(/^\/\w+\s*/, "");
  return t.apply(rest);
}
