// Stacks suportadas pelo OmniForge. Esta lista é injetada no system prompt
// para que QUALQUER LLM saiba que pode (e deve) produzir código nessas
// linguagens/frameworks/bancos quando o usuário pedir.

export interface StackGroup {
  label: string;
  items: string[];
}

export const SUPPORTED_STACKS: StackGroup[] = [
  {
    label: "Linguagens",
    items: [
      "TypeScript", "JavaScript", "PHP", "Python", "Go", "Rust",
      "Java", "Kotlin", "C#", "Ruby", "Swift", "Dart", "SQL", "Bash",
    ],
  },
  {
    label: "Frontend",
    items: [
      "React", "Next.js", "Vue 3", "Nuxt", "Svelte/SvelteKit", "Angular",
      "Astro", "Solid", "TanStack Start", "Tailwind CSS", "Vite",
    ],
  },
  {
    label: "Backend",
    items: [
      "Node.js (Express/Fastify/NestJS)", "Deno", "Bun",
      "Laravel (PHP)", "Symfony (PHP)", "Slim (PHP)",
      "Django / FastAPI (Python)", "Spring Boot (Java)", "ASP.NET Core",
      "Ruby on Rails", "Go (Gin/Fiber)", "Rust (Axum)", "Serverless/Edge Functions",
    ],
  },
  {
    label: "Bancos de dados",
    items: [
      "PostgreSQL", "MySQL/MariaDB", "SQLite", "SQL Server", "Oracle",
      "MongoDB", "Redis", "Elasticsearch", "ClickHouse",
      "Supabase", "Firebase", "PlanetScale", "Neon", "Turso/LibSQL",
    ],
  },
  {
    label: "DevOps & Infra",
    items: [
      "Docker", "Kubernetes", "GitHub Actions", "GitLab CI",
      "Vercel", "Cloudflare Workers", "AWS", "GCP", "Azure", "Fly.io",
    ],
  },
];

export const COMPLIANCE_DIRECTIVES = [
  "**LGPD (Lei 13.709/2018)** — colete apenas dados estritamente necessários,",
  "documente a base legal (consentimento, contrato, interesse legítimo, etc.),",
  "criptografe dados pessoais em trânsito e em repouso, registre logs de acesso,",
  "implemente direitos do titular (acesso, correção, exclusão, portabilidade) e",
  "minimize retenção. Nunca exponha PII em logs ou respostas de erro.",
  "",
  "**Clean Code** — nomes claros, funções pequenas e com responsabilidade única,",
  "sem duplicação, testes automatizados, tratamento explícito de erros, tipagem",
  "forte, separação clara de camadas (UI / domínio / infra) e revisão contínua.",
  "",
  "**Segurança** — sempre valide entradas (Zod/equivalente), use prepared",
  "statements, autenticação robusta, autorização por papel, headers seguros",
  "(CSP, HSTS), rate limit, e siga OWASP Top 10. Nunca commit de segredos.",
].join("\n");

export function buildStacksBlock(): string {
  const list = SUPPORTED_STACKS
    .map(g => `**${g.label}:** ${g.items.join(", ")}`)
    .join("\n");
  return [
    "# Stacks suportadas (fullstack)",
    "Você pode — e deve — desenvolver soluções completas usando qualquer uma",
    "destas tecnologias quando o usuário pedir. Escolha a stack mais adequada",
    "ao problema; não restrinja respostas a um único ecossistema.",
    "",
    list,
    "",
    "# Compliance, qualidade e segurança",
    COMPLIANCE_DIRECTIVES,
  ].join("\n");
}
