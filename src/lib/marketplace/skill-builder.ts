// Skill Builder — Criação, edição e importação/exportação de skills customizadas.
// Persistência client-side via localStorage; evento "promptarchitect:skills-changed".

import { safeUUID } from "@/lib/utils";
import type { CustomSkill, PluginCategory, SkillTemplate } from "./types";

const SKILLS_KEY = "promptarchitect.marketplace.skills";
const SKILLS_EVENT = "promptarchitect:skills-changed";

const PLUGIN_CATEGORIES: PluginCategory[] = [
  "prompting",
  "agents",
  "mcp",
  "skills",
  "integrations",
  "workflows",
  "themes",
  "productivity",
];

/** Templates pré-prontos para o builder de skills. */
export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "analista-dados",
    name: "Analista de Dados",
    description: "Interpreta tabelas, métricas e séries temporais e gera insights acionáveis.",
    category: "skills",
    defaultContent: `## Papel
Você é um analista de dados sênior especializado em interpretar tabelas, métricas e séries temporais.

## Instruções
1. Receba os dados e identifique o tipo de análise necessária.
2. Calcule ou explique as métricas relevantes (média, mediana, tendência, outliers).
3. Destaque insights acionáveis e riscos.

## Formato de saída
- Resumo executivo (até 5 linhas)
- Principais métricas
- Insights e recomendações

## Restrições
- Não invente dados que não estejam na entrada.
- Cite a fonte de cada número.`,
  },
  {
    id: "revisor-contratos",
    name: "Revisor de Contratos",
    description: "Revisa cláusulas contratuais e aponta riscos jurídicos e ambiguidades.",
    category: "skills",
    defaultContent: `## Papel
Você é um revisor de contratos com foco em clareza, riscos e conformidade.

## Instruções
1. Leia o contrato e identifique cláusulas críticas.
2. Aponte ambiguidades, prazos e obrigações desequilibradas.
3. Sugira redações alternativas mais seguras.

## Formato de saída
- Resumo dos riscos encontrados
- Tabela com cláusula, risco e recomendação
- Redações sugeridas

## Restrições
- Não substitua aconselhamento jurídico formal.
- Sinalize quando faltar contexto para decidir.`,
  },
  {
    id: "gerador-testes",
    name: "Gerador de Testes",
    description: "Gera casos de teste unitários e de integração a partir de código ou requisitos.",
    category: "skills",
    defaultContent: `## Papel
Você é um engenheiro de testes que gera casos de teste claros e completos.

## Instruções
1. Analise o código ou requisito fornecido.
2. Cubra caminho feliz, casos de borda e falhas esperadas.
3. Priorize os cenários de maior risco.

## Formato de saída
- Lista de casos de teste (nome, entrada, saída esperada)
- Código de teste quando aplicável

## Restrições
- Não teste detalhes de implementação.
- Marque cenários que precisam de mock ou integração.`,
  },
  {
    id: "especialista-lgpd",
    name: "Especialista em LGPD",
    description: "Orienta sobre conformidade com a Lei 13.709/2018 e boas práticas de privacidade.",
    category: "skills",
    defaultContent: `## Papel
Você é especialista em LGPD (Lei 13.709/2018) e privacidade por design.

## Instruções
1. Identifique dados pessoais e sensíveis no contexto.
2. Avalie bases legais, finalidade e minimização.
3. Indique medidas técnicas e organizacionais necessárias.

## Formato de saída
- Classificação dos dados envolvidos
- Riscos e base legal aplicável
- Plano de adequação

## Restrições
- Não afirme conformidade sem evidências.
- Recomende revisão por um DPO para casos críticos.`,
  },
  {
    id: "agente-suporte",
    name: "Agente de Suporte",
    description: "Atende usuários com respostas empáticas, objetivas e orientadas a solução.",
    category: "agents",
    defaultContent: `## Papel
Você é um agente de suporte atencioso e orientado a solução.

## Instruções
1. Entenda o problema antes de responder.
2. Confirme o entendimento com o usuário.
3. Entregue passos claros ou encaminhe para o time correto.

## Formato de saída
- Saudação curta e empática
- Solução em passos numerados
- Próximos passos ou oferta de ajuda adicional

## Restrições
- Não prometa prazos que não pode cumprir.
- Escale casos sensíveis (dados, pagamentos, segurança).`,
  },
  {
    id: "prompt-vendas",
    name: "Prompt de Vendas Consultivas",
    description: "Estrutura abordagens de vendas consultivas com foco em valor e objeções.",
    category: "prompting",
    defaultContent: `## Papel
Você é um consultor de vendas consultivas B2B.

## Instruções
1. Identifique o perfil e as dores do cliente.
2. Estruture uma mensagem baseada em valor, não em features.
3. Prepare respostas para as objeções mais prováveis.

## Formato de saída
- Perfil do cliente e dores
- Mensagem principal de valor
- Objeções e contornos

## Restrições
- Não prometa resultados não comprovados.
- Mantenha tom consultivo, sem pressão.`,
  },
];

/** Carrega as skills customizadas do localStorage. */
function loadSkills(): CustomSkill[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SKILLS_KEY) ?? "[]") as CustomSkill[];
  } catch {
    return [];
  }
}

