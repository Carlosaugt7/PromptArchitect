/**
 * Sistema de Discovery Estruturado
 * Classifica o pedido do usuário por segmento e faz perguntas de qualificação
 */

export type BusinessSegment =
  | "ERP"
  | "SaaS B2B"
  | "SaaS B2C"
  | "Marketplace"
  | "Mobile App"
  | "WhatsApp Automation"
  | "IPTV/Streaming"
  | "EAD/LMS"
  | "E-commerce"
  | "Fintech"
  | "HealthTech"
  | "AgriTech"
  | "PropTech"
  | "LegalTech"
  | "EdTech"
  | "Custom";

export interface SegmentProfile {
  segment: BusinessSegment;
  keywords: string[];
  mandatoryDocuments: DocumentType[];
  mandatoryQuestions: DiscoveryQuestion[];
  typicalStack: Partial<TechStack>;
  complianceRequirements: string[];
  criticalRisks: string[];
}

export type DocumentType =
  | "PRD"
  | "TRD"
  | "API_SPEC"
  | "DATA_MODEL"
  | "MCP_MANIFEST"
  | "DESIGN_SYSTEM"
  | "SYSTEM_PROMPT"
  | "ROADMAP"
  | "QA_PLAN"
  | "SECURITY_DOC"
  | "RUNBOOK";

export interface DiscoveryQuestion {
  id: string;
  question: string;
  type: "text" | "choice" | "multiple" | "number";
  options?: string[];
  required: boolean;
  context: string; // Por que essa pergunta é importante
}

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  infrastructure: string;
  integrations: string[];
}

export interface DiscoveryResponse {
  segment: BusinessSegment;
  confidence: number; // 0-1
  assumptions: string[]; // Suposições feitas
  questions: DiscoveryQuestion[]; // Perguntas a fazer ao usuário
  recommendedDocuments: DocumentType[];
  estimatedComplexity: "Simple" | "Medium" | "Complex" | "Enterprise";
  estimatedTimeline: string;
}

/**
 * Perfis de segmentos de negócio
 */
