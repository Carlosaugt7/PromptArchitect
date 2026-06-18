# Plano de Implementação — OmniForge & Firestore

Este documento descreve o planejamento para análise do projeto, correção de dependências e lint, e implementação inicial de suporte ao banco de dados Firestore no backend do OmniForge.

---

## 📋 Overview

- **Objetivo:** Analisar o projeto OmniForge, identificar melhorias estruturais/erros e preparar o backend para utilizar o banco NoSQL Firestore (Firebase) para persistência de dados.
- **Tipo de Projeto:** WEB + BACKEND (TanStack Start / Nitro server engine)

---

## 🎯 Success Criteria

- **Segurança & Estabilidade:** Correção de erros de compilação ou de importações que causam falhas de lint no ESLint.
- **Integração de Backend:** O backend do TanStack Start configurado para inicializar com segurança o Firestore caso as chaves estejam presentes no `.env`.
- **Experiência do Desenvolvedor:** Fallback suave para `localStorage` ou mock em memória quando o Firestore não estiver configurado localmente.

---

## 🛠️ Tech Stack

- **Framework:** TanStack Start (Vite + React 19 + Nitro server engine)
- **Database:** Firebase Firestore (Firebase Admin SDK no backend)
- **Validação:** ESLint + TypeScript type checker (`npx tsc --noEmit`)

---

## 📂 File Structure Changes

```plaintext
src/
├── lib/
│   ├── firebase.server.ts            # [NEW] Configuração e inicialização do Firebase Admin SDK
│   └── api/
│       └── conversations.server.ts    # [NEW] Server Functions para sincronizar conversas no Firestore
package.json                          # [MODIFY] Adiciona dependência firebase-admin
.prettierrc                           # [MODIFY] Adiciona "endOfLine": "auto" para corrigir CRLF no Windows
```

---

## 📋 Task Breakdown

### Fase 1: Análise, Correção de Dependências e Lint

- **Task 1.1:** Instalação completa de dependências (`npm install`), adição de `"endOfLine": "auto"` ao `.prettierrc` e correção de erros de importação do ESLint.
  - **Agente:** `devops-engineer`
  - **Skill:** `lint-and-validate`
  - **INPUT:** Arquivo `package.json` sem `node_modules` e `.prettierrc` padrão.
  - **OUTPUT:** Pasta `node_modules` instalada e `.prettierrc` configurado para compatibilidade com Windows.
  - **VERIFY:** `npm run lint` executa com sucesso.
- **Task 1.2:** Correção de quaisquer bugs e falhas de escrita (typos) no catálogo de agentes ou arquivos de rotas.
  - **Agente:** `clean-code-reviewer`
  - **Skill:** `clean-code`
  - **INPUT:** Código atual.
  - **OUTPUT:** Ajustes de digitação/ortografia feitos.
  - **VERIFY:** Execução de `eslint .` sem erros.

### Fase 2: Configuração do Firestore (P0/P1)

- **Task 2.1:** Adição do pacote `firebase-admin` ao `package.json`.
  - **Agente:** `backend-specialist`
  - **Skill:** `nodejs-best-practices`
  - **INPUT:** `package.json` sem biblioteca do Firebase.
  - **OUTPUT:** `package.json` atualizado e dependência instalada.
  - **VERIFY:** Arquivo compilado e dependência disponível no projeto.

- **Task 2.2:** Criação de `src/lib/firebase.server.ts` para conectar com o Firebase Admin de forma segura.
  - **Agente:** `database-architect`
  - **Skill:** `database-design`
  - **INPUT:** Configurações de env.
  - **OUTPUT:** Módulo utilitário do Firebase que inicializa o admin de forma singleton.
  - **VERIFY:** Inicialização sem erros se variáveis de ambiente configuradas.

- **Task 2.3:** Criação do módulo de sincronização em `src/lib/api/conversations.server.ts`.
  - **Agente:** `backend-specialist`
  - **Skill:** `api-patterns`
  - **INPUT:** LocalStorage chat logs.
  - **OUTPUT:** Server functions para CRUD de conversas no Firestore.
  - **VERIFY:** Conexão simulada ou real grava e lê as mensagens.

---

## 🏁 Phase X: Verification

### Execução dos scripts de auditoria do Antigravity

```bash
# Executa todos os testes de qualidade e segurança
python .agent/scripts/verify_all.py .
```

### Validações adicionais

- [x] O projeto compila com sucesso (`npm run build`).
- [x] ESLint executa sem apontar erros (`npm run lint`).
- [x] Fallback do Firestore funciona quando as chaves não estão presentes.

## ✅ PHASE X COMPLETE

- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-16
