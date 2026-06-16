import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../firebase.server";

// Schema para validação das mensagens de chat
const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  images: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
  tokens: z.number().optional(),
  costUsd: z.number().optional(),
  model: z.string().optional(),
  createdAt: z.number(),
});

// Schema para validação da conversa
const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(chatMessageSchema),
  pinned: z.boolean().optional(),
  updatedAt: z.number(),
});

/** Verifica se o Firestore está configurado e disponível */
export const checkFirestoreStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { active: db !== null };
});

/** Lista todas as conversas do usuário no Firestore */
export const listConversations = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!db) {
      return { success: false, error: "Firestore não configurado", fallback: true };
    }

    try {
      const snap = await db.collection("conversations").where("userId", "==", data.userId).get();

      const list = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: d.id,
          title: d.title || "Conversa",
          messages: d.messages || [],
          pinned: d.pinned || false,
          updatedAt: d.updatedAt || Date.now(),
        };
      });

      // Ordenar por pinned desc e updatedAt desc
      const sorted = list.sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      });

      return { success: true, list: sorted };
    } catch (e) {
      console.error("Erro ao listar conversas do Firestore:", e);
      return { success: false, error: String(e) };
    }
  });

/** Salva ou atualiza uma conversa do usuário no Firestore */
export const saveConversation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      conversation: conversationSchema,
    }),
  )
  .handler(async ({ data }) => {
    if (!db) {
      return { success: false, error: "Firestore não configurado", fallback: true };
    }

    try {
      const docRef = db.collection("conversations").doc(data.conversation.id);
      await docRef.set({
        ...data.conversation,
        userId: data.userId,
        updatedAt: Date.now(),
      });
      return { success: true };
    } catch (e) {
      console.error("Erro ao salvar conversa no Firestore:", e);
      return { success: false, error: String(e) };
    }
  });

/** Exclui uma conversa do usuário no Firestore */
export const deleteConversation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().min(1), id: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!db) {
      return { success: false, error: "Firestore não configurado", fallback: true };
    }

    try {
      const docRef = db.collection("conversations").doc(data.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return { success: false, error: "Conversa não encontrada" };
      }

      if (doc.data()?.userId !== data.userId) {
        return { success: false, error: "Sem permissão para excluir esta conversa" };
      }

      await docRef.delete();
      return { success: true };
    } catch (e) {
      console.error("Erro ao excluir conversa do Firestore:", e);
      return { success: false, error: String(e) };
    }
  });
