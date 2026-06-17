import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase-config";

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
          setLoading(false);
        }
      },
      (error) => {
        // Erro de autenticação (ex: API key revogada) — modo offline
        console.warn("[OmniForge] Firebase auth error — running in offline mode.", error);
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
