import { Sandpack } from "@codesandbox/sandpack-react";
import type { Artifact } from "@/lib/artifact-store";

export function SandpackPreview({ artifact }: { artifact: Artifact }) {
  const files: Record<string, string> = {};

  let tsxCount = 0;
  let hasAppTsx = false;

  // Monta a estrutura de arquivos para o Sandpack
  artifact.blocks.forEach((b) => {
    const lines = b.code.split("\n");
    const firstLine = lines[0] || "";
    let filename = "";

    // Procura na primeira linha por comentário com nome do arquivo (ex: // app/page.tsx)
    const match = firstLine.match(/\/\/\s*([a-zA-Z0-9_./-]+\.(tsx|ts|jsx|js|css))/);

    if (match) {
      filename = `/${match[1].replace(/^\//, "")}`;
    } else {
      if (/^(tsx|jsx)$/i.test(b.lang)) {
        if (!hasAppTsx) {
          filename = "/App.tsx";
          hasAppTsx = true;
        } else {
          tsxCount++;
          filename = `/Component${tsxCount}.tsx`;
        }
      } else if (/^(ts|js)$/i.test(b.lang)) {
        filename = `/utils${++tsxCount}.${b.lang}`;
      } else if (b.lang === "css") {
        filename = "/styles.css";
      } else {
        filename = `/file${++tsxCount}.${b.lang}`;
      }
    }

    // Se o arquivo for do nextjs (app/page.tsx), mapeamos para App.tsx no sandpack basic react template
    if (filename === "/app/page.tsx" || filename === "/pages/index.tsx") {
      filename = "/App.tsx";
    }

    files[filename] = b.code;
  });

  // Se o usuário injetou tailwind no código, precisamos garantir que o template padrão
  // do react do Sandpack saiba lidar com isso (via CDN no html ou script).
  // Mas como o sandpack react-ts template não tem tailwind pré-configurado fácil,
  // injetamos o script tailwind no public/index.html se detectarmos classes tailwind.
  const hasTailwind = Object.values(files).some((code) => code.includes('className="'));

  if (hasTailwind && !files["/public/index.html"]) {
    files["/public/index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sandpack</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }

  // Se não montamos nenhum App.tsx, e existe algum .tsx, transformamos ele no principal
  if (!files["/App.tsx"]) {
    const firstTsx = Object.keys(files).find((k) => k.endsWith(".tsx"));
    if (firstTsx) {
      files["/App.tsx"] = files[firstTsx];
      delete files[firstTsx];
    }
  }

  return (
    <div className="h-full w-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-none [&_.sp-layout]:border-0 [&_.sp-wrapper]:h-full">
      <Sandpack
        template="react-ts"
        theme="dark"
        files={files}
        options={{
          showNavigator: true,
          showTabs: true,
          editorHeight: "100%",
        }}
      />
    </div>
  );
}
