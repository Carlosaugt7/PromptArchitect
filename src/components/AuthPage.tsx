import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-config";
import { Sparkles, Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast.error("Firebase não configurado");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (mode === "register" && !name.trim()) {
      toast.error("Preencha seu nome");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        toast.success("Conta criada com sucesso!");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        toast.success("Bem-vindo de volta!");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        "auth/email-already-in-use": "Este email já está em uso",
        "auth/invalid-email": "Email inválido",
        "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres)",
        "auth/user-not-found": "Usuário não encontrado",
        "auth/wrong-password": "Senha incorreta",
        "auth/invalid-credential": "Email ou senha incorretos",
        "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde",
      };
      toast.error(messages[code ?? ""] || "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  // Captura resultado do redirect (quando voltou de signInWithRedirect)
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) toast.success("Conectado com Google!");
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string }).code;
        if (code && code !== "auth/null-user") {
          toast.error("Erro ao conectar com Google: " + code);
        }
      });
  }, []);

  const handleGoogle = async () => {
    if (!auth) {
      toast.error("Firebase não configurado");
      return;
    }
    setBusy(true);
    try {
      // Tenta popup primeiro; se COOP bloquear, cai para redirect
      await signInWithPopup(auth, googleProvider);
      toast.success("Conectado com Google!");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/unauthorized-domain"
      ) {
        toast.error(
          "Domínio não autorizado. Adicione " + window.location.hostname + " no Firebase Console → Authentication → Authorized domains",
          { duration: 8000 },
        );
      } else if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/internal-error"
      ) {
        // COOP ou popup bloqueado — usa redirect como fallback
        toast.info("Redirecionando para autenticação Google…");
        await signInWithRedirect(auth, googleProvider);
      } else if (code !== "auth/popup-closed-by-user") {
        toast.error("Erro ao conectar com Google: " + (code ?? "desconhecido"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--brand)] rounded-full blur-[160px] opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--brand-glow)] rounded-full blur-[140px] opacity-10" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] blur-2xl opacity-40" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] glow">
              <Sparkles className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight gradient-text">PromptArchitect</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full rounded-xl border border-border bg-background/50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border border-border bg-background/50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-border bg-background/50 pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-glow)] py-2.5 text-sm font-semibold text-primary-foreground glow hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-background/50 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>

          {/* Toggle mode */}
          <p className="text-center text-xs text-muted-foreground mt-5">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-primary hover:underline font-medium"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          PromptArchitect © {new Date().getFullYear()} — Crie prompts com IA
        </p>
      </div>
    </div>
  );
}
