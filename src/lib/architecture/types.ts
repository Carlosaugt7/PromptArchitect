/**
 * Tipos do módulo Architecture Designer do PromptArchitect.
 * Modelo C4 (níveis 1–4) e artefatos de design de sistemas.
 */

/** Níveis do modelo C4 (1 = contexto, 2 = containers, 3 = componentes, 4 = código). */
export type C4Level = 1 | 2 | 3 | 4;

/** Pessoa (ator) que interage com os sistemas. */
export interface Person {
  id: string;
  name: string;
  description: string;
  role: string;
}

/** Sistema de software no nível de contexto. */
export interface SoftwareSystem {
  id: string;
  name: string;
  description: string;
  type: "internal" | "external";
  owner?: string;
}

/** Tipos de container (aplicação executável ou armazenamento de dados). */
export type ContainerType =
  | "web"
  | "api"
  | "mobile"
  | "desktop"
  | "database"
  | "queue"
  | "cache"
  | "worker"
  | "gateway"
  | "other";

/** Container: unidade executável/de dados que compõe um sistema. */
export interface Container {
  id: string;
  name: string;
  technology: string;
  description: string;
  systemId: string;
  type: ContainerType;
}

/** Componente: bloco funcional dentro de um container. */
export interface Component {
  id: string;
  name: string;
  technology: string;
  description: string;
  containerId: string;
  responsibility: string;
  stereotype?: string;
}

/** Relacionamento entre dois elementos do modelo C4. */
export interface Relationship {
  id: string;
  from: string;
  to: string;
  description?: string;
  technology?: string;
  tags?: string[];
}

/** Modelo C4 completo, persistido localmente. */
export interface C4Model {
  id: string;
  name: string;
  description: string;
  level: C4Level;
  persons: Person[];
  systems: SoftwareSystem[];
  containers: Container[];
  components: Component[];
  relationships: Relationship[];
  createdAt: number;
  updatedAt: number;
}

/** Canvas de design de sistemas (decisões, restrições, riscos...). */
export interface SystemDesignCanvas {
  id: string;
  name: string;
  description: string;
  contexts: string[];
  constraints: string[];
  decisions: string[];
  qualities: string[];
  risks: string[];
  alternatives: string[];
}

/** Categoria de uma entrada da stack tecnológica. */
export type TechStackCategory =
  | "language"
  | "framework"
  | "database"
  | "cache"
  | "queue"
  | "infra"
  | "observability"
  | "security"
  | "other";

/** Entrada da stack tecnológica de um documento de arquitetura. */
export interface TechStackEntry {
  name: string;
  version: string;
  category: TechStackCategory;
  purpose: string;
}

/** Documento de arquitetura que agrega modelos C4, canvas e stack. */
export interface ArchitectureDocument {
  id: string;
  name: string;
  description: string;
  c4Models: string[];
  designCanvas?: SystemDesignCanvas;
  techStack: TechStackEntry[];
  patterns: string[];
  createdAt: number;
  updatedAt: number;
}

/** Cenário para geração de diagrama de sequência. */
export interface SequenceScenario {
  name: string;
  participants: string[];
  messages: { from: string; to: string; label: string }[];
}

/** Campo de uma entidade no diagrama ER. */
export interface EntityField {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
  nullable?: boolean;
}

/** Cardinalidade de uma relação no diagrama ER. */
export type RelationCardinality = "1..1" | "1..N" | "N..M";

/** Relação entre entidades no diagrama ER. */
export interface EntityRelation {
  from: string;
  to: string;
  type: RelationCardinality;
}

/** Entidade para geração de diagrama ER. */
export interface EntityDef {
  name: string;
  fields: EntityField[];
  relations: EntityRelation[];
}

/** Tipo de diagrama suportado pelo renderizador. */
export type DiagramType = "mermaid" | "plantuml";

/** Resultado da renderização de um diagrama. */
export interface DiagramRender {
  code: string;
  type: DiagramType;
  /**
   * URL-base para renderização externa via Kroki. O payload deve ser anexado
   * após "/svg/" no formato base64+deflate. Campo mantido com o nome
   * "mermaidUrl" por compatibilidade com o contrato público.
   */
  mermaidUrl: string;
}