export const SEGMENT_PROFILES: SegmentProfile[] = [
  {
    segment: "ERP",
    keywords: [
      "erp",
      "nota fiscal",
      "nfe",
      "nfse",
      "sped",
      "fiscal",
      "estoque",
      "financeiro",
      "contabilidade",
      "faturamento",
      "compras",
      "vendas",
      "gestão empresarial",
    ],
    mandatoryDocuments: [
      "PRD",
      "TRD",
      "API_SPEC",
      "DATA_MODEL",
      "SECURITY_DOC",
      "QA_PLAN",
      "RUNBOOK",
    ],
    mandatoryQuestions: [
      {
        id: "erp_modules",
        question: "Quais módulos o ERP deve ter?",
        type: "multiple",
        options: [
          "Financeiro",
          "Estoque",
          "Compras",
          "Vendas",
          "Fiscal (NF-e/NFS-e)",
          "RH/Folha",
          "CRM",
          "BI/Relatórios",
        ],
        required: true,
        context: "Define o escopo e complexidade do sistema",
      },
      {
        id: "fiscal_compliance",
        question: "Necessita conformidade fiscal brasileira (NF-e, SPED)?",
        type: "choice",
        options: ["Sim, completa", "Sim, parcial", "Não"],
        required: true,
        context: "Impacta arquitetura e integrações com SEFAZ",
      },
      {
        id: "multi_company",
        question: "Deve suportar múltiplas empresas/filiais?",
        type: "choice",
        options: ["Sim", "Não"],
        required: true,
        context: "Afeta modelo de dados e isolamento",
      },
      {
        id: "legacy_integration",
        question: "Precisa integrar com sistemas legados?",
        type: "text",
        required: false,
        context: "Identifica necessidade de adaptadores/ETL",
      },
    ],
    typicalStack: {
      frontend: "React ou Next.js",
      backend: "Node.js (NestJS) ou Laravel (PHP)",
      database: "PostgreSQL",
      infrastructure: "VPS ou AWS",
      integrations: ["SEFAZ", "Bancos (OFX/CNAB)", "E-commerce"],
    },
    complianceRequirements: ["LGPD", "NF-e/NFS-e", "SPED", "Certificado Digital A1/A3"],
    criticalRisks: [
      "Complexidade fiscal BR (constantes mudanças na legislação)",
      "Integração com SEFAZ instável",
      "Migração de dados legados",
      "Curva de aprendizado para usuários",
    ],
  },
  {
    segment: "WhatsApp Automation",
    keywords: [
      "whatsapp",
      "chatbot",
      "atendimento",
      "mensagem",
      "evolution api",
      "baileys",
      "chat",
      "conversação",
      "bot",
    ],
    mandatoryDocuments: ["PRD", "TRD", "MCP_MANIFEST", "SYSTEM_PROMPT", "QA_PLAN"],
    mandatoryQuestions: [
      {
        id: "whatsapp_use_case",
        question: "Qual o principal caso de uso?",
        type: "choice",
        options: [
          "Atendimento/Suporte",
          "Vendas/Marketing",
          "Notificações",
          "Agendamento",
          "Integração com CRM",
        ],
        required: true,
        context: "Define o tipo de agente e fluxos necessários",
      },
      {
        id: "human_escalation",
        question: "Quando deve escalar para atendimento humano?",
        type: "text",
        required: true,
        context: "Define regras de escalonamento no system prompt",
      },
      {
        id: "business_hours",
        question: "Horário de atendimento?",
        type: "text",
        required: false,
        context: "Para resposta automática fora do horário",
      },
      {
        id: "message_volume",
        question: "Volume estimado de mensagens/dia?",
        type: "choice",
        options: ["< 100", "100-1000", "1000-10000", "> 10000"],
        required: true,
        context: "Dimensiona infraestrutura e rate limiting",
      },
    ],
    typicalStack: {
      frontend: "React (painel admin)",
      backend: "Node.js + Evolution API",
      database: "PostgreSQL ou MongoDB",
      infrastructure: "VPS com IP fixo",
      integrations: ["Evolution API", "OpenAI/Anthropic", "CRM", "N8N"],
    },
    complianceRequirements: ["LGPD (dados de conversas)", "Termos de WhatsApp Business"],
    criticalRisks: [
      "Banimento de número pelo WhatsApp",
      "Latência da Evolution API",
      "Custo de LLM em alto volume",
      "Contexto de conversa se perder",
    ],
  },
  {
    segment: "SaaS B2B",
    keywords: [
      "saas",
      "b2b",
      "multi-tenant",
      "assinatura",
      "planos",
      "empresas",
      "organizações",
      "equipes",
    ],
    mandatoryDocuments: [
      "PRD",
      "TRD",
      "API_SPEC",
      "DATA_MODEL",
      "DESIGN_SYSTEM",
      "SECURITY_DOC",
      "RUNBOOK",
    ],
    mandatoryQuestions: [
      {
        id: "tenant_isolation",
        question: "Qual estratégia de multi-tenancy?",
        type: "choice",
        options: [
          "Banco separado por cliente",
          "Schema separado",
          "Tabelas compartilhadas com tenant_id",
        ],
        required: true,
        context: "Impacta segurança, performance e custo",
      },
      {
        id: "pricing_model",
        question: "Modelo de precificação?",
        type: "choice",
        options: [
          "Por usuário/mês",
          "Por feature tier",
          "Por volume de uso",
          "Flat mensal",
          "Customizado",
        ],
        required: true,
        context: "Define lógica de billing e restrições",
      },
      {
        id: "integrations_needed",
        question: "Integrações necessárias?",
        type: "text",
        required: false,
        context: "Ex: Slack, Google Workspace, CRM",
      },
    ],
    typicalStack: {
      frontend: "React ou Vue",
      backend: "Node.js, Python ou Go",
      database: "PostgreSQL com Row-Level Security",
      infrastructure: "Vercel + Supabase ou AWS",
      integrations: ["Stripe", "OAuth providers", "Webhooks"],
    },
    complianceRequirements: ["LGPD", "SOC 2 (desejável)", "GDPR (se EU)"],
    criticalRisks: [
      "Vazamento de dados entre tenants",
      "Performance degrada com crescimento",
      "Churn de clientes",
      "Complexidade de billing",
    ],
  },
  {
    segment: "IPTV/Streaming",
    keywords: [
      "iptv",
      "streaming",
      "vídeo",
      "live",
      "vod",
      "cdn",
      "player",
      "transmissão",
      "canal",
      "conteúdo",
    ],
    mandatoryDocuments: [
      "PRD",
      "TRD",
      "API_SPEC",
      "DATA_MODEL",
      "SECURITY_DOC",
      "RUNBOOK",
    ],
    mandatoryQuestions: [
      {
        id: "content_type",
        question: "Tipo de conteúdo?",
        type: "multiple",
        options: ["Live TV", "VOD (filmes/séries)", "Eventos ao vivo", "Gravações"],
        required: true,
        context: "Define arquitetura de streaming",
      },
      {
        id: "drm_needed",
        question: "Necessita DRM (proteção contra pirataria)?",
        type: "choice",
        options: ["Sim, Widevine/FairPlay", "Não"],
        required: true,
        context: "Impacta custo e complexidade",
      },
      {
        id: "concurrent_users",
        question: "Usuários simultâneos esperados?",
        type: "choice",
        options: ["< 100", "100-1000", "1000-10000", "> 10000"],
        required: true,
        context: "Dimensiona CDN e infraestrutura",
      },
    ],
    typicalStack: {
      frontend: "React Native ou Web",
      backend: "Node.js ou Go",
      database: "PostgreSQL + Redis",
      infrastructure: "CDN (Cloudflare/AWS CloudFront) + Origin servers",
      integrations: ["CDN", "Payment gateway", "Analytics"],
    },
    complianceRequirements: ["Direitos autorais", "Lei do Audiovisual (BR)", "LGPD"],
    criticalRisks: [
      "Latência de streaming",
      "Custo de CDN em escala",
      "Pirataria",
      "Buffering e qualidade variável",
    ],
  },
  {
    segment: "EAD/LMS",
    keywords: [
      "ead",
      "lms",
      "curso",
      "educação",
      "ensino",
      "aluno",
      "professor",
      "aula",
      "certificado",
      "trilha",
    ],
    mandatoryDocuments: [
      "PRD",
      "TRD",
      "API_SPEC",
      "DATA_MODEL",
      "DESIGN_SYSTEM",
      "QA_PLAN",
    ],
    mandatoryQuestions: [
      {
        id: "course_format",
        question: "Formato dos cursos?",
        type: "multiple",
        options: [
          "Vídeo-aulas",
          "Texto/PDFs",
          "Quizzes/Provas",
          "Projetos práticos",
          "Ao vivo (webinar)",
        ],
        required: true,
        context: "Define features de criação de conteúdo",
      },
      {
        id: "certificate_needed",
        question: "Emite certificados?",
        type: "choice",
        options: ["Sim, automático", "Sim, mediante aprovação", "Não"],
        required: true,
        context: "Requer lógica de validação e template",
      },
      {
        id: "monetization",
        question: "Modelo de monetização?",
        type: "choice",
        options: ["Gratuito", "Pago por curso", "Assinatura", "Freemium"],
        required: true,
        context: "Define integração com pagamento",
      },
    ],
    typicalStack: {
      frontend: "React ou Vue",
      backend: "Node.js ou Python (Django)",
      database: "PostgreSQL",
      infrastructure: "Vercel + AWS S3 (vídeos)",
      integrations: ["Vimeo/YouTube", "Payment", "Email (transacional)"],
    },
    complianceRequirements: ["LGPD", "MEC (se cursos regulamentados no BR)"],
    criticalRisks: [
      "Custo de armazenamento de vídeos",
      "Pirataria de conteúdo",
      "Engajamento de alunos",
      "Ferramentas de autoria complexas",
    ],
  },
  {
    segment: "PropTech",
    keywords: [
      "imobiliária",
      "imóvel",
      "aluguel",
      "locação",
      "venda",
      "corretor",
      "creci",
      "apartamento",
      "casa",
      "propriedade",
      "fiança",
      "contrato",
    ],
    mandatoryDocuments: ["PRD", "TRD", "API_SPEC", "DATA_MODEL", "SECURITY_DOC"],
    mandatoryQuestions: [
      {
        id: "proptech_type",
        question: "Qual o foco principal?",
        type: "choice",
        options: [
          "Gestão de imóveis (admin)",
          "Marketplace (anúncios)",
          "Gestão de locação",
          "CRM para corretores",
          "Todos",
        ],
        required: true,
        context: "Define features prioritárias",
      },
      {
        id: "contract_management",
        question: "Necessita gestão de contratos digitais?",
        type: "choice",
        options: ["Sim, com assinatura digital", "Sim, sem assinatura", "Não"],
        required: true,
        context: "Define integração com plataformas de assinatura",
      },
    ],
    typicalStack: {
      frontend: "React ou Next.js",
      backend: "Node.js ou Laravel",
      database: "PostgreSQL",
      infrastructure: "AWS ou Vercel",
      integrations: ["Assinatura digital (Clicksign)", "Mapas (Google Maps)", "Pagamento"],
    },
    complianceRequirements: ["LGPD", "CRECI"],
    criticalRisks: [
      "Gestão de múltiplos contratos simultâneos",
      "Cálculo de reajustes e multas",
      "Inadimplência",
    ],
  },
  {
    segment: "LegalTech",
    keywords: [
      "jurídico",
      "advogado",
      "oab",
      "processo",
      "petição",
      "prazo",
      "tribunal",
      "cliente jurídico",
      "escritório",
      "advocacia",
    ],
    mandatoryDocuments: ["PRD", "TRD", "API_SPEC", "DATA_MODEL", "SECURITY_DOC", "QA_PLAN"],
    mandatoryQuestions: [
      {
        id: "legaltech_type",
        question: "Qual o foco principal?",
        type: "choice",
        options: [
          "Gestão de processos",
          "Cálculo de prazos",
          "Geração de petições",
          "CRM jurídico",
          "Todos",
        ],
        required: true,
        context: "Define módulos prioritários",
      },
      {
        id: "lawsuit_tracking",
        question: "Necessita acompanhamento de processos (tribunais)?",
        type: "choice",
        options: ["Sim, automático (web scraping)", "Sim, manual", "Não"],
        required: true,
        context: "Define integração com tribunais",
      },
    ],
    typicalStack: {
      frontend: "React",
      backend: "Node.js ou Python",
      database: "PostgreSQL",
      infrastructure: "AWS (compliance)",
      integrations: ["API OAB", "Tribunais (web scraping)", "Assinatura digital"],
    },
    complianceRequirements: ["LGPD (sigilo profissional reforçado)", "OAB"],
    criticalRisks: [
      "Perda de prazos processuais",
      "Vazamento de dados sigilosos",
      "Indisponibilidade de sistemas de tribunais",
    ],
  },
  {
    segment: "EdTech",
    keywords: [
      "educação",
      "escola",
      "universidade",
      "estudante",
      "professor",
      "nota",
      "boletim",
      "matrícula",
      "frequência",
    ],
    mandatoryDocuments: ["PRD", "TRD", "API_SPEC", "DATA_MODEL", "DESIGN_SYSTEM"],
    mandatoryQuestions: [
      {
        id: "edtech_type",
        question: "Qual o tipo de instituição?",
        type: "choice",
        options: [
          "Educação Básica (K-12)",
          "Ensino Superior",
          "Curso Livre",
          "Corporativo (treinamento)",
        ],
        required: true,
        context: "Define requisitos regulatórios",
      },
      {
        id: "student_portal",
        question: "Necessita portal do aluno?",
        type: "choice",
        options: ["Sim", "Não"],
        required: true,
        context: "Define interface de auto-atendimento",
      },
    ],
    typicalStack: {
      frontend: "React ou Vue",
      backend: "Node.js ou Python",
      database: "PostgreSQL",
      infrastructure: "AWS ou Vercel",
      integrations: ["Video (Zoom, Google Meet)", "Pagamento", "Email"],
    },
    complianceRequirements: ["LGPD", "MEC (se regulamentado)"],
    criticalRisks: [
      "Privacidade de menores (COPPA/LGPD)",
      "Integridade de notas",
      "Disponibilidade em períodos de matrícula",
    ],
  },
  // Adicionar mais segmentos conforme necessário
];

