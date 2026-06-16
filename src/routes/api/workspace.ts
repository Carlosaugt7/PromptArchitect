import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs/promises";
import path from "node:path";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
};

// Pastas ignoradas na listagem do workspace
const IGNORE_DIRS = [
  "node_modules",
  ".git",
  ".output",
  ".tanstack",
  ".wrangler",
  "dist",
  "build",
  ".next",
  ".lovable",
];

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileNode[];
}

async function getWorkspaceTree(dirPath: string, relativeRoot = ""): Promise<FileNode[]> {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const item of items) {
    if (IGNORE_DIRS.includes(item.name)) continue;

    const relPath = relativeRoot ? `${relativeRoot}/${item.name}` : item.name;
    const absPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      const children = await getWorkspaceTree(absPath, relPath);
      nodes.push({
        name: item.name,
        path: relPath,
        type: "directory",
        children: children.sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      });
    } else {
      let size = 0;
      try {
        const stat = await fs.stat(absPath);
        size = stat.size;
      } catch {
        /* ignore */
      }
      nodes.push({
        name: item.name,
        path: relPath,
        type: "file",
        size,
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export const Route = createFileRoute("/api/workspace")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const filePathParam = url.searchParams.get("path");

          // Se passar um caminho de arquivo, lê o conteúdo
          if (filePathParam) {
            const safePath = path.join(process.cwd(), path.normalize(filePathParam).replace(/^(\.\.(\/|\\))+/, ""));
            const content = await fs.readFile(safePath, "utf-8");
            return new Response(JSON.stringify({ content }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }

          // Caso contrário, lista a árvore de arquivos do workspace
          const tree = await getWorkspaceTree(process.cwd());
          return new Response(JSON.stringify({ tree }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...cors },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno no servidor" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...cors },
            }
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const { path: fileTarget, content } = (await request.json()) as { path: string; content: string };
          if (!fileTarget || content === undefined) {
            return new Response(JSON.stringify({ error: "Caminho (path) e conteúdo são obrigatórios" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }

          const safePath = path.join(process.cwd(), path.normalize(fileTarget).replace(/^(\.\.(\/|\\))+/, ""));
          
          // Garante a existência da pasta pai do arquivo
          await fs.mkdir(path.dirname(safePath), { recursive: true });
          
          // Grava o arquivo
          await fs.writeFile(safePath, content, "utf-8");

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...cors },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno no servidor" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...cors },
            }
          );
        }
      },
    },
  },
});
