// Catálogo de agentes — otimizado para PromptArchitect
// Foco principal: engenharia de prompts, PRDs e arquitetura de IA

export type AgentCategory =
  | "orchestration"
  | "planning"
  | "prompting"
  | "frontend"
  | "backend"
  | "data"
  | "security"
  | "quality"
  | "devops"
  | "performance"
  | "mobile"
  | "game"
  | "seo"
  | "docs"
  | "research"
  | "administrative";

export interface AgentDefinition {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  skills: string[];
  triggers?: string[];
  coordinator?: boolean;
}

export const AGENT_CATEGORIES: Record<AgentCategory, { label: string; color: string }> = {
  orchestration: { label: "Orquestração", color: "from-fuchsia-500 to-purple-500" },
  planning: { label: "Planejamento", color: "from-sky-500 to-indigo-500" },
  prompting: { label: "Prompt Engineering", color: "from-violet-500 to-purple-600" },
  frontend: { label: "Frontend", color: "from-pink-500 to-rose-500" },
  backend: { label: "Backend", color: "from-emerald-500 to-teal-500" },
  data: { label: "Dados", color: "from-amber-500 to-orange-500" },
  security: { label: "Segurança", color: "from-red-500 to-rose-600" },
  quality: { label: "Qualidade", color: "from-lime-500 to-emerald-500" },
  devops: { label: "DevOps", color: "from-cyan-500 to-blue-500" },
  performance: { label: "Performance", color: "from-yellow-500 to-amber-500" },
  mobile: { label: "Mobile", color: "from-violet-500 to-fuchsia-500" },
  game: { label: "Games", color: "from-purple-500 to-pink-500" },
  seo: { label: "SEO/GEO", color: "from-teal-500 to-cyan-500" },
  docs: { label: "Documentação", color: "from-slate-500 to-zinc-500" },
  research: { label: "Pesquisa", color: "from-indigo-500 to-blue-500" },
  administrative: { label: "Administrativo", color: "from-blue-500 to-sky-600" },
};

