# PromptArchitect

> Sistema profissional de criação, refinamento e governança de prompts/arquitetura para sistemas corporativos.

---

## 🎯 Visão Geral

**PromptArchitect** é uma plataforma completa para engenharia de prompts de nível enterprise, com foco em sistemas complexos como ERP, SaaS, marketplaces e automações de WhatsApp. O sistema vai além de "gerar prompts" — funciona como um arquiteto de software sênior conduzindo discovery estruturado e entregando pacotes completos de documentação.

### Diferenciais

✅ **Discovery Estruturado** — Classifica automaticamente o projeto por segmento de negócio (ERP, SaaS, WhatsApp Bot, etc.) e faz perguntas de qualificação antes de gerar documentos.

✅ **Pacote Completo de Documentos** — Não entrega só um prompt, entrega PRD, TRD, MCP Manifest, System Prompt, casos de teste e documentação de segurança conforme o segmento.

✅ **Governança e Versionamento** — Versionamento semântico automático, changelog estruturado, rastreabilidade completa e validação de prontidão para produção.

✅ **Consciência Multi-Modelo** — Adapta estrutura de prompts para GPT-4, Claude, Gemini, DeepSeek com otimizações específicas por modelo.

✅ **Modularidade e Reuso** — Templates versionados por tipo de artefato, herança de configurações de ecossistemas (ex: padrões da RS Consultoria com Supabase + Hono + N8N).

✅ **Casos de Teste Obrigatórios** — System prompts não vão para produção sem casos de teste (happy path, edge cases, error handling) validados.

---

## 📋 Segmentos Suportados

O sistema reconhece e adapta a entrega conforme o segmento:

| Segmento | Documentos Obrigatórios | Timeline Estimado |
|----------|-------------------------|-------------------|
| **ERP** | PRD, TRD, API Spec, Data Model, Security Doc, QA Plan, Runbook | 6-12 meses (MVP: 3-4 meses) |
| **SaaS B2B** | PRD, TRD, API Spec, Data Model, Design System, Security Doc | 4-6 meses (MVP: 2-3 meses) |
| **WhatsApp Automation** | PRD, TRD, MCP Manifest, System Prompt, QA Plan | 1-2 meses (MVP: 2-4 semanas) |
| **IPTV/Streaming** | PRD, TRD, API Spec, Data Model, Security Doc, Runbook | 5-8 meses (MVP: 3-4 meses) |
| **EAD/LMS** | PRD, TRD, API Spec, Data Model, Design System | 4-6 meses (MVP: 2-3 meses) |
| **Marketplace** | PRD, TRD, API Spec, Data Model | 4-6 meses (MVP: 2-3 meses) |
| **Mobile App** | PRD, TRD, Design System | 3-5 meses (MVP: 1-2 meses) |
| **Fintech** | PRD, TRD, API Spec, Data Model, Security Doc, QA Plan | 6-12 meses (MVP: 4-6 meses) |
| **HealthTech** | PRD, TRD, API Spec, Data Model, Security Doc (HIPAA) | 6-12 meses (MVP: 4-6 meses) |
| **PropTech** | PRD, TRD, API Spec, Data Model, Security Doc | 4-6 meses (MVP: 2-3 meses) |
| **LegalTech** | PRD, TRD, API Spec, Data Model, Security Doc, QA Plan | 5-8 meses (MVP: 3-4 meses) |
| **EdTech** | PRD, TRD, API Spec, Data Model, Design System | 4-6 meses (MVP: 2-3 meses) |
| **AgriTech** | PRD, TRD | 4-6 meses (MVP: 2-3 meses) |
| **Custom** | PRD, TRD (mínimo) | A definir após discovery |

---

## 🏗️ Arquitetura do Sistema

