// Pipeline de orquestração multi-agente.
// Quando o usuário ativa o Orchestrator + outros agentes, executamos:
//   1. PLANO: o lead decide quais agentes ativos atacam quais sub-tarefas (JSON).
//   2. EXECUÇÃO: cada agente roda em paralelo com seu próprio system prompt.
//   3. CONSOLIDAÇÃO: o lead recebe todos os resultados e faz streaming da resposta final.
import {
  sendChat,
  sendChatStream,
  type ChatUsage,
  type ModelSelection,
  type WireMessage,
  type ContentPart,
} from "./llm-providers";
import { AGENTS, type AgentDefinition } from "./agents-catalog";

export interface OrchestrationResult {
  text: string;
  usage: ChatUsage;
}

function agentSystem(agent: AgentDefinition): string {
  return [
    `Você é "${agent.name}" — ${agent.description}`,
    `Categoria: ${agent.category}. Skills: ${agent.skills.join(", ")}.`,
    `Diretrizes obrigatórias de execução:`,
    `- Responda APENAS dentro do seu domínio de especialidade.`,
    `- Seja extremamente técnico, objetivo e direto ao ponto. Evite rodeios ou introduções vazias.`,
    `- Escreva sempre em pt-BR.`,
    `- Se gerar código ou instruções, siga as melhores práticas da categoria (clean-code, tratamento de erros, tipagem segura).`,
    `- Garanta a segurança e integridade das soluções propostas.`,
  ].join("\n");
}

function leadSystem(lead: AgentDefinition, team: AgentDefinition[]): string {
  const roster = team.map((a) => `- ${a.id} (${a.name}): ${a.description}`).join("\n");
  return [
    `Você é "${lead.name}", o líder e coordenador técnico do time de agentes. ${lead.description}`,
    `Seu papel principal é receber as contribuições individuais da equipe e sintetizá-las de forma unificada e profissional.`,
    `Equipe disponível:\n${roster}`,
    `Diretrizes de Consolidação:`,
    `- Crie uma resposta final única, integrada e coesa em pt-BR.`,
    `- NÃO liste as respostas dos agentes separadamente ou repetindo cabeçalhos por agente (ex: "O Frontend disse..."). Integre as ideias de forma natural.`,
    `- Garanta consistência técnica total e arquitetura homogênea na resposta final.`,
    `- Remova redundâncias e mantenha um tom de engenheiro sênior profissional.`,
  ].join("\n");
}

function addUsage(a: ChatUsage, b: ChatUsage): ChatUsage {
  return {
    prompt: a.prompt + b.prompt,
    completion: a.completion + b.completion,
    total: a.total + b.total,
  };
}

function userToText(c: string | ContentPart[]): string {
  if (typeof c === "string") return c;
  return c.map((p) => (p.type === "text" ? p.text : `[${p.type}]`)).join("\n");
}

interface PlanItem {
  agentId: string;
  task: string;
}

