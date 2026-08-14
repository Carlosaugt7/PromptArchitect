/**
 * Geradores de diagramas a partir do modelo C4 e de artefatos de design
 * (sequência, ER e grafo de dependências). Sem dependências externas.
 */

import type {
  C4Level,
  C4Model,
  DiagramRender,
  DiagramType,
  EntityDef,
  RelationCardinality,
  Relationship,
  SequenceScenario,
} from "./types";

/** Sanitiza um id para uso como chave de nó em Mermaid/PlantUML. */
function sanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}

/** Monta uma chave de nó prefixada. */
function key(prefix: string, id: string): string {
  return `${prefix}_${sanId(id)}`;
}

/** Sanitiza um texto para uso como rótulo dentro de um diagrama. */
function esc(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'")
    .replace(/\|/g, "/")
    .trim();
}

/** Sanitiza um nome para identificador de entidade ER. */
function erName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9_]+/g, "_");
  return cleaned || "entidade";
}

/** Converte uma cardinalidade em sintaxe de relacionamento Mermaid ER. */
function cardinality(type: RelationCardinality): string {
  switch (type) {
    case "1..1":
      return "||--||";
    case "1..N":
      return "||--o{";
    case "N..M":
      return "}o--o{";
  }
}

/**
 * Gera um diagrama Mermaid (flowchart) para o nível C4 solicitado.
 * Nível 1 = contexto (pessoas + sistemas); nível 2 = containers; nível 3 = componentes.
 */
export function generateMermaidC4(model: C4Model, level: C4Level): string {
  const lines: string[] = [];
  lines.push(`flowchart ${level === 1 ? "LR" : "TB"}`);
  lines.push(`  %% Diagrama C4 (nível ${level}) gerado pelo PromptArchitect`);
  lines.push("  classDef person fill:#e3f2fd,stroke:#1565c0");
  lines.push("  classDef system fill:#e8f5e9,stroke:#2e7d32");
  lines.push("  classDef external fill:#fff8e1,stroke:#f9a825");
  lines.push("  classDef container fill:#ede7f6,stroke:#4527a0");
  lines.push("  classDef component fill:#fafafa,stroke:#616161");
  lines.push("");

  // Mapa id do elemento → chave de nó visível neste nível.
  const nodes = new Map<string, string>();

  if (level === 1) {
    for (const p of model.persons) {
      const k = key("p", p.id);
      nodes.set(p.id, k);
      lines.push(`  ${k}["${esc(p.name)}"]:::person`);
    }
    for (const s of model.systems) {
      const k = key("s", s.id);
      nodes.set(s.id, k);
      lines.push(`  ${k}["${esc(s.name)}"]:::${s.type === "external" ? "external" : "system"}`);
    }
  } else if (level === 2) {
    for (const p of model.persons) {
      const k = key("p", p.id);
      nodes.set(p.id, k);
      lines.push(`  ${k}["${esc(p.name)}"]:::person`);
    }
    for (const s of model.systems) {
      if (s.type === "external") {
        const k = key("s", s.id);
        nodes.set(s.id, k);
        lines.push(`  ${k}["${esc(s.name)}"]:::external`);
        continue;
      }
      const containers = model.containers.filter((c) => c.systemId === s.id);
      const sk = key("sys", s.id);
      nodes.set(s.id, sk);
      if (containers.length === 0) {
        lines.push(`  ${sk}["${esc(s.name)}"]:::system`);
        continue;
      }
      lines.push(`  subgraph ${sk}["Sistema: ${esc(s.name)}"]`);
      for (const c of containers) {
        const k = key("c", c.id);
        nodes.set(c.id, k);
        lines.push(`    ${k}["${esc(c.name)} | ${esc(c.technology)}"]:::container`);
      }
      lines.push("  end");
    }
  } else if (level === 3) {
    for (const c of model.containers) {
      const components = model.components.filter((x) => x.containerId === c.id);
      const ck = key("c", c.id);
      nodes.set(c.id, ck);
      if (components.length === 0) {
        lines.push(`  ${ck}["${esc(c.name)} | ${esc(c.technology)}"]:::container`);
        continue;
      }
      lines.push(`  subgraph ${ck}["Container: ${esc(c.name)}"]`);
      for (const x of components) {
        const k = key("comp", x.id);
        nodes.set(x.id, k);
        lines.push(`    ${k}["${esc(x.name)}"]:::component`);
      }
      lines.push("  end");
    }
  } else {
    lines.push("  %% Nível 4 (código) não é gerado automaticamente.");
  }

  lines.push("");
  for (const rel of model.relationships) {
    const fromKey = nodes.get(rel.from);
    const toKey = nodes.get(rel.to);
    if (!fromKey || !toKey) continue;
    const label = rel.description || rel.technology;
    if (label) {
      lines.push(`  ${fromKey} -->|"${esc(label)}"| ${toKey}`);
    } else {
      lines.push(`  ${fromKey} --> ${toKey}`);
    }
  }

  return lines.join("\n");
}