```
src/
├── lib/
│   ├── discovery/
│   │   └── segment-classifier.ts      # Discovery estruturado por segmento
│   ├── docs/
│   │   └── templates/
│   │       ├── prd-template.ts        # Product Requirements Document
│   │       ├── trd-template.ts        # Technical Requirements Document
│   │       └── mcp-manifest-template.ts # MCP Manifest para agentes/IA
│   ├── governance/
│   │   └── version-control.ts         # Versionamento semântico e governança
│   ├── orchestrator/
│   │   └── prompt-architect-orchestrator.ts # Orquestrador principal
│   ├── agents-catalog.ts              # Catálogo de agentes especializados
│   ├── prompt-templates.ts            # Templates de slash commands (/criar, /otimizar)
│   ├── llm-providers.ts               # Suporte multi-modelo (OpenAI, Anthropic, Google, etc.)
│   └── llm-stacks.ts                  # Stacks tecnológicos suportados
├── components/
│   ├── ui/                            # shadcn/ui components
│   ├── PromptArtifact.tsx             # Visualização de artefatos gerados
│   ├── GovernanceDashboard.tsx        # Dashboard de governança
│   └── ...
└── routes/
    ├── index.tsx                       # Interface principal (chat)
    └── api/                            # Endpoints de API
```

---

## 🚀 Instalação e Uso

### Pré-requisitos

- **Node.js** 18+ (ou Bun)
- **Firebase** (Firestore para persistência)
- **Chaves de API**: OpenAI, Anthropic, Google AI, etc.

### 1. Clonar e Instalar

```bash
git clone https://github.com/seu-usuario/PromptArchitect.git
cd PromptArchitect
npm install
# ou
bun install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# Firebase
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

### 3. Inicializar Firestore

```bash
node scripts/init-firestore.mjs
```

### 4. Rodar em Desenvolvimento

```bash
npm run dev
# ou
bun dev
```

Acesse `http://localhost:3000`

---

## 📖 Como Usar

### Fluxo Típico

1. **Discovery Inicial**
   - Digite sua ideia de projeto no chat
   - O sistema classifica automaticamente o segmento
   - Recebe perguntas de qualificação (módulos necessários, compliance, stack, etc.)

2. **Responder Discovery**
   - Responda às perguntas apresentadas
   - O sistema assume padrões razoáveis onde não houver resposta
   - Todas as suposições são declaradas explicitamente

3. **Geração de Documentos**
   - Sistema gera o pacote completo conforme o segmento:
     - **PRD** (Product Requirements Document)
     - **TRD** (Technical Requirements Document)
     - **MCP Manifest** (se tiver agentes/IA)
     - **System Prompt** (se tiver chatbot/automação)
     - **API Spec** (se SaaS/ERP)
     - **Security Doc** (se ERP/Fintech/HealthTech)
     - **Test Cases** (obrigatórios para System Prompts)

4. **Revisão e Refinamento**
   - Revise os documentos gerados
   - Solicite ajustes específicos
   - Adicione casos de teste customizados

5. **Validação e Aprovação**
   - Sistema valida prontidão para produção:
     - Status "approved" obrigatório
     - Casos de teste executados e passando
     - Compatibilidade de modelo verificada
     - Dependências validadas
   - Resolve bloqueadores antes de liberar

6. **Versionamento e Deploy**
   - Sistema gera changelog automático
   - Versionamento semântico (major.minor.patch)
   - Exporta artefatos em JSON estruturado
   - Prontos para uso em produção

### Slash Commands

Use `/` no início da mensagem para comandos rápidos:

- `/criar` — Criar prompt do zero
- `/otimizar` — Melhorar prompt existente
- `/prd` — Gerar PRD completo
- `/codigo` — Prompt especializado para código
- `/refinar` — Aplicar Chain-of-Thought
- `/persona` — Criar persona de agente
- `/revisar` — Revisar segurança e eficácia
- `/multiagente` — Arquitetura multi-agente

---

## 🎨 Design System

O PromptArchitect usa **shadcn/ui** + **Radix** + **Tailwind CSS v4** como base.

