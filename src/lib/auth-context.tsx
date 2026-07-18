import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase-config";
import { setUserId } from "./chat-history";

interface AuthState {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  firebaseAvailable: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
  firebaseAvailable: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase não configurado ou inicialização falhou — modo offline
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribed = false;
    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        if (!unsubscribed) {
          setUser(u);
          if (u) {
            // Sincroniza o ID da sessão de chats/modelos com o UID do usuário logado
            setUserId(u.uid);
          } else {
            // Se o usuário deslogou e o ID atual era o UID dele, gera um novo ID anônimo temporário
            const currentId = localStorage.getItem("omniforge.userId");
            if (currentId && !currentId.startsWith("user-")) {
              const anonymousId = "user-" + Math.random().toString(36).substring(2, 9);
              setUserId(anonymousId);
            }
          }
          setLoading(false);
        }
      },
      (error) => {
        // Erro de autenticação (ex: API key revogada) — modo offline
      console.warn("[PromptArchitect] Firebase auth error — running in offline mode.", error);
        if (!unsubscribed) setLoading(false);
      },
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signOut: handleSignOut, firebaseAvailable: isFirebaseConfigured }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
