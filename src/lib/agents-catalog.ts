// Catálogo de agentes pré-configurados, adaptado de
// https://github.com/vudovn/antigravity-kit (.agents/agent/*)
// Cada agente possui domínio, descrição e skills. O Orchestrator
// é responsável por coordenar os demais agentes em paralelo.

export type AgentCategory =
  | "orchestration"
  | "planning"
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
  | "research";

export interface AgentDefinition {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  skills: string[];
  triggers?: string[];
  /** quando true, o agente pode invocar/coordenar outros */
  coordinator?: boolean;
}

export const AGENT_CATEGORIES: Record<AgentCategory, { label: string; color: string }> = {
  orchestration: { label: "Orquestração", color: "from-fuchsia-500 to-purple-500" },
  planning:      { label: "Planejamento", color: "from-sky-500 to-indigo-500" },
  frontend:      { label: "Frontend",     color: "from-pink-500 to-rose-500" },
  backend:       { label: "Backend",      color: "from-emerald-500 to-teal-500" },
  data:          { label: "Dados",        color: "from-amber-500 to-orange-500" },
  security:      { label: "Segurança",    color: "from-red-500 to-rose-600" },
  quality:       { label: "Qualidade",    color: "from-lime-500 to-emerald-500" },
  devops:        { label: "DevOps",       color: "from-cyan-500 to-blue-500" },
  performance:   { label: "Performance",  color: "from-yellow-500 to-amber-500" },
  mobile:        { label: "Mobile",       color: "from-violet-500 to-fuchsia-500" },
  game:          { label: "Games",        color: "from-purple-500 to-pink-500" },
  seo:           { label: "SEO/GEO",      color: "from-teal-500 to-cyan-500" },
  docs:          { label: "Documentação", color: "from-slate-500 to-zinc-500" },
  research:      { label: "Pesquisa",     color: "from-indigo-500 to-blue-500" },
};

