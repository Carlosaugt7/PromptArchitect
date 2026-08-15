/**
 * Dashboard de Governança de Artefatos
 * Gerencia versionamento, validação e testes de prompts/documentos
 */

import { useState, useEffect } from "react";
import {
  FileText,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Download,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { VersionedArtifact, TestCase } from "@/lib/governance/version-control";
import {
  validateProductionReadiness,
  checkModelCompatibility,
  generateChangelog,
  exportArtifact,
  importArtifact,
} from "@/lib/governance/version-control";

export function ArtifactGovernanceDashboard() {
  const [artifacts, setArtifacts] = useState<VersionedArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<VersionedArtifact | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Load artifacts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("promptarchitect.artifacts");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setArtifacts(parsed.map((a: any) => importArtifact(JSON.stringify(a))));
      } catch (err) {
        console.error("Failed to load artifacts:", err);
      }
    }
  }, []);

  // Save artifacts to localStorage
  const saveArtifacts = (updated: VersionedArtifact[]) => {
    setArtifacts(updated);
    localStorage.setItem("promptarchitect.artifacts", JSON.stringify(updated));
  };

  // Filtered artifacts
  const filteredArtifacts = artifacts.filter((a) => {
    const matchesSearch =
      search === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.version.toString().toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "all" || a.metadata.status === filterStatus;
    const matchesType = filterType === "all" || a.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Run test case
  const runTestCase = async (artifactId: string, testId: string) => {
    const artifact = artifacts.find((a) => a.id === artifactId);
    if (!artifact) return;

    const testCase = artifact.testCases.find((t) => t.id === testId);
    if (!testCase) return;

    toast.info(`Executando teste: ${testCase.name}...`);

    // Simulate test execution (in real app, would call LLM)
    setTimeout(() => {
      const updated = artifacts.map((a) => {
        if (a.id === artifactId) {
          return {
            ...a,
            testCases: a.testCases.map((t) => {
              if (t.id === testId) {
                // Randomly pass or fail for demo
                const passed = Math.random() > 0.3;
                return {
                  ...t,
                  status: passed ? ("passed" as const) : ("failed" as const),
                  actualOutput: passed
                    ? t.expectedOutput
                    : "Output diferente do esperado",
                  lastRun: new Date(),
                };
              }
              return t;
            }),
          };
        }
        return a;
      });

      saveArtifacts(updated);
      toast.success(
        testCase.status === "passed"
          ? `✅ Teste passou: ${testCase.name}`
          : `❌ Teste falhou: ${testCase.name}`
      );
    }, 2000);
  };

  // Run all tests for artifact
  const runAllTests = (artifactId: string) => {
    const artifact = artifacts.find((a) => a.id === artifactId);
    if (!artifact) return;

    artifact.testCases.forEach((test) => {
      runTestCase(artifactId, test.id);
    });
  };

  // Export artifact
  const handleExport = (artifact: VersionedArtifact) => {
    const json = exportArtifact(artifact);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.type}_${artifact.name}_${artifact.version.toString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Artefato exportado com sucesso");
  };

  // Import artifact
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const artifact = importArtifact(json);
        saveArtifacts([...artifacts, artifact]);
        toast.success(`Artefato importado: ${artifact.name}`);
      } catch (err) {
        toast.error("Erro ao importar artefato");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // Approve artifact
  const approveArtifact = (artifactId: string) => {
    const updated = artifacts.map((a) => {
      if (a.id === artifactId) {
        return {
          ...a,
          metadata: {
            ...a.metadata,
            status: "approved" as const,
            approvedBy: "current-user",
            approvedAt: new Date(),
          },
        };
      }
      return a;
    });
    saveArtifacts(updated);
    toast.success("Artefato aprovado!");
  };

  // Get validation report
  const getValidationReport = (artifact: VersionedArtifact) => {
    return validateProductionReadiness(artifact);
  };

  // Stats
  const stats = {
    total: artifacts.length,
    approved: artifacts.filter((a) => a.metadata.status === "approved").length,
    draft: artifacts.filter((a) => a.metadata.status === "draft").length,
    review: artifacts.filter((a) => a.metadata.status === "review").length,
    testsTotal: artifacts.reduce((sum, a) => sum + a.testCases.length, 0),
    testsPassed: artifacts.reduce(
      (sum, a) => sum + a.testCases.filter((t) => t.status === "passed").length,
      0
    ),
    testsFailed: artifacts.reduce(
      (sum, a) => sum + a.testCases.filter((t) => t.status === "failed").length,
      0
    ),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Governança de Artefatos</h1>
          <p className="text-muted-foreground">
            Gerencie versionamento, testes e validação de prompts/documentos
          </p>
        </div>
        <div className="flex gap-2">
          <label htmlFor="import-artifact">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </span>
            </Button>
          </label>
          <input
            id="import-artifact"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Artefatos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approved} aprovados, {stats.draft} rascunhos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Testes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testsTotal}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.testsPassed} ✓</span>
              {" / "}
              <span className="text-red-600">{stats.testsFailed} ✗</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
            </div>
            <Progress
              value={stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso (Testes)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.testsTotal > 0
                ? Math.round((stats.testsPassed / stats.testsTotal) * 100)
                : 0}
              %
            </div>
            <Progress
              value={stats.testsTotal > 0 ? (stats.testsPassed / stats.testsTotal) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Artefatos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou versão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="review">Em Revisão</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="deprecated">Descontinuado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="system_prompt">System Prompt</SelectItem>
                <SelectItem value="prd">PRD</SelectItem>
                <SelectItem value="trd">TRD</SelectItem>
                <SelectItem value="mcp_manifest">MCP Manifest</SelectItem>
                <SelectItem value="api_spec">API Spec</SelectItem>
                <SelectItem value="design_system">Design System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredArtifacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum artefato encontrado</p>
              <p className="text-sm">Importe ou crie um novo artefato para começar</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Testes</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArtifacts.map((artifact) => {
                    const validation = getValidationReport(artifact);
                    const testsPassed = artifact.testCases.filter(
                      (t) => t.status === "passed"
                    ).length;
                    const testsTotal = artifact.testCases.length;

                    return (
                      <TableRow key={artifact.id}>
                        <TableCell className="font-medium">{artifact.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {artifact.type.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {artifact.version.toString()}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              artifact.metadata.status === "approved"
                                ? "default"
                                : artifact.metadata.status === "draft"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {artifact.metadata.status === "approved" && (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            {artifact.metadata.status === "draft" && (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {artifact.metadata.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {testsTotal > 0 ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  testsPassed === testsTotal
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                }
                              >
                                {testsPassed}/{testsTotal}
                              </span>
                              {validation.ready ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(artifact.metadata.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setSelectedArtifact(artifact)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              {testsTotal > 0 && (
                                <DropdownMenuItem onClick={() => runAllTests(artifact.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Executar Testes
                                </DropdownMenuItem>
                              )}
                              {artifact.metadata.status !== "approved" && (
                                <DropdownMenuItem onClick={() => approveArtifact(artifact.id)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Aprovar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleExport(artifact)}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar JSON
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Artifact Details Modal (simplified, would be a proper Dialog in production) */}
      {selectedArtifact && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedArtifact.name}</CardTitle>
                <CardDescription>
                  {selectedArtifact.type.replace("_", " ").toUpperCase()} •{" "}
                  {selectedArtifact.version.toString()}
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedArtifact(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="tests">Testes ({selectedArtifact.testCases.length})</TabsTrigger>
                <TabsTrigger value="changelog">Changelog</TabsTrigger>
                <TabsTrigger value="validation">Validação</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Metadados</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Autor:</dt>
                    <dd>{selectedArtifact.metadata.author}</dd>
                    <dt className="text-muted-foreground">Criado em:</dt>
                    <dd>{new Date(selectedArtifact.metadata.createdAt).toLocaleString()}</dd>
                    <dt className="text-muted-foreground">Atualizado em:</dt>
                    <dd>{new Date(selectedArtifact.metadata.updatedAt).toLocaleString()}</dd>
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd>
                      <Badge>{selectedArtifact.metadata.status}</Badge>
                    </dd>
                  </dl>
                </div>
              </TabsContent>

              <TabsContent value="tests" className="space-y-4">
                {selectedArtifact.testCases.map((test) => (
                  <Card key={test.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{test.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {test.type.replace("_", " ")}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {test.status === "passed" && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Passou
                            </Badge>
                          )}
                          {test.status === "failed" && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Falhou
                            </Badge>
                          )}
                          {test.status === "pending" && (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runTestCase(selectedArtifact.id, test.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Executar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <strong>Input:</strong>
                        <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                          {test.input}
                        </pre>
                      </div>
                      <div>
                        <strong>Output Esperado:</strong>
                        <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                          {test.expectedOutput}
                        </pre>
                      </div>
                      {test.actualOutput && (
                        <div>
                          <strong>Output Real:</strong>
                          <pre
                            className={`mt-1 p-2 rounded text-xs overflow-x-auto ${test.status === "passed" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                          >
                            {test.actualOutput}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="changelog">
                <ScrollArea className="h-[400px]">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap">
                      {generateChangelog(selectedArtifact.changelog)}
                    </pre>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="validation">
                {(() => {
                  const validation = getValidationReport(selectedArtifact);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {validation.ready ? (
                          <>
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                            <span className="font-medium text-green-600">
                              Pronto para Produção
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-6 w-6 text-red-600" />
                            <span className="font-medium text-red-600">Não Pronto</span>
                          </>
                        )}
                      </div>

                      {validation.blockers.length > 0 && (
                        <div>
                          <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Bloqueadores
                          </h4>
                          <ul className="space-y-1">
                            {validation.blockers.map((blocker, i) => (
                              <li key={i} className="text-sm text-red-600">
                                • {blocker}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validation.warnings.length > 0 && (
                        <div>
                          <h4 className="font-medium text-yellow-600 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Avisos
                          </h4>
                          <ul className="space-y-1">
                            {validation.warnings.map((warning, i) => (
                              <li key={i} className="text-sm text-yellow-600">
                                • {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
