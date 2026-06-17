import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AutoDebugPanel } from "@/components/AutoDebugPanel";
import { OnboardingHint } from "@/components/OnboardingHint";
import { startAutoDebug } from "@/lib/auto-debug";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AuthPage } from "@/components/AuthPage";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold gradient-text font-display">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tente recarregar ou voltar ao início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b0b14" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "OmniForge" },
      { title: "OmniForge — Forje aplicações com IA" },
      {
        name: "description",
        content:
          "OmniForge é um ambiente de desenvolvimento conversacional com IA. Descreva e veja seu app ganhar vida em tempo real.",
      },
      { property: "og:title", content: "OmniForge — Forje aplicações com IA" },
      {
        property: "og:description",
        content:
          "Construa apps web conversando com IA. Preview ao vivo, código, banco e logs em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body data-density="cozy">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    startAutoDebug();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
      <Toaster richColors theme="dark" position="bottom-right" />
    </QueryClientProvider>
  );
}

function AuthGate() {
  const { user, loading, firebaseAvailable } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  // Firebase indisponível (API key inválida/ausente) — modo offline
  if (!firebaseAvailable) {
    // Se estiver em produção, mostra um erro de configuração em vez de liberar o acesso bypassado
    if (import.meta.env.PROD) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center border border-destructive/30 bg-destructive/5 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-destructive">
              Erro de Configuração do Firebase
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              As variáveis de ambiente do Firebase (como{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">VITE_FIREBASE_API_KEY</code>)
              não foram configuradas ou não foram expostas no seu painel de hospedagem de produção.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Configure as variáveis de ambiente com o prefixo{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">VITE_</code> no seu provedor de
              deploy e realize um novo build.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <Outlet />
        <AutoDebugPanel />
        <OnboardingHint />
      </>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Outlet />
      <AutoDebugPanel />
      <OnboardingHint />
    </>
  );
}

// label placeholder aria-label
// <title> Head> name="description" og: </title>
