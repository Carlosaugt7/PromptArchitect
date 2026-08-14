"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crown,
  Database,
  FileText,
  FolderKanban,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  addTextSource,
  addWorkspaceMember,
  buildContextBlock,
  createKnowledgeBase,
  createWorkspace,
  deleteWorkspace,
  getChunksForKb,
  getKnowledgeBaseStats,
  getWorkspaceRoleLabel,
  listKnowledgeBasesByWorkspace,
  listSourcesForKb,
  listWorkspaces,
  removeWorkspaceMember,
  searchAcrossWorkspace,
  searchKnowledge,
  subscribeKnowledge,
  updateWorkspace,
  type KnowledgeBase,
  type KnowledgeBaseStats,
  type KnowledgeChunk,
  type KnowledgeSource,
  type SearchResult,
  type Workspace,
  type WorkspaceRole,
} from "@/lib/knowledge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgeBaseDialog({ open, onOpenChange }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState("");
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);

  const selectedWorkspaceIdRef = useRef("");
  const selectedBaseIdRef = useRef("");

  // Formulários
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [baseName, setBaseName] = useState("");
  const [baseDescription, setBaseDescription] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [contextBlock, setContextBlock] = useState("");

  const selectWorkspace = useCallback((id: string) => {
    selectedWorkspaceIdRef.current = id;
    setSelectedWorkspaceId(id);
    const kbList = listKnowledgeBasesByWorkspace(id);
    setBases(kbList);
    const kbId = kbList[0]?.id ?? "";
    selectedBaseIdRef.current = kbId;
    setSelectedBaseId(kbId);
    if (kbId) {
      setSources(listSourcesForKb(kbId));
      setChunks(getChunksForKb(kbId));
      setStats(getKnowledgeBaseStats(kbId));
    } else {
      setSources([]);
      setChunks([]);
      setStats(null);
    }
  }, []);

  const selectBase = useCallback((id: string) => {
    selectedBaseIdRef.current = id;
    setSelectedBaseId(id);
    setSources(listSourcesForKb(id));
    setChunks(getChunksForKb(id));
    setStats(getKnowledgeBaseStats(id));
  }, []);

  const reload = useCallback(() => {
    setWorkspaces(listWorkspaces());
    const wsId = selectedWorkspaceIdRef.current;
    if (wsId) setBases(listKnowledgeBasesByWorkspace(wsId));
    const kbId = selectedBaseIdRef.current;
    if (kbId) {
      setSources(listSourcesForKb(kbId));
      setChunks(getChunksForKb(kbId));
      setStats(getKnowledgeBaseStats(kbId));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const wsList = listWorkspaces();
    if (!selectedWorkspaceIdRef.current && wsList.length) {
      selectedWorkspaceIdRef.current = wsList[0].id;
      setSelectedWorkspaceId(wsList[0].id);
    }
    const wsId = selectedWorkspaceIdRef.current;
    const kbList = wsId ? listKnowledgeBasesByWorkspace(wsId) : [];
    if (!selectedBaseIdRef.current && kbList.length) {
      selectedBaseIdRef.current = kbList[0].id;
      setSelectedBaseId(kbList[0].id);
    }
    reload();
  }, [open, reload]);

  useEffect(() => {
    if (!open) return;
    return subscribeKnowledge(() => reload());
  }, [open, reload]);

  // ─── Workspaces ───
  const handleCreateWorkspace = () => {
    const ws = createWorkspace(wsName.trim(), wsDescription.trim());
    setWsName("");
    setWsDescription("");
    selectWorkspace(ws.id);
    toast.success("Workspace criado");
  };

  const handleDeleteWorkspace = (id: string) => {
    deleteWorkspace(id);
    if (selectedWorkspaceIdRef.current === id) {
      selectedWorkspaceIdRef.current = "";
      setSelectedWorkspaceId("");
      selectedBaseIdRef.current = "";
      setSelectedBaseId("");
      setBases([]);
      setSources([]);
      setChunks([]);
      setStats(null);
    }
    toast.success("Workspace excluído");
    reload();
  };

  // ─── Documentos ───
  const handleCreateBase = () => {
    if (!selectedWorkspaceIdRef.current) {
      toast.error("Selecione um workspace primeiro");
      return;
    }
    const base = createKnowledgeBase(
      selectedWorkspaceIdRef.current,
      baseName.trim(),
      baseDescription.trim(),
    );
    setBaseName("");
    setBaseDescription("");
    selectBase(base.id);
    reload();
    toast.success("Base de conhecimento criada");
  };

  const handleAddSource = () => {
    if (!selectedBaseIdRef.current) {
      toast.error("Selecione uma base de conhecimento");
      return;
    }
    if (!sourceContent.trim()) {
      toast.error("Informe o conteúdo da fonte");
      return;
    }
    addTextSource(selectedBaseIdRef.current, sourceTitle.trim(), sourceContent.trim());
    setSourceTitle("");
    setSourceContent("");
    reload();
    toast.success("Fonte adicionada");
  };

  // ─── Busca ───
  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) {
      toast.error("Digite um termo para buscar");
      return;
    }
    const results =
      selectedBaseIdRef.current
        ? searchKnowledge(selectedBaseIdRef.current, q)
        : selectedWorkspaceIdRef.current
          ? searchAcrossWorkspace(selectedWorkspaceIdRef.current, q)
          : [];
    setSearchResults(results);
    setContextBlock(buildContextBlock(results));
    if (!results.length) toast.info("Nenhum resultado encontrado");
  };

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const selectedBase = bases.find((b) => b.id === selectedBaseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Database className="h-4 w-4 text-primary" />
            Base de Conhecimento
          </DialogTitle>
          <DialogDescription>
            Gerencie workspaces, documentos e buscas semânticas (RAG) para alimentar seus prompts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="workspaces" className="mt-2">
          <TabsList>
            <TabsTrigger value="workspaces" className="gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" />
              Workspaces
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Busca (RAG)
            </TabsTrigger>
          </TabsList>

          {/* ─── Workspaces ─── */}
          <TabsContent value="workspaces" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo workspace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ws-name">Nome</Label>
                    <Input
                      id="ws-name"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="Ex.: Vendas"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ws-desc">Descrição</Label>
                    <Input
                      id="ws-desc"
                      value={wsDescription}
                      onChange={(e) => setWsDescription(e.target.value)}
                      placeholder="Objetivo do workspace"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleCreateWorkspace}>
                  <Plus className="h-3.5 w-3.5" />
                  Criar workspace
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workspaces.map((ws) => (
                <WorkspaceCard key={ws.id} workspace={ws} onDelete={handleDeleteWorkspace} />
              ))}
            </div>
            {workspaces.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum workspace criado ainda. Comece criando o primeiro acima.
              </p>
            )}
          </TabsContent>

          {/* ─── Documentos ─── */}
          <TabsContent value="documents" className="space-y-4">
            {workspaces.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Crie um workspace na aba “Workspaces” antes de gerenciar documentos.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Workspace</Label>
                    <Select
                      value={selectedWorkspaceId || undefined}
                      onValueChange={selectWorkspace}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Base de conhecimento</Label>
                    <Select
                      value={selectedBaseId || undefined}
                      onValueChange={selectBase}
                      disabled={!selectedWorkspaceId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {bases.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {stats && (
                  <div className="grid grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Fontes</p>
                        <p className="text-2xl font-semibold font-display">{stats.sourceCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Chunks</p>
                        <p className="text-2xl font-semibold font-display">{stats.chunkCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Caracteres</p>
                        <p className="text-2xl font-semibold font-display">
                          {stats.totalChars.toLocaleString("pt-BR")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Nova base de conhecimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="base-name">Nome</Label>
                        <Input
                          id="base-name"
                          value={baseName}
                          onChange={(e) => setBaseName(e.target.value)}
                          placeholder="Ex.: Manuais internos"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="base-desc">Descrição</Label>
                        <Input
                          id="base-desc"
                          value={baseDescription}
                          onChange={(e) => setBaseDescription(e.target.value)}
                          placeholder="Conteúdo coberto pela base"
                        />
                      </div>
                    </div>
                    <Button size="sm" onClick={handleCreateBase} disabled={!selectedWorkspaceId}>
                      <Plus className="h-3.5 w-3.5" />
                      Criar base
                    </Button>
                  </Card