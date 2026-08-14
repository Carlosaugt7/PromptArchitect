/**
 * CRUD do modelo C4 (Architecture Designer do PromptArchitect).
 * Persistência client-side via localStorage.
 */

import { safeUUID } from "@/lib/utils";
import type {
  C4Level,
  C4Model,
  Component,
  Container,
  Person,
  Relationship,
  SoftwareSystem,
} from "./types";

const STORAGE_KEY = "promptarchitect.architecture.c4";
const EVENT = "promptarchitect:architecture-changed";

type Listener = () => void;

/** Coleções de entidades dentro de um modelo C4. */
type EntityField =
  | "persons"
  | "systems"
  | "containers"
  | "components"
  | "relationships";

function loadModels(): C4Model[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as C4Model[];
  } catch {
    return [];
  }
}

function persistModels(models: C4Model[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  window.dispatchEvent(new Event(EVENT));
}

/** Aplica uma mutação em um modelo, persiste e retorna o modelo atualizado. */
function mutateModel(modelId: string, fn: (model: C4Model) => C4Model): C4Model | null {
  const models = loadModels();
  const index = models.findIndex((m) => m.id === modelId);
  if (index < 0) return null;
  const updated: C4Model = { ...fn(models[index]), updatedAt: Date.now() };
  models[index] = updated;
  persistModels(models);
  return updated;
}

/** Assina mudanças no armazenamento de arquitetura (evento local + evento "storage"). */
export function subscribeArchitecture(cb: Listener): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Cria um novo modelo C4 vazio. */
export function createC4Model(name: string, description = "", level: C4Level = 1): C4Model {
  const now = Date.now();
  const model: C4Model = {
    id: safeUUID(),
    name: name.trim() || "Modelo sem nome",
    description,
    level,
    persons: [],
    systems: [],
    containers: [],
    components: [],
    relationships: [],
    createdAt: now,
    updatedAt: now,
  };
  const models = loadModels();
  models.push(model);
  persistModels(models);
  return model;
}

/** Retorna um modelo C4 pelo id, ou null se não existir. */
export function getC4Model(id: string): C4Model | null {
  return loadModels().find((m) => m.id === id) ?? null;
}

/** Lista os modelos C4 ordenados por atualização (mais recentes primeiro). */
export function listC4Models(): C4Model[] {
  return loadModels().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Atualiza os campos de um modelo C4. */
export function updateC4Model(
  id: string,
  patch: Partial<Omit<C4Model, "id" | "createdAt" | "updatedAt">>,
): C4Model | null {
  return mutateModel(id, (m) => ({ ...m, ...patch }));
}

/** Remove um modelo C4. */
export function deleteC4Model(id: string): void {
  persistModels(loadModels().filter((m) => m.id !== id));
}

/** Adiciona uma entidade a uma coleção do modelo, gerando o id. */
function addEntity<T extends { id: string }>(
  modelId: string,
  field: EntityField,
  data: Omit<T, "id">,
): T | null {
  const item = { ...data, id: safeUUID() } as T;
  const updated = mutateModel(modelId, (m) => {
    const list = m[field] as unknown as T[];
    return { ...m, [field]: [...list, item] } as C4Model;
  });
  return updated ? item : null;
}

/** Atualiza uma entidade de uma coleção do modelo. */
function updateEntity<T extends { id: string }>(
  modelId: string,
  field: EntityField,
  entityId: string,
  patch: Partial<Omit<T, "id">>,
): T | null {
  let result: T | null = null;
  mutateModel(modelId, (m) => {
    const next = (m[field] as unknown as T[]).map((e) =>
      e.id === entityId ? ({ ...e, ...patch } as T) : e,
    );
    result = next.find((e) => e.id === entityId) ?? null;
    return { ...m, [field]: next } as C4Model;
  });
  return result;
}

/** Remove uma entidade simples de uma coleção do modelo. */
function removeEntity(modelId: string, field: EntityField, entityId: string): void {
  mutateModel(modelId, (m) => {
    const next = (m[field] as unknown as { id: string }[]).filter((e) => e.id !== entityId);
    return { ...m, [field]: next } as C4Model;
  });
}

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

export function addPerson(modelId: string, data: Omit<Person, "id">): Person | null {
  return addEntity(modelId, "persons", data);
}

export function updatePerson(
  modelId: string,
  personId: string,
  patch: Partial<Omit<Person, "id">>,
): Person | null {
  return updateEntity(modelId, "persons", personId, patch);
}

export function removePerson(modelId: string, personId: string): void {
  mutateModel(modelId, (m) => ({
    ...m,
    persons: m.persons.filter((p) => p.id !== personId),
    relationships: m.relationships.filter((r) => r.from !== personId && r.to !== personId),
  }));
}

// ---------------------------------------------------------------------------
// Sistemas
// ---------------------------------------------------------------------------

export function addSystem(modelId: string, data: Omit<SoftwareSystem, "id">): SoftwareSystem | null {
  return addEntity(modelId, "systems", data);
}

export function updateSystem(
  modelId: string,
  systemId: string,
  patch: Partial<Omit<SoftwareSystem, "id">>,
): SoftwareSystem | null {
  return updateEntity(modelId, "systems", systemId, patch);
}

export function removeSystem(modelId: string, systemId: string): void {
  mutateModel(modelId, (m) => {
    const containerIds = new Set(
      m.containers.filter((c) => c.systemId === systemId).map((c) => c.id),
    );
    const componentIds = new Set(
      m.components.filter((c) => containerIds.has(c.containerId)).map((c) => c.id),
    );
    const removed = new Set<string>([systemId, ...containerIds, ...componentIds]);
    return {
      ...m,
      systems: m.systems.filter((s) => s.id !== systemId),
      containers: m.containers.filter((c) => c.systemId !== systemId),
      components: m.components.filter((c) => !containerIds.has(c.containerId)),
      relationships: m.relationships.filter((r) => !removed.has(r.from) && !removed.has(r.to)),
    };
  });
}

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

export function addContainer(modelId: string, data: Omit<Container, "id">): Container | null {
  return addEntity(modelId, "containers", data);
}

export function updateContainer(
  modelId: string,
  containerId: string,
  patch: Partial<Omit<Container, "id">>,
): Container | null {
  return updateEntity(modelId, "containers", containerId, patch);
}

export function removeContainer(modelId: string, containerId: string): void {
  mutateModel(modelId, (m) => {
    const componentIds = new Set(
      m.components.filter((c) => c.containerId === containerId).map((c) => c.id),
    );
    const removed = new Set<string>([containerId, ...componentIds]);
    return {
      ...m,
      containers: m.containers.filter((c) => c.id !== containerId),
      components: m.components.filter((c) => c.containerId !== containerId),
      relationships: m.relationships.filter((r) => !removed.has(r.from) && !removed.has(r.to)),
    };
  });
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

export function addComponent(modelId: string, data: Omit<Component, "id">): Component | null {
  return addEntity(modelId, "components", data);
}

export function updateComponent(
  modelId: string,
  componentId: string,
  patch: Partial<Omit<Component, "id">>,
): Component | null {
  return updateEntity(modelId, "components", componentId, patch);
}

export function removeComponent(modelId: string, componentId: string): void {
  mutateModel(modelId, (m) => ({
    ...m,
    components: m.components.filter((c) => c.id !== componentId),
    relationships: m.relationships.filter((r) => r.from !== componentId && r.to !== componentId),
  }));
}

// ---------------------------------------------------------------------------
// Relacionamentos
// ---------------------------------------------------------------------------

export function addRelationship(
  modelId: string,
  data: Omit<Relationship, "id">,
): Relationship | null {
  return addEntity(modelId, "relationships", data);
}

export function updateRelationship(
  modelId: string,
  relationshipId: string,
  patch: Partial<Omit<Relationship, "id">>,
): Relationship | null {
  return updateEntity(modelId, "relationships", relationshipId, patch);
}

export function removeRelationship(modelId: string, relationshipId: string): void {
  removeEntity(modelId, "relationships", relationshipId);
}