/**
 * Classifica o input do usuário em um segmento de negócio
 */
export function classifySegment(userInput: string): DiscoveryResponse {
  const input = userInput.toLowerCase();
  const scores = new Map<BusinessSegment, number>();

  // Calcula score por segmento baseado em keywords
  SEGMENT_PROFILES.forEach((profile) => {
    let score = 0;
    profile.keywords.forEach((keyword) => {
      if (input.includes(keyword)) {
        score++;
      }
    });
    if (score > 0) {
      scores.set(profile.segment, score);
    }
  });

  // Se não encontrou nenhum match, retorna "Custom"
  if (scores.size === 0) {
    return {
      segment: "Custom",
      confidence: 0.3,
      assumptions: ["Nenhum segmento pré-definido identificado. Classificando como Custom."],
      questions: getGenericDiscoveryQuestions(),
      recommendedDocuments: ["PRD", "TRD"],
      estimatedComplexity: "Medium",
      estimatedTimeline: "A definir após discovery",
    };
  }

  // Pega o segmento com maior score
  const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const [topSegment, topScore] = sortedScores[0];
  const profile = SEGMENT_PROFILES.find((p) => p.segment === topSegment)!;

  // Calcula confiança (normaliza score pela quantidade de keywords)
  const confidence = Math.min(topScore / profile.keywords.length, 1);

  // Identifica suposições razoáveis
  const assumptions = generateAssumptions(profile, userInput);

  return {
    segment: topSegment,
    confidence,
    assumptions,
    questions: profile.mandatoryQuestions,
    recommendedDocuments: profile.mandatoryDocuments,
    estimatedComplexity: estimateComplexity(profile, userInput),
    estimatedTimeline: estimateTimeline(profile),
  };
}