/** Persiste as skills e notifica os ouvintes. */
function persistSkills(skills: CustomSkill[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  window.dispatchEvent(new Event(SKILLS_EVENT));
}

/** Valida uma categoria vinda de entrada externa (ex.: importação). */
function normalizeCategory(value: string | undefined): PluginCategory {
  return PLUGIN_CATEGORIES.includes(value as PluginCategory)
    ? (value as PluginCategory)
    : "skills";
}

/** Remove aspas simples/duplas ao redor de um valor YAML. */
function stripQuotes(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\(["'])/g, "$1");
  }
  return v;
}

/** Converte uma string em valor YAML com aspas e escapes. */
function yamlString(value: string): string {
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
}

/** Converte um valor YAML de tags em array de strings. */
function parseTags(value: string): string[] {
  let inner = value.trim();
  if (inner.startsWith("[") && inner.endsWith("]")) inner = inner.slice(1, -1);
  if (!inner) return [];
  return inner
    .split(",")
    .map((t) => stripQuotes(t.trim()))
    .filter(Boolean);
}

/** Faz o parse de frontmatter YAML simples (--- ... ---) + corpo. */
function parseFrontmatter(markdown: string): { meta: Record<string, string>; body: string } {
  const match = markdown.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: markdown };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    meta[key] = value;
  }
  return { meta, body: match[2] };
}

/** Retorna os templates disponíveis. */
export function getSkillTemplates(): SkillTemplate[] {
  return SKILL_TEMPLATES.map((t) => ({ ...t }));
}

/** Cria uma skill customizada e persiste. */
export function createSkill(
  name: string,
  description: string,
  category: PluginCategory,
  content: string,
  author: string,
  tags: string[] = [],
): CustomSkill {
  const now = Date.now();
  const skill: CustomSkill = {
    id: safeUUID(),
    name: name.trim() || "Skill sem nome",
    description: description.trim(),
    category,
    version: "1.0.0",
    content,
    author: author.trim() || "Anônimo",
    tags: [...tags],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  };
  const all = loadSkills();
  all.unshift(skill);
  persistSkills(all);
  return skill;
}

/** Lista as skills, opcionalmente filtradas por categoria. */
export function listSkills(category?: PluginCategory): CustomSkill[] {
  const all = loadSkills();
  return category ? all.filter((s) => s.category === category) : all;
}

/** Retorna uma skill pelo id. */
export function getSkill(id: string): CustomSkill | null {
  return loadSkills().find((s) => s.id === id) ?? null;
}

/** Campos editáveis de uma skill. */
export type CustomSkillUpdate = Partial<
  Pick<
    CustomSkill,
    "name" | "description" | "category" | "version" | "content" | "author" | "tags" | "enabled"
  >
>;

/** Atualiza uma skill existente. */
export function updateSkill(id: string, partial: CustomSkillUpdate): CustomSkill | null {
  const all = loadSkills();
  const skill = all.find((s) => s.id === id);
  if (!skill) return null;
  Object.assign(skill, partial, { updatedAt: Date.now() });
  if (partial.tags) skill.tags = [...partial.tags];
  persistSkills(all);
  return skill;
}

/** Remove uma skill. Retorna true se foi removida. */
export function deleteSkill(id: string): boolean {
  const all = loadSkills();
  const filtered = all.filter((s) => s.id !== id);
  if (filtered.length === all.length) return false;
  persistSkills(filtered);
  return true;
}

/** Ativa/desativa uma skill. Retorna true se encontrada. */
export function toggleSkill(id: string, enabled: boolean): boolean {
  const all = loadSkills();
  const skill = all.find((s) => s.id === id);
  if (!skill) return false;
  skill.enabled = enabled;
  skill.updatedAt = Date.now();
  persistSkills(all);
  return true;
}

/** Incrementa o contador de uso de uma skill. */
export function incrementSkillUsage(id: string): void {
  const all = loadSkills();
  const skill = all.find((s) => s.id === id);
  if (!skill) return;
  skill.usageCount = (skill.usageCount || 0) + 1;
  persistSkills(all);
}

/** Gera o conteúdo SKILL.md (frontmatter YAML + corpo) de uma skill. */
export function buildSkillMarkdown(skill: CustomSkill): string {
  const tags = skill.tags.length
    ? skill.tags.map(yamlString).join(", ")
    : "";
  const frontmatter = [
    "---",
    `name: ${yamlString(skill.name)}`,
    `description: ${yamlString(skill.description)}`,
    `category: ${skill.category}`,
    `version: ${yamlString(skill.version)}`,
    `author: ${yamlString(skill.author)}`,
    `tags: [${tags}]`,
    "---",
  ].join("\n");
  return `${frontmatter}\n\n${skill.content.trim()}`;
}

/** Retorna o markdown completo para download (equivale ao SKILL.md). */
export function exportSkill(skill: CustomSkill): string {
  return buildSkillMarkdown(skill);
}

/** Importa um markdown SKILL.md e retorna uma nova skill (sem persistir). */
export function importSkill(markdown: string): CustomSkill {
  const { meta, body } = parseFrontmatter(markdown);
  const now = Date.now();
  return {
    id: safeUUID(),
    name: stripQuotes(meta["name"] ?? "").trim() || "Skill importada",
    description: stripQuotes(meta["description"] ?? "").trim(),
    category: normalizeCategory(meta["category"]),
    version: stripQuotes(meta["version"] ?? "1.0.0").trim() || "1.0.0",
    content: body.trim(),
    author: stripQuotes(meta["author"] ?? "").trim() || "Importado",
    tags: parseTags(meta["tags"] ?? ""),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  };
}

/** Assina mudanças nas skills (evento próprio + storage cross-tab). */
export function subscribeSkills(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(SKILLS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SKILLS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
