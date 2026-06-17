import { useEffect, useRef } from "react";
import type { Artifact } from "@/lib/artifact-store";

const PREVIEW_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; font-family: system-ui; }
    #root { padding: 16px; }
  </style>
  
  <!-- Tailwind (injetado) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- 1. Import Maps para resolver dependências do código do usuário -->
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "lucide-react": "https://esm.sh/lucide-react@0.400.0"
    }
  }
  </script>

  <!-- 2. Adição do Babel Standalone para transpilação in-browser -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';

    const root = createRoot(document.getElementById('root'));
    let currentCode = '';

    async function render(code) {
      try {
        // Transpila o JSX para JS padrão mantendo os ES Modules nativos
        const transformed = Babel.transform(code, {
          presets: ['react']
        }).code;

        // Cria o módulo executável
        const blob = new Blob([transformed], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        // Executa dinamicamente
        const mod = await import(/* @vite-ignore */ url);
        const Component = mod.default;
        
        if (!Component) throw new Error("O código deve ter um 'export default'.");

        root.render(React.createElement(Component));
      } catch (err) {
        // Exibe o erro de sintaxe/execução na própria tela de preview
        root.render(
          React.createElement('pre', { style: { color: '#ff4444', padding: '16px', background: '#fee', whiteSpace: 'pre-wrap' } }, err.toString())
        );
      }
    }

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'update-code' && e.data.code !== currentCode) {
        currentCode = e.data.code;
        render(currentCode);
      }
    });

    window.parent?.postMessage({ type: 'iframe-ready' }, '*');
  </script>
</body>
</html>`;

export function FastReactPreview({ artifact }: { artifact: Artifact }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Combina todos os blocos de código React em uma única string
    const code = artifact.blocks
      .filter((b) => /^(tsx|jsx|ts|js)$/i.test(b.lang))
      .map((b) => b.code)
      .join("\n\n");

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "iframe-ready") {
        iframe.contentWindow?.postMessage({ type: "update-code", code }, "*");
      }
    };

    window.addEventListener("message", handleMessage);

    // Se o iframe já estiver carregado (hot-reload ou re-render), manda direto
    if (iframe.contentDocument?.readyState === "complete") {
      iframe.contentWindow?.postMessage({ type: "update-code", code }, "*");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [artifact]);

  return (
    <iframe
      ref={iframeRef}
      title="React Preview"
      sandbox="allow-scripts allow-same-origin"
      srcDoc={PREVIEW_HTML}
      className="h-full w-full border-0 bg-white"
    />
  );
}
