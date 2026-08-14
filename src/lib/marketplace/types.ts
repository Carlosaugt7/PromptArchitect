// Tipos do módulo Plugin & MCP Marketplace + Custom Skills Builder.

/** Categorias suportadas pelo marketplace. */
export type PluginCategory =
  | "prompting"
  | "agents"
  | "mcp"
  | "skills"
  | "integrations"
  | "workflows"
  | "themes"
  | "productivity";

/** Tipos de arquivo que um plugin pode entregar. */
export type PluginFileKind =
  | "skill"
  | "agent"
  | "workflow"
  | "script"
  | "config"
  | "prompt";

/** Metadados públicos de um plugin (presentes no registry e na instalação). */
export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: PluginCategory;
  tags: string[];
  homepage?: string;
  icon?: string;
  requires?: string[];
  enabled: boolean;
  installedAt?: number;
}

/** Arquivo entregue por um plugin instalado. */
export interface PluginFile {
  path: string;
  content: string;
  kind: PluginFileKind;
}

/** Plugin completo: manifesto + arquivos entregues. */
export interface Plugin {
  manifest: PluginManifest;
  files: PluginFile[];
}

/** Skill customizada criada pelo usuário no builder. */
export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  version: string;
  content: string;
  author: string;
  tags: string[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

/** Template pré-pronto usado como ponto de partida no builder. */
export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  defaultContent: string;
}

/** Avaliação de um plugin feita por um usuário. */
export interface PluginRating {
  pluginId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: number;
}

/** Resumo agregado de avaliações de um plugin. */
export interface PluginRatingSummary {
  average: number;
  count: number;
}