### Regras de Design

1. **Nunca** hardcode cores — use tokens semânticos (`bg-background`, `text-foreground`, `bg-primary`)
2. Defina tokens em `src/styles.css` via `@theme` (Tailwind v4)
3. Suporte light + dark mode automaticamente
4. Use `lucide-react` para ícones
5. Layouts responsivos (mobile-first)
6. Acessível (WCAG AA, labels, foco visível, ARIA)

---

## 🔒 Segurança e Compliance

### LGPD (Lei 13.709/2018)

- Coleta apenas dados estritamente necessários
- Base legal documentada (consentimento, contrato, interesse legítimo)
- Criptografia de dados pessoais em trânsito e repouso
- Logs de acesso registrados
- Direitos do titular implementados (acesso, correção, exclusão, portabilidade)
- Minimização de retenção
- **PII nunca em logs ou respostas de erro**

### Conformidade Fiscal BR (para ERP)

- NF-e (Nota Fiscal Eletrônica)
- NFS-e (Nota Fiscal de Serviço)
- SPED (Sistema Público de Escrituração Digital)
- Certificado Digital A1/A3 obrigatório

### OWASP Top 10

- Validação de entradas (Zod/equivalente)
- Prepared statements (SQL Injection)
- Autenticação robusta (JWT + MFA)
- Autorização por papel (RBAC)
- Headers seguros (CSP, HSTS)
- Rate limiting
- Audit logs
- Nunca commit de segredos

---

## 📊 Governança de Artefatos

Todos os artefatos (prompts, documentos) são versionados seguindo **SemVer**:

- **Major (X.0.0):** Breaking changes (remove features, muda comportamento)
- **Minor (x.Y.0):** New features (backward compatible)
- **Patch (x.y.Z):** Bug fixes

### Validação de Produção

Checklist automático antes de liberar:

- ✅ Status "approved" por revisor
- ✅ Casos de teste executados e passando
- ✅ Edge cases e error handling cobertos
- ✅ Changelog com justificativa de mudanças
- ✅ Dependências compatíveis
- ✅ Compatibilidade de modelo verificada (se aplicável)

---

## 🧪 Testes

### Tipos de Teste

1. **Happy Path** — Cenário ideal, input válido
2. **Edge Cases** — Input ambíguo, limites do sistema
3. **Error Handling** — Input inválido, falhas esperadas

### Executar Testes

```bash
npm run test
# ou
bun test
```

### Exemplo de Test Case

```typescript
{
  id: "test_happy_1",
  name: "Cenário feliz: Requisição válida",
  type: "happy_path",
  input: "Criar um ERP fiscal para pequena empresa",
  expectedOutput: "Discovery iniciado. Segmento: ERP. Confidence: 95%...",
  status: "passed"
}
```

---

## 📚 Documentação Adicional

- **[ARCHITECTURE.md](.agent/ARCHITECTURE.md)** — Arquitetura completa do Antigravity Kit (agentes, skills, workflows)
- **[PRD Template](src/lib/docs/templates/prd-template.ts)** — Estrutura de Product Requirements Document
- **[TRD Template](src/lib/docs/templates/trd-template.ts)** — Estrutura de Technical Requirements Document
- **[MCP Manifest Template](src/lib/docs/templates/mcp-manifest-template.ts)** — Estrutura de Model Context Protocol Manifest

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- **shadcn/ui** pelo design system
- **Radix UI** pelos componentes acessíveis
- **Tailwind CSS** pelo sistema de estilos
- **TanStack Router** pelo roteamento
- **Firebase** pela persistência

---

## 📞 Contato

Para dúvidas, sugestões ou suporte:

- **Email:** [seu-email@exemplo.com]
- **Website:** [https://seusite.com]
- **GitHub Issues:** [https://github.com/seu-usuario/PromptArchitect/issues]

---

**PromptArchitect** — Onde arquitetura de prompts encontra governança enterprise.
