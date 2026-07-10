import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import "highlight.js/styles/github.css";
import { parseFilePathFromBlock } from "@/lib/project-import";

export function Markdown({ children }: { children: string }) {
  return (
    <div
      className="prose prose-sm max-w-none break-words dark:prose-invert
      prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-0
      prose-code:before:hidden prose-code:after:hidden
      prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1.5
      prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          code: ({ className, children, ...props }) => {
            const inline = !className;
            return inline ? (
              <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a: ({ children, ...props }) => (
            <a target="_blank" rel="noreferrer" className="text-primary underline" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  // Extract language from code component
  let lang = "";
  const fileContent = extractText(children);

  if (children && typeof children === "object" && "props" in children) {
    const childProps = (children as any).props || {};
    const className = childProps.className || "";
    const m = className.match(/language-(\w+)/);
    if (m) {
      lang = m[1];
    }
  }

  const parsedPath = parseFilePathFromBlock(lang, fileContent);

  function copy() {
    navigator.clipboard.writeText(fileContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function applyCode() {
    if (!parsedPath) return;
    window.dispatchEvent(
      new CustomEvent("omniforge:fast-apply", {
        detail: {
          path: parsedPath,
          code: fileContent,
        },
      }),
    );
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  return (
    <div className="relative my-2 group">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {parsedPath && (
          <button
            onClick={applyCode}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] font-semibold transition cursor-pointer"
            title={`Aplicar alterações em ${parsedPath}`}
          >
            {applied ? (
              <>
                <Check className="h-3 w-3" />
                <span>Aplicado!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 animate-pulse" />
                <span>Aplicar em {parsedPath.split("/").pop()}</span>
              </>
            )}
          </button>
        )}
        <button
          onClick={copy}
          className="grid h-7 w-7 place-items-center rounded-md bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
          title="Copiar Código"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs">{children}</pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}
