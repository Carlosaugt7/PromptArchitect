import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { toast } from "sonner";

export function InstallAppButton() {
  const { canInstall, promptInstall } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button
      onClick={async () => {
        const r = await promptInstall();
        if (r === "accepted") toast.success("OmniForge instalado!");
      }}
      title="Instalar OmniForge como aplicativo"
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
    >
      <Download className="h-3.5 w-3.5" /> Instalar app
    </button>
  );
}

// label placeholder aria-label