/**
 * Gera suposições razoáveis baseadas no segmento
 */
function generateAssumptions(profile: SegmentProfile, userInput: string): string[] {
  const assumptions: string[] = [];

  assumptions.push(`Segmento identificado: ${profile.segment}`);

  // Stack típico
  if (profile.typicalStack.backend) {
    assumptions.push(`Assumindo stack backend: ${profile.typicalStack.backend}`);
  }
  if (profile.typicalStack.database) {
    assumptions.push(`Assumindo banco de dados: ${profile.typicalStack.database}`);
  }

  // Compliance
  if (profile.complianceRequirements.length > 0) {
    assumptions.push(
      `Compliance necessário: ${profile.complianceRequirements.join(", ")}`
    );
  }

  // Riscos críticos
  assumptions.push(`Riscos identificados: ${profile.criticalRisks[0]}`);

  return assumptions;
}

/**
 * Estima complexidade do projeto
 */
function estimateComplexity(
  profile: SegmentProfile,
  userInput: string
): "Simple" | "Medium" | "Complex" | "Enterprise" {
  const complexityKeywords = {
    enterprise: ["multi-tenant", "microservices", "compliance", "integração complexa"],
    complex: ["integração", "api", "múltiplas", "escalável"],
    medium: ["crud", "dashboard", "autenticação"],
  };

  const input = userInput.toLowerCase();

  if (complexityKeywords.enterprise.some((k) => input.includes(k))) {
    return "Enterprise";
  }
  if (profile.segment === "ERP" || profile.segment === "SaaS B2B") {
    return "Complex";
  }
  if (complexityKeywords.complex.some((k) => input.includes(k))) {
    return "Complex";
  }
  if (complexityKeywords.medium.some((k) => input.includes(k))) {
    return "Medium";
  }

  return "Medium";
}