export const AGENTS: AgentDefinition[] = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    category: "orchestration",
    coordinator: true,
    description:
      "Coordena múltiplos agentes em paralelo. Sintetiza resultados de segurança, backend, frontend, testes e DevOps em uma única solução.",
    skills: ["parallel-agents", "coordinator-mode", "plan-writing", "architecture", "verify-changes"],
    triggers: ["coordenar", "orquestrar", "tarefa complexa", "multi-domínio"],
  },
  {
    id: "project-planner",
    name: "Project Planner",
    category: "planning",
    description:
      "Quebra solicitações em tarefas, define estrutura de arquivos e grafo de dependências; decide qual agente executa o quê.",
    skills: ["app-builder", "plan-writing", "brainstorming"],
  },
  {
    id: "product-owner",
    name: "Product Owner",
    category: "planning",
    description:
      "Ponte entre negócio e execução. Elicita requisitos, prioriza backlog e define MVP/PRD.",
    skills: ["plan-writing", "brainstorming"],
  },
  {
    id: "product-manager",
    name: "Product Manager",
    category: "planning",
    description:
      "Define requisitos, user stories e critérios de aceitação. Clarifica ambiguidade e prioriza entregas.",
    skills: ["plan-writing", "brainstorming"],
  },
  {
    id: "frontend-specialist",
    name: "Frontend Specialist",
    category: "frontend",
    description:
      "Arquiteto React/Next.js com foco em performance e manutenibilidade. UI, estado, responsivo, Tailwind.",
    skills: ["nextjs-react-expert", "tailwind-patterns", "frontend-design", "web-design-guidelines"],
    triggers: ["component", "react", "ui", "css", "tailwind", "responsive"],
  },
  {
    id: "backend-specialist",
    name: "Backend Specialist",
    category: "backend",
    description:
      "Arquiteto backend para Node.js, Python e sistemas serverless/edge. APIs, lógica server-side e integração.",
    skills: ["nodejs-best-practices", "python-patterns", "api-patterns", "database-design"],
    triggers: ["backend", "api", "endpoint", "server", "auth"],
  },
  {
    id: "database-architect",
    name: "Database Architect",
    category: "data",
    description:
      "Modelagem, queries, migrações e otimização. Inclui bancos serverless modernos e indexação.",
    skills: ["database-design"],
    triggers: ["schema", "sql", "migration", "postgres", "index"],
  },
  {
    id: "security-auditor",
    name: "Security Auditor",
    category: "security",
    description:
      "Especialista em OWASP 2025, supply chain e zero trust. Pensa como atacante, defende como expert.",
    skills: ["vulnerability-scanner", "red-team-tactics", "api-patterns"],
    triggers: ["security", "owasp", "xss", "injection", "auth"],
  },
  {
    id: "penetration-tester",
    name: "Penetration Tester",
    category: "security",
    description:
      "Operações ofensivas: pentest, red team e exploração de vulnerabilidades.",
    skills: ["vulnerability-scanner", "red-team-tactics"],
    triggers: ["pentest", "exploit", "attack", "redteam"],
  },
  {
    id: "test-engineer",
    name: "Test Engineer",
    category: "quality",
    description:
      "TDD, cobertura e automação. Escreve testes unitários, integração e e2e (Jest, Pytest, Playwright).",
    skills: ["testing-patterns", "tdd-workflow", "webapp-testing", "code-review-checklist"],
  },
  {
    id: "qa-automation-engineer",
    name: "QA Automation",
    category: "quality",
    description:
      "Infra de testes e E2E com Playwright/Cypress, pipelines CI e regressão.",
    skills: ["webapp-testing", "testing-patterns"],
  },
  {
    id: "debugger",
    name: "Debugger",
    category: "quality",
    description:
      "Debug sistemático, RCA e investigação de crashes. Bugs complexos e problemas em produção.",
    skills: ["systematic-debugging"],
    triggers: ["bug", "error", "crash", "broken", "fix"],
  },
  {
    id: "devops-engineer",
    name: "DevOps Engineer",
    category: "devops",
    description:
      "Deploy, CI/CD, servidores e operações. Operações de alto risco — release, rollback e PM2.",
    skills: ["deployment-procedures", "server-management"],
    triggers: ["deploy", "production", "ci/cd", "rollback"],
  },
  {
    id: "performance-optimizer",
    name: "Performance Optimizer",
    category: "performance",
    description:
      "Otimização de Core Web Vitals, bundle, profiling e runtime.",
    skills: ["performance-profiling"],
    triggers: ["performance", "optimize", "slow", "lighthouse"],
  },
  {
    id: "mobile-developer",
    name: "Mobile Developer",
    category: "mobile",
    description:
      "React Native e Flutter. Apps cross-platform, features nativas e padrões mobile.",
    skills: ["mobile-design"],
    triggers: ["mobile", "react native", "flutter", "ios", "android"],
  },
  {
    id: "game-developer",
    name: "Game Developer",
    category: "game",
    description:
      "Games em Unity, Godot, Unreal, Phaser e Three.js. Mecânicas, multiplayer, 2D/3D.",
    skills: ["game-development"],
  },
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    category: "seo",
    description:
      "SEO e GEO (Generative Engine Optimization). Auditorias, Core Web Vitals, E-E-A-T e citações em IA.",
    skills: ["seo-fundamentals", "geo-fundamentals"],
  },
  {
    id: "documentation-writer",
    name: "Documentation Writer",
    category: "docs",
    description:
      "Documentação técnica sob demanda: README, API docs, changelog.",
    skills: ["documentation-templates"],
  },
  {
    id: "explorer-agent",
    name: "Explorer",
    category: "research",
    description:
      "Descoberta de codebase, análise arquitetural profunda e pesquisa proativa.",
    skills: ["architecture", "plan-writing", "systematic-debugging"],
  },
  {
    id: "php-specialist",
    name: "PHP Specialist",
    category: "backend",
    description:
      "Especialista em PHP moderno (8+), Laravel, Symfony e Slim. APIs REST, Eloquent/Doctrine, filas e Composer.",
    skills: ["php-modern", "laravel-patterns", "symfony-patterns", "api-patterns"],
    triggers: ["php", "laravel", "symfony", "composer"],
  },
  {
    id: "vue-specialist",
    name: "Vue Specialist",
    category: "frontend",
    description:
      "Especialista em Vue 3, Nuxt 3, Composition API, Pinia, Vite e SSR/SSG.",
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
  {
    id: "fullstack-architect",
    name: "Fullstack Architect",
    category: "orchestration",
    coordinator: true,
    description:
      "Define arquitetura fullstack ponta-a-ponta: escolha de linguagem, framework, banco, autenticação, deploy e observabilidade.",
    skills: ["architecture", "plan-writing", "database-design", "api-patterns"],
    triggers: ["fullstack", "arquitetura", "stack"],
  },
  {
    id: "lgpd-compliance",
    name: "LGPD & Compliance",
    category: "security",
    description:
      "Garante conformidade com LGPD (Lei 13.709/2018), GDPR e boas práticas de privacidade: bases legais, minimização, criptografia, direitos do titular e DPIA.",
    skills: ["privacy-by-design", "data-mapping", "vulnerability-scanner"],
    triggers: ["lgpd", "gdpr", "privacidade", "compliance", "dpo"],
  },
  {
    id: "clean-code-reviewer",
    name: "Clean Code Reviewer",
    category: "quality",
    description:
      "Aplica princípios de Clean Code, SOLID e DDD. Revisa nomes, coesão, acoplamento, duplicação e cobertura de testes.",
    skills: ["clean-code", "solid-principles", "code-review-checklist", "simplify-code"],
    triggers: ["clean code", "refactor", "solid", "review"],
  },
  {
    id: "code-archaeologist",
    name: "Code Archaeologist",
    category: "research",
    description:
      "Código legado, refatoração e engenharia reversa de sistemas não documentados.",
    skills: ["simplify-code", "code-review-checklist"],
  },
];

const STORAGE_KEY = "omniforge.agents.active";

export interface AgentsState {
  /** ID do agente coordenador atual (geralmente o Orchestrator) */
  leadId: string | null;
  /** IDs dos agentes ativos (incluindo o lead) */
  activeIds: string[];
}

export function loadAgentsState(): AgentsState {
  if (typeof window === "undefined") return { leadId: "orchestrator", activeIds: ["orchestrator"] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { leadId: "orchestrator", activeIds: ["orchestrator"] };
    return JSON.parse(raw) as AgentsState;
  } catch {
    return { leadId: "orchestrator", activeIds: ["orchestrator"] };
  }
}

export function saveAgentsState(state: AgentsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
