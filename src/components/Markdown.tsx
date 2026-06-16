import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import "highlight.js/styles/github-dark.css";

export function Markdown({ children }: { children: string }) {
  return (
    <div
      className="prose prose-sm prose-invert max-w-none break-words
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
  function copy() {
    const text = extractText(children);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="relative my-2 group">
      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-md bg-zinc-800/80 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
        title="Copiar"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
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