/**
 * Estima timeline baseado na complexidade
 */
function estimateTimeline(profile: SegmentProfile): string {
  const timelines: Record<BusinessSegment, string> = {
    ERP: "6-12 meses (MVP: 3-4 meses)",
    "SaaS B2B": "4-6 meses (MVP: 2-3 meses)",
    "SaaS B2C": "3-5 meses (MVP: 1-2 meses)",
    Marketplace: "4-6 meses (MVP: 2-3 meses)",
    "Mobile App": "3-5 meses (MVP: 1-2 meses)",
    "WhatsApp Automation": "1-2 meses (MVP: 2-4 semanas)",
    "IPTV/Streaming": "5-8 meses (MVP: 3-4 meses)",
    "EAD/LMS": "4-6 meses (MVP: 2-3 meses)",
    "E-commerce": "3-5 meses (MVP: 2-3 meses)",
    Fintech: "6-12 meses (MVP: 4-6 meses)",
    HealthTech: "6-12 meses (MVP: 4-6 meses)",
    AgriTech: "4-6 meses (MVP: 2-3 meses)",
    PropTech: "4-6 meses (MVP: 2-3 meses)",
    LegalTech: "5-8 meses (MVP: 3-4 meses)",
    EdTech: "4-6 meses (MVP: 2-3 meses)",
    Custom: "A definir após discovery",
  };

  return timelines[profile.segment] || "A definir";
}

