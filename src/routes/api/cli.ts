import { createFileRoute } from "@tanstack/react-router";
import { spawn, exec } from "node:child_process";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
};

interface CliRequest {
  tool: string;
  command: string;
  env?: Record<string, string>;
  projectPath?: string;
}

export const Route = createFileRoute("/api/cli")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as CliRequest;
          const { command, env, projectPath } = body;

          if (!command) {
            return new Response(JSON.stringify({ error: "Comando é obrigatório" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }

          // Filtra variáveis de ambiente vazias
          const cleanEnv: Record<string, string> = {};
          if (env) {
            for (const [k, v] of Object.entries(env)) {
              if (v && v.trim() !== "") {
                cleanEnv[k] = v.trim();
              }
            }
          }

          // Configura o fluxo de dados em tempo real (SSE/ReadableStream)
          const encoder = new TextEncoder();
          let childProcess: any = null;

          const stream = new ReadableStream({
            start(controller) {
              try {
                // Spawna o comando no diretório atual ou customizado utilizando a shell do sistema
                childProcess = spawn(command, {
                  shell: true,
                  cwd: projectPath ? projectPath.trim() : process.cwd(),
                  env: {
                    ...process.env,
                    ...cleanEnv,
                  },
                });

                childProcess.stdout.on("data", (data: Buffer) => {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({ type: "stdout", text: data.toString() }) + "\n",
                    ),
                  );
                });

                childProcess.stderr.on("data", (data: Buffer) => {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({ type: "stderr", text: data.toString() }) + "\n",
                    ),
                  );
                });

                childProcess.on("close", (code: number | null) => {
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ type: "exit", code: code ?? 0 }) + "\n"),
                  );
                  controller.close();
                });

                childProcess.on("error", (err: Error) => {
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ type: "error", message: err.message }) + "\n"),
                  );
                  controller.close();
                });
              } catch (e: any) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "error", message: e.message }) + "\n"),
                );
                controller.close();
              }
            },
            cancel() {
              // Se a requisição for abortada/cancelada pelo cliente, mata o processo filho
              if (childProcess) {
                try {
                  if (process.platform === "win32") {
                    // Mata o processo e toda a árvore de processos descendentes de forma forçada no Windows
                    exec(`taskkill /pid ${childProcess.pid} /f /t`);
                  } else {
                    childProcess.kill("SIGINT");
                  }
                } catch {
                  /* ignore */
                }
              }
            },
          });

          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              ...cors,
            },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Erro interno no servidor",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...cors },
            },
          );
        }
      },
    },
  },
});
