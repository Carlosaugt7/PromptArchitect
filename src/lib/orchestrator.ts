// Pipeline de orquestração multi-agente.
// Quando o usuário ativa o Orchestrator + outros agentes, executamos:
//   1. PLANO: o lead decide quais agentes ativos atacam quais sub-tarefas (JSON).
//   2. EXECUÇÃO: cada agente roda em paralelo com seu próprio system prompt.
//   3. CONSOLIDAÇÃO: o lead recebe todos os resultados e faz streaming da resposta final.
import { sendChat, sendChatStream, type ChatUsage, type ModelSelection, type WireMessage, type ContentPart } from "./llm-providers";
import { AGENTS, type AgentDefinition } from "./agents-catalog";

export interface OrchestrationResult { text: string; usage: ChatUsage }

function agentSystem(agent: AgentDefinition): string {
  return [
    `Você é "${agent.name}" — ${agent.description}`,
    `Categoria: ${agent.category}. Skills: ${agent.skills.join(", ")}.`,
    `Responda APENAS dentro do seu domínio, em pt-BR, de forma objetiva e técnica.`,
  ].join("\n");
}

function leadSystem(lead: AgentDefinition, team: AgentDefinition[]): string {
  const roster = team.map(a => `- ${a.id} (${a.name}): ${a.description}`).join("\n");
  return [
    `Você é "${lead.name}", coordenador multi-agente. ${lead.description}`,
    `Equipe disponível:\n${roster}`,
    `Sintetize as contribuições da equipe em UMA resposta final, em pt-BR, sem repetir cabeçalhos por agente — integre o conteúdo.`,
  ].join("\n");
}

function addUsage(a: ChatUsage, b: ChatUsage): ChatUsage {
  return { prompt: a.prompt + b.prompt, completion: a.completion + b.completion, total: a.total + b.total };
}

function userToText(c: string | ContentPart[]): string {
  if (typeof c === "string") return c;
  return c.map(p => p.type === "text" ? p.text : `[${p.type}]`).join("\n");
}

interface PlanItem { agentId: string; task: string }

async function planAssignments(
  sel: ModelSelection, lead: AgentDefinition, helpers: AgentDefinition[],
  history: WireMessage[], userText: string, signal?: AbortSignal,
): Promise<{ plan: PlanItem[]; usage: ChatUsage }> {
  const sys = [
    `Você é ${lead.name}, planejador. Decida quais agentes da equipe devem trabalhar em paralelo nesta solicitação.`,
    `Equipe (use somente estes IDs):`,
    ...helpers.map(a => `- ${a.id}: ${a.description}`),
    `Responda SOMENTE com JSON válido no formato:`,
    `{"assignments":[{"agentId":"<id>","task":"<o que esse agente deve produzir>"}]}`,
    `Inclua apenas agentes realmente úteis. Tarefas curtas e específicas.`,
  ].join("\n");
  const { text, usage } = await sendChat(sel, [...history, { role: "user", content: userText }], sys);
  void signal;
  let plan: PlanItem[] = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : text) as { assignments?: PlanItem[] };
    const ids = new Set(helpers.map(h => h.id));
    plan = (j.assignments ?? []).filter(a => a.agentId && a.task && ids.has(a.agentId));
  } catch { /* fallback: cada helper recebe a task original */ }
  if (plan.length === 0) plan = helpers.map(h => ({ agentId: h.id, task: userText }));
  return { plan, usage };
}

export async function runOrchestration(
  sel: ModelSelection,
  history: WireMessage[],
  userContent: string | ContentPart[],
  activeIds: string[],
  leadId: string,
  onPhase: (label: string) => void,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<OrchestrationResult> {
  const lead = AGENTS.find(a => a.id === leadId);
  const helpers = activeIds.filter(id => id !== leadId).map(id => AGENTS.find(a => a.id === id)).filter(Boolean) as AgentDefinition[];

  // Modo simples: só o lead, sem orquestração
  if (!lead || helpers.length === 0) {
    const sys = lead ? agentSystem(lead) : undefined;
    return sendChatStream(sel, [...history, { role: "user", content: userContent }], onDelta, { system: sys, signal });
  }

  const userText = userToText(userContent);
  let usage: ChatUsage = { prompt: 0, completion: 0, total: 0 };

  onPhase(`🧭 ${lead.name} planejando atribuições…`);
  const { plan, usage: planUsage } = await planAssignments(sel, lead, helpers, history, userText, signal);
  usage = addUsage(usage, planUsage);

  onPhase(`👥 Executando ${plan.length} agente(s) em paralelo:\n${plan.map(p => `  • ${AGENTS.find(a => a.id === p.agentId)?.name}: ${p.task}`).join("\n")}`);

  const results = await Promise.all(plan.map(async (item) => {
    const agent = AGENTS.find(a => a.id === item.agentId)!;
    const { text, usage: u } = await sendChat(sel, [
      ...history,
      { role: "user", content: `Solicitação do usuário:\n${userText}\n\nSua sub-tarefa: ${item.task}` },
    ], agentSystem(agent));
    return { agent, text, usage: u };
  }));
  for (const r of results) usage = addUsage(usage, r.usage);

  onPhase(`🪄 ${lead.name} consolidando resultados…`);
  const consolidated = results.map(r => `### Contribuição de ${r.agent.name}\n${r.text}`).join("\n\n");
  const finalSys = leadSystem(lead, helpers);
  const finalMsgs: WireMessage[] = [
    ...history,
    { role: "user", content: userContent },
    { role: "assistant", content: `Contribuições paralelas da equipe (uso interno, não repita literalmente):\n\n${consolidated}` },
    { role: "user", content: "Agora produza a resposta final consolidada para o usuário, integrando o melhor de cada contribuição." },
  ];
  const { text, usage: finalUsage } = await sendChatStream(sel, finalMsgs, onDelta, { system: finalSys, signal });
  usage = addUsage(usage, finalUsage);
  return { text, usage };
}
