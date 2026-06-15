// Orquestração: o agente coordenador (lead) é responsável por acionar
// todas as skills/agentes ativos no projeto. Esta função gera um bloco
// de instruções que é anexado ao system prompt de qualquer LLM.

import { AGENTS, loadAgentsState, type AgentsState } from "./agents-catalog";
import { buildSystemPreamble, loadDirectives } from "./llm-directives";

export function buildOrchestrationBlock(state: AgentsState = loadAgentsState()): string {
  const lead = AGENTS.find(a => a.id === state.leadId);
  const active = AGENTS.filter(a => state.activeIds.includes(a.id) && a.id !== state.leadId);
  if (!lead) return "";

  const roster = active.map(a =>
    `- **${a.name}** (${a.category}) — ${a.description}\n  skills: ${a.skills.join(", ")}`
  ).join("\n");

  const allSkills = Array.from(new Set([lead, ...active].flatMap(a => a.skills)));

  return [
    `# Orquestração de agentes`,
    `Você opera como **${lead.name}** (coordenador). Sua função é planejar a tarefa,`,
    `decompor em subtarefas e **acionar todas as skills necessárias** delegando aos`,
    `agentes ativos abaixo — preferencialmente em paralelo quando independentes.`,
    ``,
    `## Equipe ativa`,
    roster || "_(nenhum agente auxiliar — execute todas as skills você mesmo)_",
    ``,
    `## Skills disponíveis no projeto`,
    allSkills.map(s => `- ${s}`).join("\n"),
    ``,
    `## Protocolo`,
    `1. Identifique quais skills são necessárias para a solicitação.`,
    `2. Para cada skill, escolha o agente mais adequado (ou execute você mesmo se for o único responsável).`,
    `3. Execute/coordene as etapas, consolidando os resultados em uma única resposta.`,
    `4. Sempre verifique o resultado antes de finalizar (testes, build, revisão).`,
  ].join("\n");
}

/** Preâmbulo completo: diretivas globais + orquestração de agentes. */
export function buildFullPreamble(): string {
  return [buildSystemPreamble(loadDirectives()), buildOrchestrationBlock()]
    .filter(Boolean)
    .join("\n\n");
}