/**
 * Perguntas genéricas para segmentos não classificados
 */
function getGenericDiscoveryQuestions(): DiscoveryQuestion[] {
  return [
    {
      id: "project_goal",
      question: "Qual é o principal objetivo/problema que o sistema deve resolver?",
      type: "text",
      required: true,
      context: "Define o escopo e valor do produto",
    },
    {
      id: "target_users",
      question: "Quem são os usuários principais?",
      type: "text",
      required: true,
      context: "Identifica personas e jobs-to-be-done",
    },
    {
      id: "existing_systems",
      question: "Já existe algum sistema similar sendo usado? Qual?",
      type: "text",
      required: false,
      context: "Identifica necessidade de migração/integração",
    },
    {
      id: "budget_timeline",
      question: "Há restrições de orçamento ou prazo?",
      type: "text",
      required: false,
      context: "Ajusta escopo para viabilidade",
    },
  ];
}

/**
 * Formata a resposta de discovery como prompt estruturado
 */
export function formatDiscoveryPrompt(response: DiscoveryResponse): string {
  return `# Discovery Estruturado

**Segmento Identificado:** ${response.segment}
**Confiança:** ${(response.confidence * 100).toFixed(0)}%
**Complexidade Estimada:** ${response.estimatedComplexity}
**Timeline Estimado:** ${response.estimatedTimeline}

---

## Suposições Assumidas

${response.assumptions.map((a) => `- ${a}`).join("\n")}

---

## Perguntas de Qualificação

Para gerar documentação completa e precisa, preciso das seguintes informações:

${response.questions
  .map(
    (q, idx) =>
      `${idx + 1}. **${q.question}** ${q.required ? "(Obrigatório)" : "(Opcional)"}
   ${q.type === "choice" || q.type === "multiple" ? `Opções: ${q.options?.join(", ")}` : ""}
   _Contexto: ${q.context}_`
  )
  .join("\n\n")}

---

## Documentos que serão Gerados

${response.recommendedDocuments.map((doc) => `- [ ] ${doc}`).join("\n")}

---

**Próximos Passos:**
1. Responda às perguntas acima
2. Revisarei as suposições e ajustarei se necessário
3. Gerarei o pacote completo de documentos
4. Você poderá revisar e solicitar ajustes antes da implementação

`;
}