/**
 * Gera código PlantUML válido (@startuml/@enduml) para o nível C4 solicitado.
 * Inclui comentário sugerindo o include do tema oficial C4-PlantUML.
 */
export function generatePlantUmlC4(model: C4Model, level: C4Level): string {
  const lines: string[] = [];
  lines.push("@startuml");
  lines.push("' !include <C4/C4_Container>");
  lines.push("' Para usar o tema oficial C4-PlantUML, descomente a linha acima e use");
  lines.push("' os elementos Person(), System(), Container() e Component().");
  lines.push(`' Nível C4: ${level}`);
  lines.push("");

  const aliases = new Map<string, string>();
  const use = (id: string, generated: string): string => {
    aliases.set(id, generated);
    return generated;
  };

  if (level === 1) {
    for (const p of model.persons) {
      const a = use(p.id, `p_${sanId(p.id)}`);
      lines.push(`actor "${esc(p.name)}" as ${a}`);
    }
    for (const s of model.systems) {
      const a = use(s.id, `s_${sanId(s.id)}`);
      lines.push(
        s.type === "external"
          ? `rectangle "${esc(s.name)}" as ${a} <<External>>`
          : `rectangle "${esc(s.name)}" as ${a}`,
      );
    }
  } else if (level === 2) {
    for (const p of model.persons) {
      const a = use(p.id, `p_${sanId(p.id)}`);
      lines.push(`actor "${esc(p.name)}" as ${a}`);
    }
    for (const s of model.systems) {
      if (s.type === "external") {
        const a = use(s.id, `s_${sanId(s.id)}`);
        lines.push(`rectangle "${esc(s.name)}" as ${a} <<External>>`);
        continue;
      }
      const containers = model.containers.filter((c) => c.systemId === s.id);
      use(s.id, `sys_${sanId(s.id)}`);
      if (containers.length === 0) {
        lines.push(`rectangle "${esc(s.name)}" as sys_${sanId(s.id)}`);
        continue;
      }
      lines.push(`package "${esc(s.name)}" {`);
      for (const c of containers) {
        const a = use(c.id, `c_${sanId(c.id)}`);
        lines.push(`  rectangle "${esc(c.name)}" as ${a} <<${esc(c.technology)}>>`);
      }
      lines.push("}");
    }
  } else if (level === 3) {
    for (const c of model.containers) {
      const components = model.components.filter((x) => x.containerId === c.id);
      use(c.id, `c_${sanId(c.id)}`);
      if (components.length === 0) {
        lines.push(`rectangle "${esc(c.name)}" as c_${sanId(c.id)} <<${esc(c.technology)}>>`);
        continue;
      }
      lines.push(`package "${esc(c.name)}" {`);
      for (const x of components) {
        const a = use(x.id, `comp_${sanId(x.id)}`);
        lines.push(`  component "${esc(x.name)}" as ${a}`);
      }
      lines.push("}");
    }
  } else {
    lines.push("' Nível 4 (código) não é gerado automaticamente.");
  }

  lines.push("");
  for (const rel of model.relationships) {
    const fromA = aliases.get(rel.from);
    const toA = aliases.get(rel.to);
    if (!fromA || !toA) continue;
    const label = rel.description || rel.technology;
    if (label) {
      lines.push(`${fromA} --> ${toA} : "${esc(label)}"`);
    } else {
      lines.push(`${fromA} --> ${toA}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}

/** Gera um diagrama de sequência Mermaid a partir de um cenário. */
export function generateMermaidSequence(scenario: SequenceScenario): string {
  const lines: string[] = [];
  lines.push("sequenceDiagram");
  lines.push(`  title ${esc(scenario.name)}`);

  const partKeys = new Map<string, string>();
  const ensure = (name: string): string => {
    const existing = partKeys.get(name);
    if (existing) return existing;
    const k = `P${partKeys.size + 1}`;
    partKeys.set(name, k);
    lines.push(`  participant ${k} as "${esc(name)}"`);
    return k;
  };

  for (const p of scenario.participants) ensure(p);
  lines.push("");

  for (const msg of scenario.messages) {
    const from = ensure(msg.from);
    const to = ensure(msg.to);
    lines.push(`  ${from}->>${to}: ${esc(msg.label)}`);
  }

  return lines.join("\n");
}

/** Gera um diagrama ER Mermaid a partir de definições de entidades. */
export function generateMermaidErd(entities: EntityDef[]): string {
  const lines: string[] = [];
  lines.push("erDiagram");

  for (const e of entities) {
    lines.push(`  ${erName(e.name)} {`);
    for (const f of e.fields) {
      const parts: string[] = [erName(f.type), erName(f.name)];
      if (f.pk) parts.push("PK");
      if (f.fk) parts.push("FK");
      const comment = f.nullable ? ' "nullable"' : "";
      lines.push(`    ${parts.join(" ")}${comment}`);
    }
    lines.push("  }");
  }

  lines.push("");
  for (const e of entities) {
    for (const r of e.relations) {
      lines.push(`  ${erName(r.from)} ${cardinality(r.type)} ${erName(r.to)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Gera um grafo de dependências Mermaid (direção TB) a partir de nós
 * (containers ou componentes) e relacionamentos dirigidos.
 */
export function generateDependencyGraph(
  nodes: Array<{ id: string; name: string }>,
  relationships: Relationship[],
): string {
  const lines: string[] = [];
  lines.push("flowchart TB");

  const keys = new Map<string, string>();
  for (const n of nodes) {
    const k = key("n", n.id);
    keys.set(n.id, k);
    lines.push(`  ${k}["${esc(n.name)}"]`);
  }

  lines.push("");
  for (const rel of relationships) {
    const fromKey = keys.get(rel.from);
    const toKey = keys.get(rel.to);
    if (!fromKey || !toKey) continue;
    const label = rel.description || rel.technology;
    if (label) {
      lines.push(`  ${fromKey} -->|"${esc(label)}"| ${toKey}`);
    } else {
      lines.push(`  ${fromKey} --> ${toKey}`);
    }
  }

  return lines.join("\n");
}

/**
 * Retorna o código do diagrama junto com um hint de renderização.
 * A URL Kroki espera o payload em base64+deflate após "/svg/"; aqui mantemos
 * a URL-base para que o cliente a complete ou use um editor externo.
 */
export function renderDiagram(diagramCode: string, type: DiagramType): DiagramRender {
  const service = type === "mermaid" ? "mermaid" : "plantuml";
  return {
    code: diagramCode,
    type,
    mermaidUrl: `https://kroki.io/${service}/svg/<base64-deflate>`,
  };
}
