/**
 * Integração com GitHub
 * Exporta documentos (PRD, TRD, etc.) diretamente para repositórios GitHub
 */

import type { VersionedArtifact } from "../governance/version-control";

export interface GitHubConfig {
  token: string; // Personal Access Token
  owner: string; // Username ou organização
  repo: string; // Nome do repositório
  branch?: string; // Branch (default: main)
}

export interface GitHubExportOptions {
  path: string; // Caminho no repo (ex: "docs/prd.md")
  message: string; // Commit message
  createPR?: boolean; // Criar Pull Request ao invés de commit direto
  prTitle?: string;
  prBody?: string;
}

export interface GitHubExportResult {
  success: boolean;
  url: string; // URL do commit ou PR
  sha?: string; // SHA do commit
  error?: string;
}

/**
 * Exporta artefato para GitHub
 */
export async function exportToGitHub(
  artifact: VersionedArtifact,
  config: GitHubConfig,
  options: GitHubExportOptions
): Promise<GitHubExportResult> {
  try {
    const branch = config.branch || "main";

    // Se criar PR, cria uma branch temporária
    if (options.createPR) {
      return await createPullRequest(artifact, config, options);
    }

    // Caso contrário, commit direto
    return await commitToRepo(artifact, config, options, branch);
  } catch (error) {
    return {
      success: false,
      url: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Commit direto no repositório
 */
async function commitToRepo(
  artifact: VersionedArtifact,
  config: GitHubConfig,
  options: GitHubExportOptions,
  branch: string
): Promise<GitHubExportResult> {
  const { token, owner, repo } = config;

  // 1. Pega a referência da branch
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error(`Failed to get branch ref: ${refResponse.statusText}`);
  }

  const refData = await refResponse.json();
  const latestSha = refData.object.sha;

  // 2. Pega a árvore do commit mais recente
  const commitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestSha}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const commitData = await commitResponse.json();
  const treeSha = commitData.tree.sha;

  // 3. Cria um blob com o conteúdo do artefato
  const content = formatArtifactContent(artifact);
  const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
    }),
  });

  const blobData = await blobResponse.json();
  const blobSha = blobData.sha;

  // 4. Cria uma nova árvore com o arquivo
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      base_tree: treeSha,
      tree: [
        {
          path: options.path,
          mode: "100644",
          type: "blob",
          sha: blobSha,
        },
      ],
    }),
  });

  const treeData = await treeResponse.json();
  const newTreeSha = treeData.sha;

  // 5. Cria um novo commit
  const newCommitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: options.message,
        tree: newTreeSha,
        parents: [latestSha],
      }),
    }
  );

  const newCommitData = await newCommitResponse.json();
  const newCommitSha = newCommitData.sha;

  // 6. Atualiza a referência da branch
  await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      sha: newCommitSha,
    }),
  });

  return {
    success: true,
    url: `https://github.com/${owner}/${repo}/commit/${newCommitSha}`,
    sha: newCommitSha,
  };
}

/**
 * Cria Pull Request
 */
async function createPullRequest(
  artifact: VersionedArtifact,
  config: GitHubConfig,
  options: GitHubExportOptions
): Promise<GitHubExportResult> {
  const { token, owner, repo } = config;
  const baseBranch = config.branch || "main";
  const featureBranch = `update-${artifact.type}-${Date.now()}`;

  // 1. Cria a branch
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const refData = await refResponse.json();

  await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      ref: `refs/heads/${featureBranch}`,
      sha: refData.object.sha,
    }),
  });

  // 2. Faz commit na nova branch
  await commitToRepo(artifact, config, options, featureBranch);

  // 3. Cria o Pull Request
  const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      title: options.prTitle || `Update ${artifact.name}`,
      body: options.prBody || generatePRBody(artifact),
      head: featureBranch,
      base: baseBranch,
    }),
  });

  const prData = await prResponse.json();

  return {
    success: true,
    url: prData.html_url,
  };
}

/**
 * Formata o conteúdo do artefato para export
 */
function formatArtifactContent(artifact: VersionedArtifact): string {
  let content = "";

  // Header com metadados
  content += `<!-- \n`;
  content += `Artifact: ${artifact.name}\n`;
  content += `Type: ${artifact.type}\n`;
  content += `Version: ${artifact.version.toString()}\n`;
  content += `Status: ${artifact.metadata.status}\n`;
  content += `Author: ${artifact.metadata.author}\n`;
  content += `Created: ${artifact.metadata.createdAt}\n`;
  content += `Updated: ${artifact.metadata.updatedAt}\n`;
  content += `-->\n\n`;

  // Conteúdo principal
  content += artifact.content;

  // Footer com changelog
  content += `\n\n---\n\n`;
  content += `## Changelog\n\n`;
  artifact.changelog.forEach((entry) => {
    content += `### ${entry.version} (${new Date(entry.date).toISOString().split("T")[0]})\n\n`;
    if (entry.reason) {
      content += `**Motivação:** ${entry.reason}\n\n`;
    }
    entry.changes.forEach((change) => {
      content += `- **${change.type.toUpperCase()}**: ${change.description}\n`;
    });
    content += `\n`;
  });

  return content;
}

/**
 * Gera corpo do Pull Request
 */
function generatePRBody(artifact: VersionedArtifact): string {
  let body = `## ${artifact.type.toUpperCase()}: ${artifact.name}\n\n`;
  body += `**Version:** ${artifact.version.toString()}\n`;
  body += `**Status:** ${artifact.metadata.status}\n`;
  body += `**Author:** ${artifact.metadata.author}\n\n`;

  body += `### Changes\n\n`;
  const latestChangelog = artifact.changelog[0];
  if (latestChangelog) {
    latestChangelog.changes.forEach((change) => {
      body += `- **${change.type.toUpperCase()}**: ${change.description}\n`;
    });
  }

  body += `\n### Test Results\n\n`;
  const passed = artifact.testCases.filter((t) => t.status === "passed").length;
  const failed = artifact.testCases.filter((t) => t.status === "failed").length;
  const pending = artifact.testCases.filter((t) => t.status === "pending").length;

  body += `- ✅ Passed: ${passed}\n`;
  body += `- ❌ Failed: ${failed}\n`;
  body += `- ⏳ Pending: ${pending}\n\n`;

  if (failed > 0) {
    body += `> ⚠️ **Warning:** Some tests failed. Review before merging.\n\n`;
  } else if (pending > 0) {
    body += `> ℹ️ **Note:** Some tests are still pending execution.\n\n`;
  } else {
    body += `> ✅ All tests passed!\n\n`;
  }

  return body;
}

/**
 * Lista repositórios do usuário
 */
export async function listRepositories(token: string): Promise<
  {
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
  }[]
> {
  const response = await fetch("https://api.github.com/user/repos?per_page=100", {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list repositories: ${response.statusText}`);
  }

  const repos = await response.json();
  return repos.map((repo: any) => ({
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    default_branch: repo.default_branch,
  }));
}

/**
 * Valida token do GitHub
 */
export async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