export const AGENTS: AgentDefinition[] = [
  // ── Prompt Engineering (foco principal) ──────────────────────────────────────
  {
    id: "prompt-architect",
    name: "Prompt Architect",
    category: "prompting",
    coordinator: true,
    description:
      "Especialista principal em engenharia de prompts. Transforma ideias em prompts precisos, PRDs executáveis e system prompts otimizados para LLMs. Domina Chain-of-Thought, few-shot, ReAct e técnicas avançadas de alinhamento.",
    skills: ["prompt-engineering", "clean-code", "plan-writing", "brainstorming", "privacy-by-design", "data-mapping"],
    triggers: ["prompt", "prd", "requisitos", "system prompt", "instrução", "agente", "llm"],
  },
  {
    id: "prompt-optimizer",
    name: "Prompt Optimizer",
    category: "prompting",
    description:
      "Especialista em otimização e avaliação de prompts. Analisa, refina e testa prompts para maximizar clareza, precisão e alinhamento. Aplica técnicas de prompt compression, structured outputs e meta-prompting.",
    skills: ["prompt-engineering", "code-review-checklist", "systematic-debugging"],
    triggers: ["otimizar", "melhorar prompt", "refinar", "avaliar prompt", "debug prompt"],
  },
  {
    id: "chain-of-thought-expert",
    name: "CoT & Reasoning Expert",
    category: "prompting",
    description:
      "Especialista em técnicas de raciocínio para LLMs: Chain-of-Thought (CoT), Tree-of-Thought (ToT), ReAct, Self-Consistency e raciocínio step-by-step. Cria prompts que induzem raciocínio profundo e respostas verificáveis.",
    skills: ["prompt-engineering", "plan-writing"],
    triggers: ["chain of thought", "cot", "raciocínio", "step by step", "tot", "react"],
  },
  {
    id: "multiagent-designer",
    name: "Multi-Agent Designer",
    category: "prompting",
    coordinator: true,
    description:
      "Projetista de arquiteturas multi-agente. Define papéis, protocolos de comunicação e system prompts para sistemas complexos com múltiplos agentes de IA cooperando. Especialista em orquestração, handoffs e prevenção de loops.",
    skills: ["prompt-engineering", "parallel-agents", "architecture", "plan-writing"],
    triggers: ["multi-agente", "multiagente", "orquestração", "agentes cooperativos", "pipeline de agentes"],
  },
  {
    id: "persona-designer",
    name: "Persona Designer",
    category: "prompting",
    description:
      "Cria personas detalhadas e consistentes para agentes de IA. Define voz, tom, limitações, comportamentos e regras de alinhamento. Especialista em roleplay prompting, caracterização e guardrails de segurança.",
    skills: ["prompt-engineering", "behavioral-modes", "documentation-templates"],
    triggers: ["persona", "personagem", "voz", "tom", "guardrails", "alinhamento"],
  },
  {
    id: "rag-specialist",
    name: "RAG Specialist",
    category: "prompting",
    description:
      "Especialista em Retrieval-Augmented Generation. Projeta prompts otimizados para sistemas RAG, grounding de contexto, citação de fontes e minimização de alucinações. Conhece chunking, embedding e query reformulation.",
    skills: ["prompt-engineering", "database-design", "api-patterns"],
    triggers: ["rag", "retrieval", "contexto", "alucinação", "embedding", "grounding"],
  },

  // ── Orchestration ──────────────────────────────────────────────────────────
  {
    id: "orchestrator",
    name: "Orchestrator",
    category: "orchestration",
    coordinator: true,
    description:
      "Coordena múltiplos agentes em paralelo. Sintetiza resultados de segurança, backend, frontend, testes e DevOps em uma solução coesa. Ideal para tarefas complexas multi-domínio.",
    skills: ["parallel-agents", "coordinator-mode", "plan-writing", "architecture", "verify-changes"],
    triggers: ["coordenar", "orquestrar", "tarefa complexa", "multi-domínio"],
  },
  {
    id: "fullstack-architect",
    name: "Fullstack Architect",
    category: "orchestration",
    coordinator: true,
    description:
      "Define arquitetura fullstack ponta-a-ponta: linguagem, framework, banco, autenticação, deploy e observabilidade. Pensa em sistemas coesos e escaláveis.",
    skills: ["architecture", "plan-writing", "database-design", "api-patterns"],
    triggers: ["fullstack", "arquitetura", "stack", "sistema"],
  },

  // ── Planning ──────────────────────────────────────────────────────────────
  {
    id: "project-planner",
    name: "Project Planner",
    category: "planning",
    description:
      "Quebra solicitações em tarefas acionáveis, define estrutura de arquivos e grafo de dependências. Cria roadmaps detalhados e PLANs executáveis.",
    skills: ["app-builder", "plan-writing", "brainstorming"],
    triggers: ["plano", "roadmap", "tarefas", "milestone"],
  },
  {
    id: "product-owner",
    name: "Product Owner",
    category: "planning",
    description:
      "Ponte entre negócio e execução. Elicita requisitos com profundidade, prioriza backlog com MoSCoW e define critérios de MVP precisos.",
    skills: ["plan-writing", "brainstorming"],
    triggers: ["backlog", "mvp", "priorização", "user story"],
  },
  {
    id: "product-manager",
    name: "Product Manager",
    category: "planning",
    description:
      "Define requisitos, user stories e critérios de aceitação detalhados. Clarifica ambiguidade, mapeia stakeholders e prioriza entregas de alto impacto.",
    skills: ["plan-writing", "brainstorming"],
    triggers: ["requisitos", "aceitação", "stakeholders"],
  },

  // ── Frontend ──────────────────────────────────────────────────────────────
  {
    id: "frontend-specialist",
    name: "Frontend Specialist",
    category: "frontend",
    description:
      "Arquiteto React/Next.js com foco em performance e manutenibilidade. UI/UX, estado, responsividade, Tailwind CSS e acessibilidade WCAG.",
    skills: ["nextjs-react-expert", "tailwind-patterns", "frontend-design", "web-design-guidelines"],
    triggers: ["react", "component", "ui", "css", "tailwind", "next.js"],
  },
  {
    id: "vue-specialist",
    name: "Vue Specialist",
    category: "frontend",
    description: "Especialista em Vue 3, Nuxt 3, Composition API, Pinia, Vite e SSR/SSG.",
    skills: ["vue3-patterns", "nuxt-patterns", "pinia-state", "frontend-design"],
    triggers: ["vue", "nuxt", "pinia"],
  },
  {
    id: "typescript-specialist",
    name: "TypeScript Specialist",
    category: "frontend",
    description:
      "Tipagem avançada, generics, inferência, monorepos e DX. Garante segurança de tipos em frontend e backend.",
    skills: ["typescript-advanced", "monorepo-patterns", "code-review-checklist"],
    triggers: ["typescript", "types", "generics"],
  },

  // ── Backend ───────────────────────────────────────────────────────────────
  {
    id: "backend-specialist",
    name: "Backend Specialist",
    category: "backend",
    description:
      "Arquiteto backend Node.js, Python e serverless. APIs REST e GraphQL, lógica server-side, integrações e filas.",
    skills: ["nodejs-best-practices", "python-patterns", "api-patterns", "database-design"],
    triggers: ["backend", "api", "endpoint", "server", "node", "python"],
  },
  {
    id: "php-specialist",
    name: "PHP Specialist",
    category: "backend",
    description:
      "PHP moderno (8+), Laravel, Symfony e Slim. APIs REST, Eloquent/Doctrine, filas e Composer.",
    skills: ["php-modern", "laravel-patterns", "symfony-patterns", "api-patterns"],
    triggers: ["php", "laravel", "symfony", "composer"],
  },

  // ── Data ──────────────────────────────────────────────────────────────────
  {
    id: "database-architect",
    name: "Database Architect",
    category: "data",
    description:
      "Modelagem, queries, migrações e otimização. Bancos relacionais, NoSQL e serverless modernos.",
    skills: ["database-design"],
    triggers: ["schema", "sql", "migration", "postgres", "index", "mongodb"],
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    id: "security-auditor",
    name: "Security Auditor",
    category: "security",
    description:
      "Especialista OWASP 2025, supply chain e zero trust. Pensa como atacante, defende como arquiteto sênior.",
    skills: ["vulnerability-scanner", "red-team-tactics", "api-patterns"],
    triggers: ["security", "owasp", "xss", "injection", "vulnerabilidade"],
  },
  {
    id: "lgpd-compliance",
    name: "LGPD & Compliance",
    category: "security",
    description:
      "Conformidade LGPD (Lei 13.709/2018), GDPR e Privacy by Design. Bases legais, minimização, criptografia, direitos do titular e DPIA.",
    skills: ["privacy-by-design", "data-mapping", "vulnerability-scanner"],
    triggers: ["lgpd", "gdpr", "privacidade", "compliance", "dpo", "dados pessoais"],
  },
  {
    id: "penetration-tester",
    name: "Penetration Tester",
    category: "security",
    description: "Operações ofensivas: pentest, red team e exploração controlada de vulnerabilidades.",
    skills: ["vulnerability-scanner", "red-team-tactics"],
    triggers: ["pentest", "exploit", "redteam"],
  },

  // ── Quality ───────────────────────────────────────────────────────────────
  {
    id: "test-engineer",
    name: "Test Engineer",
    category: "quality",
    description:
      "TDD, cobertura e automação. Testes unitários, integração e e2e com Jest, Pytest e Playwright.",
    skills: ["testing-patterns", "tdd-workflow", "webapp-testing", "code-review-checklist"],
    triggers: ["teste", "tdd", "jest", "playwright", "cobertura"],
  },
  {
    id: "qa-automation-engineer",
    name: "QA Automation",
    category: "quality",
    description: "E2E com Playwright/Cypress, pipelines CI e estratégias de regressão.",
    skills: ["webapp-testing", "testing-patterns"],
  },
  {
    id: "debugger",
    name: "Debugger",
    category: "quality",
    description: "Debug sistemático, RCA e investigação de crashes. Problemas complexos e bugs em produção.",
    skills: ["systematic-debugging"],
    triggers: ["bug", "error", "crash", "fix", "broken"],
  },
  {
    id: "clean-code-reviewer",
    name: "Clean Code Reviewer",
    category: "quality",
    description:
      "Clean Code, SOLID e DDD. Revisa nomes, coesão, acoplamento, duplicação e cobertura de testes.",
    skills: ["clean-code", "solid-principles", "code-review-checklist", "simplify-code"],
    triggers: ["clean code", "refactor", "solid", "review", "refatorar"],
  },

  // ── DevOps ────────────────────────────────────────────────────────────────
  {
    id: "devops-engineer",
    name: "DevOps Engineer",
    category: "devops",
    description:
      "Deploy, CI/CD, servidores e operações. Release, rollback e PM2. Operações de alto risco — solicita confirmação antes de executar.",
    skills: ["deployment-procedures", "server-management"],
    triggers: ["deploy", "production", "ci/cd", "rollback", "docker"],
  },

  // ── Performance ───────────────────────────────────────────────────────────
  {
    id: "performance-optimizer",
    name: "Performance Optimizer",
    category: "performance",
    description: "Core Web Vitals, bundle, profiling e runtime. Otimiza FCP, LCP, CLS e TTI.",
    skills: ["performance-profiling"],
    triggers: ["performance", "optimize", "slow", "lighthouse", "vitals"],
  },

  // ── Mobile ────────────────────────────────────────────────────────────────
  {
    id: "mobile-developer",
    name: "Mobile Developer",
    category: "mobile",
    description: "React Native e Flutter. Apps cross-platform, features nativas e padrões mobile-first.",
    skills: ["mobile-design"],
    triggers: ["mobile", "react native", "flutter", "ios", "android"],
  },

  // ── Game ──────────────────────────────────────────────────────────────────
  {
    id: "game-developer",
    name: "Game Developer",
    category: "game",
    description: "Games em Unity, Godot, Unreal, Phaser e Three.js. Mecânicas, física, multiplayer e 2D/3D.",
    skills: ["game-development"],
    triggers: ["game", "unity", "godot", "unreal", "phaser"],
  },

  // ── SEO ───────────────────────────────────────────────────────────────────
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    category: "seo",
    description:
      "SEO e GEO (Generative Engine Optimization). Auditorias, Core Web Vitals, E-E-A-T e citações em IA generativa.",
    skills: ["seo-fundamentals", "geo-fundamentals"],
    triggers: ["seo", "geo", "ranking", "metatags", "schema.org"],
  },

  // ── Docs ──────────────────────────────────────────────────────────────────
  {
    id: "documentation-writer",
    name: "Documentation Writer",
    category: "docs",
    description: "README, API docs, changelog e guias técnicos sob demanda. Escrita clara, estruturada e útil.",
    skills: ["documentation-templates"],
    triggers: ["docs", "readme", "documentação", "changelog"],
  },

  // ── Research ──────────────────────────────────────────────────────────────
  {
    id: "explorer-agent",
    name: "Explorer",
    category: "research",
    description: "Descoberta de codebase, análise arquitetural profunda e pesquisa proativa de padrões.",
    skills: ["architecture", "plan-writing", "systematic-debugging"],
    triggers: ["explorar", "analisar", "descobrir", "mapear codebase"],
  },
  {
    id: "code-archaeologist",
    name: "Code Archaeologist",
    category: "research",
    description: "Código legado, refatoração e engenharia reversa de sistemas não documentados.",
    skills: ["simplify-code", "code-review-checklist"],
    triggers: ["legado", "legacy", "engenharia reversa", "undocumented"],
  },

  // ── Administrative ────────────────────────────────────────────────────────
  {
    id: "edu-executive-assistant",
    name: "Edu — Assistente Executivo",
    category: "administrative",
    description:
      "Assistente Executivo especializado em documentos administrativos e licitações públicas (Lei 14.133/2021). Redige DFD, ETP, Termo de Referência, Mapa de Risco, Pareceres Técnicos, Memorandos, Atas e gestão de contratos com linguagem jurídico-administrativa precisa.",
    skills: ["documentation-templates", "plan-writing", "brainstorming"],
    triggers: [
      "dfd", "etp", "termo de referência", "mapa de risco", "parecer", "memorando",
      "licitação", "contrato", "administrativo", "documento", "ata", "edital",
      "compras públicas", "pc", "demanda", "formalização",
    ],
  },
];

const STORAGE_KEY = "omniforge.agents.active";

export interface AgentsState {
  leadId: string | null;
  activeIds: string[];
}

export function loadAgentsState(): AgentsState {
  if (typeof window === "undefined") return { leadId: "prompt-architect", activeIds: ["prompt-architect"] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { leadId: "prompt-architect", activeIds: ["prompt-architect"] };
    return JSON.parse(raw) as AgentsState;
  } catch {
    return { leadId: "prompt-architect", activeIds: ["prompt-architect"] };
  }
}

export function saveAgentsState(state: AgentsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