async function planAssignments(
  sel: ModelSelection,
  lead: AgentDefinition,
  helpers: AgentDefinition[],
  history: WireMessage[],
  userText: string,
  signal?: AbortSignal,
): Promise<{ plan: PlanItem[]; usage: ChatUsage }> {
  const sys = [
    `Você é ${lead.name}, o coordenador e planejador do time.`,
    `Analise a solicitação do usuário e decida quais agentes da equipe (helpers) devem trabalhar em paralelo nesta tarefa.`,
    `Equipe disponível (use APENAS estes IDs exatos):`,
    ...helpers.map((a) => `- ${a.id} (${a.name}): ${a.description}`),
    `Regras de planejamento:`,
    `- Delegue apenas para os agentes estritamente necessários para resolver a solicitação.`,
    `- Se a tarefa for simples ou puder ser resolvida diretamente por você, retorne uma lista de atribuições vazia.`,
    `- Cada sub-tarefa designada deve ser clara, específica e focar na especialidade do agente.`,
    `- Responda SOMENTE com um JSON válido no formato:`,
    `{"assignments":[{"agentId":"<id>","task":"<o que esse agente deve produzir>"}]}`,
  ].join("\n");
  const { text, usage } = await sendChat(
    sel,
    [...history, { role: "user", content: userText }],
    sys,
  );
  void signal;
  let plan: PlanItem[] = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : text) as { assignments?: PlanItem[] };
    const ids = new Set(helpers.map((h) => h.id));
    plan = (j.assignments ?? []).filter((a) => a.agentId && a.task && ids.has(a.agentId));
  } catch {
    /* fallback: plano vazio */
  }
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
  const lead = AGENTS.find((a) => a.id === leadId);
  let helpers = activeIds
    .filter((id) => id !== leadId)
    .map((id) => AGENTS.find((a) => a.id === id))
    .filter(Boolean) as AgentDefinition[];

  const isAutoOrchestration = helpers.length === 0 && !!lead?.coordinator;
  if (isAutoOrchestration) {
    helpers = AGENTS.filter((a) => a.id !== leadId);
  }

  // Modo simples: só o lead, sem orquestração
  if (!lead || helpers.length === 0) {
    const sys = lead ? agentSystem(lead) : undefined;
    return sendChatStream(sel, [...history, { role: "user", content: userContent }], onDelta, {
      system: sys,
      signal,
    });
  }

  const userText = userToText(userContent);
  let usage: ChatUsage = { prompt: 0, completion: 0, total: 0 };

  onPhase(`🧭 ${lead.name} planejando atribuições de forma autônoma…`);
  const { plan: rawPlan, usage: planUsage } = await planAssignments(
    sel,
    lead,
    helpers,
    history,
    userText,
    signal,
  );
  usage = addUsage(usage, planUsage);

  let plan = rawPlan;
  if (plan.length === 0 || (isAutoOrchestration && plan.length === helpers.length)) {
    onPhase(`🪄 ${lead.name} processando solicitação diretamente…`);
    const sys = agentSystem(lead);
    return sendChatStream(sel, [...history, { role: "user", content: userContent }], onDelta, {
      system: sys,
      signal,
    });
  }

  onPhase(
    `👥 Executando ${plan.length} agente(s) selecionado(s):\n${plan.map((p) => `  • ${AGENTS.find((a) => a.id === p.agentId)?.name}: ${p.task}`).join("\n")}`,
  );

  // Execução sequencial: vários provedores (ex.: DeepSeek) limitam conexões simultâneas por API key.
  const results: { agent: AgentDefinition; text: string; usage: ChatUsage }[] = [];
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const agent = AGENTS.find((a) => a.id === item.agentId)!;
    onPhase(`👥 (${i + 1}/${plan.length}) ${agent.name}: ${item.task}`);
    if (signal?.aborted) break;
    const { text, usage: u } = await sendChat(
      sel,
      [
        ...history,
        {
          role: "user",
          content: `Solicitação do usuário:\n${userText}\n\nSua sub-tarefa: ${item.task}`,
        },
      ],
      agentSystem(agent),
    );
    results.push({ agent, text, usage: u });
  }
  for (const r of results) usage = addUsage(usage, r.usage);

  onPhase(`🪄 ${lead.name} consolidando resultados…`);
  const consolidated = results
    .map((r) => `### Contribuição de ${r.agent.name}\n${r.text}`)
    .join("\n\n");
  const finalSys = leadSystem(lead, helpers);
  const finalMsgs: WireMessage[] = [
    ...history,
    { role: "user", content: userContent },
    {
      role: "assistant",
      content: `Contribuições paralelas da equipe (uso interno, não repita literalmente):\n\n${consolidated}`,
    },
    {
      role: "user",
      content:
        "Agora produza a resposta final consolidada para o usuário, integrando o melhor de cada contribuição.",
    },
  ];
  const { text, usage: finalUsage } = await sendChatStream(sel, finalMsgs, onDelta, {
    system: finalSys,
    signal,
  });
  usage = addUsage(usage, finalUsage);
  return { text, usage };
}
