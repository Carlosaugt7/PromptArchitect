/**
 * OmniForge — Script de inicialização do Firestore
 *
 * Uso: node scripts/init-firestore.mjs
 *
 * Cria a estrutura inicial de coleções e documentos de amostra.
 * Requer: VITE_FIREBASE_* no .env (lido automaticamente)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lê .env manualmente (sem dependência de dotenv)
function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env");
    const raw = readFileSync(envPath, "utf-8");
    const env = {};
    for (const line of raw.split("\n")) {
      const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
      if (match) env[match[1].trim()] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();

const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
const API_KEY = env.VITE_FIREBASE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
  console.error("❌  VITE_FIREBASE_PROJECT_ID ou VITE_FIREBASE_API_KEY não encontrados no .env");
  process.exit(1);
}

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function firestoreRequest(path, method = "GET", body = null) {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Firestore ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// Converte valor JS para formato Firestore
function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number")
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

// Cria um documento Firestore a partir de um objeto JS
function toFirestoreDoc(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function createDocument(collection, docId, data) {
  const path = `${collection}?documentId=${docId}&key=${API_KEY}`;
  const url = `${BASE_URL.replace(/\/documents$/, "")}/documents/${collection}?documentId=${encodeURIComponent(docId)}&key=${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toFirestoreDoc(data)),
  });

  const text = await res.text();
  if (!res.ok) {
    // Ignora se documento já existe
    if (res.status === 409) {
      return { exists: true };
    }
    throw new Error(`POST ${collection}/${docId} → ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function patchDocument(collection, docId, data) {
  const fields = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${k}`)
    .join("&");
  const url = `${BASE_URL}/${collection}/${docId}?${fields}&key=${API_KEY}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toFirestoreDoc(data)),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PATCH ${collection}/${docId} → ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

// ======== ESTRUTURA DO BANCO ========

async function initStructure() {
  console.log(`\n🔥 OmniForge Firestore — projeto: ${PROJECT_ID}\n`);

  // ─── 1. Coleção: conversations ───
  console.log("📁 Criando estrutura: conversations/");
  console.log("   Schema:");
  console.log("   {");
  console.log("     id: string           # UUID da conversa");
  console.log("     userId: string       # ID do usuário (localStorage ou Firebase UID)");
  console.log("     title: string        # Título gerado do primeiro prompt");
  console.log("     pinned: boolean      # Se está fixada no topo");
  console.log("     updatedAt: number    # Timestamp em ms");
  console.log("     messages: [          # Array de mensagens");
  console.log("       {");
  console.log("         id: string");
  console.log('         role: "user" | "assistant"');
  console.log("         content: string");
  console.log("         tokens?: number");
  console.log("         costUsd?: number");
  console.log("         model?: string");
  console.log("         createdAt: number");
  console.log("       }");
  console.log("     ]");
  console.log("   }");

  const sampleConversationId = "_sample_omniforge_init";
  const sampleConversation = {
    id: sampleConversationId,
    userId: "_system",
    title: "🚀 OmniForge — Estrutura inicializada",
    pinned: false,
    updatedAt: Date.now(),
    messages: [
      {
        id: "msg-init-001",
        role: "assistant",
        content:
          "Bem-vindo ao OmniForge! Esta conversa de exemplo confirma que o Firestore está configurado corretamente. Pode deletar este documento de exemplo.",
        tokens: 0,
        costUsd: 0,
        model: "system",
        createdAt: Date.now(),
      },
    ],
  };

  try {
    await createDocument("conversations", sampleConversationId, sampleConversation);
    console.log(`   ✅ conversations/_sample_omniforge_init criado`);
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`);
  }

  // ─── 2. Coleção: artifacts ───
  console.log("\n📁 Criando estrutura: artifacts/");
  console.log("   Schema:");
  console.log("   {");
  console.log("     id: string           # UUID do artefato");
  console.log("     userId: string       # ID do usuário");
  console.log("     title: string        # Nome do arquivo/componente");
  console.log("     lang: string         # Linguagem (tsx, html, sql, etc)");
  console.log("     code: string         # Código gerado");
  console.log("     html: string         # HTML compilado (para preview)");
  console.log("     hasReact: boolean    # Se usa React");
  console.log("     updatedAt: number    # Timestamp em ms");
  console.log("   }");

  const sampleArtifactId = "_sample_artifact_init";
  const sampleArtifact = {
    id: sampleArtifactId,
    userId: "_system",
    title: "index.html",
    lang: "html",
    code: "<!-- Exemplo de artefato gerado pelo OmniForge -->",
    html: "",
    hasReact: false,
    updatedAt: Date.now(),
  };

  try {
    await createDocument("artifacts", sampleArtifactId, sampleArtifact);
    console.log(`   ✅ artifacts/_sample_artifact_init criado`);
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`);
  }

  // ─── 3. Coleção: users ───
  console.log("\n📁 Criando estrutura: users/");
  console.log("   Schema:");
  console.log("   {");
  console.log("     uid: string          # Firebase Auth UID");
  console.log("     displayName: string  # Nome exibido");
  console.log("     email: string        # Email");
  console.log("     photoURL: string     # Avatar");
  console.log("     createdAt: number    # Primeiro login");
  console.log("     updatedAt: number    # Última atividade");
  console.log("     settings: {          # Preferências do usuário");
  console.log("       monthlyTokenLimit: number");
  console.log("       preferredModel: string");
  console.log("       theme: string");
  console.log("     }");
  console.log("   }");

  const sampleUserId = "_sample_user_init";
  const sampleUser = {
    uid: sampleUserId,
    displayName: "Sistema",
    email: "system@omniforge.dev",
    photoURL: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      monthlyTokenLimit: 1000000,
      preferredModel: "gemini-2.0-flash",
      theme: "dark",
    },
  };

  try {
    await createDocument("users", sampleUserId, sampleUser);
    console.log(`   ✅ users/_sample_user_init criado`);
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`);
  }

  // ─── 4. Coleção: projects ───
  console.log("\n📁 Criando estrutura: projects/");
  console.log("   Schema:");
  console.log("   {");
  console.log("     id: string           # UUID do projeto");
  console.log("     userId: string       # Dono do projeto");
  console.log("     name: string         # Nome do projeto");
  console.log('     source: "local" | "github"');
  console.log("     url?: string         # URL do GitHub se aplicável");
  console.log("     importedAt: number   # Timestamp de importação");
  console.log("     fileCount: number    # Quantidade de arquivos");
  console.log("   }");

  const sampleProjectId = "_sample_project_init";
  const sampleProject = {
    id: sampleProjectId,
    userId: "_system",
    name: "meu-projeto-exemplo",
    source: "local",
    importedAt: Date.now(),
    fileCount: 0,
  };

  try {
    await createDocument("projects", sampleProjectId, sampleProject);
    console.log(`   ✅ projects/_sample_project_init criado`);
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`);
  }

  // ─── 5. Resumo e Regras ───
  console.log("\n" + "═".repeat(60));
  console.log("✅ Estrutura do Firestore criada com sucesso!\n");

  console.log("📋 REGRAS DE SEGURANÇA (copie para Firebase Console):");
  console.log("   Console → Firestore Database → Regras\n");
  console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Conversas: cada usuário acessa só as suas
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }

    // Artefatos: cada usuário acessa só os seus
    match /artifacts/{artifactId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }

    // Perfil do usuário: só o próprio usuário acessa
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }

    // Projetos: cada usuário acessa só os seus
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
`);

  console.log("📋 ÍNDICES NECESSÁRIOS (Firebase Console → Índices compostos):");
  console.log("   conversations: userId (ASC) + updatedAt (DESC)");
  console.log("   artifacts: userId (ASC) + updatedAt (DESC)");
  console.log("   projects: userId (ASC) + importedAt (DESC)");

  console.log("\n🔑 PARA AUTENTICAÇÃO GOOGLE funcionar:");
  console.log("   1. Firebase Console → Authentication → Sign-in method");
  console.log("   2. Ative 'Google'");
  console.log("   3. Adicione domínios autorizados: localhost, seu-dominio.com");
  console.log("   4. Copie a nova Web API Key e atualize o .env\n");
}

initStructure().catch((e) => {
  console.error("\n❌ Falha ao inicializar Firestore:", e.message);
  process.exit(1);
});
