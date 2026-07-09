// Templates de prompt para criação e otimização de prompts via slash commands.

export interface PromptTemplate {
  slug: string;
  label: string;
  description: string;
  apply: (rest: string) => string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    slug: "criar",
    label: "/criar",
    description: "Criar um prompt do zero para um caso de uso específico",
    apply: (r) =>
      `Você é o Prompt Architect. Crie um prompt completo e otimizado para o seguinte caso de uso:\n\n${r}\n\nO prompt deve incluir:\n1. Persona e contexto do assistente\n2. Instruções claras e específicas\n3. Formato de saída esperado\n4. Exemplos de input/output (few-shot se aplicável)\n5. Limitações e restrições\n6. Tratamento de casos extremos`,
  },
  {
    slug: "otimizar",
    label: "/otimizar",
    description: "Melhorar um prompt existente com técnicas avançadas",
    apply: (r) =>
      `Você é o Prompt Architect. Analise e otimize o seguinte prompt:\n\n${r || "[cole seu prompt aqui]"}\n\nFaça uma análise crítica identificando:\n- Ambiguidades e pontos vagos\n- Instruções conflitantes\n- Oportunidades de few-shot ou chain-of-thought\n- Melhorias de clareza e especificidade\n\nEntregue a versão otimizada com justificativa das mudanças.`,
  },
  {
    slug: "codigo",
    label: "/codigo",
    description: "Criar prompt especializado para tarefas de código",
    apply: (r) =>
      `Você é o Prompt Architect especializado em engenharia de prompts para código. Crie um prompt para o seguinte cenário:\n\n${r}\n\nO prompt deve:\n1. Especificar linguagem, framework e versão\n2. Definir padrões de código (naming, estrutura, comentários)\n3. Incluir requisitos de segurança e performance\n4. Instruir sobre tratamento de erros e edge cases\n5. Solicitar testes quando apropriado`,
  },
  {
    slug: "prd",
    label: "/prd",
    description: "Gerar PRD completo com requisitos e arquitetura",
    apply: (r) =>
      `Você é o Prompt Architect. Gere um PRD (Product Requirements Document) completo para:\n\n${r}\n\nEstrutura obrigatória:\n1. Visão Geral e Objetivos\n2. Personas e Jobs-to-be-Done\n3. Requisitos Funcionais (RF-001...)\n4. Requisitos Não-Funcionais (RNF-001...)\n5. Critérios de Aceitação (Given-When-Then)\n6. Mapeamento de Dados e LGPD/GDPR\n7. Arquitetura Proposta\n8. Roadmap (M1, M2, M3)`,
  },
  {
    slug: "refinar",
    label: "/refinar",
    description: "Refinar prompt com técnica Chain-of-Thought ou ReAct",
    apply: (r) =>
      `Você é o Prompt Architect. Reescreva o prompt abaixo aplicando a técnica Chain-of-Thought (CoT) e/ou ReAct para melhorar o raciocínio do modelo:\n\n${r || "[cole seu prompt aqui]"}\n\nIncorpore:\n- Instrução explícita para raciocinar passo a passo\n- Separação entre raciocínio e resposta final\n- Exemplos de like de thought para calibrar o modelo`,
  },
  {
    slug: "persona",
    label: "/persona",
    description: "Criar persona completa para um agente de IA",
    apply: (r) =>
      `Você é o Prompt Architect. Defina uma persona detalhada para um agente de IA:\n\n${r}\n\nA persona deve cobrir:\n1. Nome, papel e especialidade\n2. Tom de voz e estilo de comunicação\n3. Conhecimentos e capacidades\n4. Limitações e o que não deve fazer\n5. Como tratar ambiguidades\n6. Formato padrão de respostas\n7. Exemplos de interações ideais`,
  },
  {
    slug: "revisar",
    label: "/revisar",
    description: "Revisar prompt para segurança e eficácia",
    apply: (r) =>
      `Você é o Prompt Architect atuando como revisor crítico. Analise o seguinte prompt em busca de problemas:\n\n${r || "[cole seu prompt aqui]"}\n\nVerifique:\n- Vulnerabilidades a prompt injection\n- Inconsistências e contradições\n- Instruções que podem ser mal interpretadas\n- Ausência de restrições importantes\n- Conformidade ética e de segurança\n\nApresente problemas encontrados e sugestões de correção.`,
  },
  {
    slug: "traduzir",
    label: "/traduzir",
    description: "Traduzir prompt para inglês com qualidade técnica",
    apply: (r) =>
      `Você é um especialista em engenharia de prompts bilíngue. Traduza o seguinte prompt para inglês técnico e idiomático, preservando a intenção, nuances e terminologia especializada:\n\n${r}`,
  },
  {
    slug: "multiagente",
    label: "/multiagente",
    description: "Projetar arquitetura de prompts para sistemas multi-agente",
    apply: (r) =>
      `Você é o Prompt Architect especializado em sistemas multi-agente. Projete a arquitetura de prompts para:\n\n${r}\n\nDefina:\n1. Agentes necessários e seus papéis\n2. System prompt de cada agente\n3. Protocolo de comunicação entre agentes\n4. Agente orquestrador e regras de delegação\n5. Tratamento de conflitos e fallbacks\n6. Exemplo de fluxo completo`,
  },
];

export function matchTemplate(input: string): PromptTemplate | null {
  const m = input.match(/^\/(\w+)\b/);
  if (!m) return null;
  return PROMPT_TEMPLATES.find((t) => t.slug === m[1].toLowerCase()) ?? null;
}

export function applyTemplate(input: string): string {
  const t = matchTemplate(input);
  if (!t) return input;
  const rest = input.replace(/^\/\w+\s*/, "");
  return t.apply(rest);
}
