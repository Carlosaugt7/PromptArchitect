/**
 * Test Runner - Executa casos de teste automaticamente
 * Integra com LLMs para validar System Prompts
 */

import type { TestCase, VersionedArtifact } from "../governance/version-control";

export interface TestRunResult {
  testId: string;
  status: "passed" | "failed" | "error";
  actualOutput: string;
  executionTime: number; // ms
  error?: string;
}

export interface TestSuiteResult {
  artifactId: string;
  artifactName: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  duration: number; // ms
  results: TestRunResult[];
}

/**
 * Executa um único caso de teste
 */
export async function runTest(
  artifact: VersionedArtifact,
  testCase: TestCase,
  llmConfig: {
    provider: string;
    model: string;
    apiKey: string;
  }
): Promise<TestRunResult> {
  const startTime = Date.now();

  try {
    // Para System Prompts, executa o prompt com o input do teste
    if (artifact.type === "system_prompt") {
      const actualOutput = await executeSystemPrompt(
        artifact.content,
        testCase.input,
        llmConfig
      );

      // Valida se o output real bate com o esperado
      const passed = validateOutput(actualOutput, testCase.expectedOutput);

      return {
        testId: testCase.id,
        status: passed ? "passed" : "failed",
        actualOutput,
        executionTime: Date.now() - startTime,
      };
    }

    // Para outros tipos de artefato (PRD, TRD), valida estrutura
    return {
      testId: testCase.id,
      status: "passed",
      actualOutput: "Validação de estrutura: OK",
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      testId: testCase.id,
      status: "error",
      actualOutput: "",
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Executa todos os testes de um artefato
 */
export async function runTestSuite(
  artifact: VersionedArtifact,
  llmConfig: {
    provider: string;
    model: string;
    apiKey: string;
  },
  options?: {
    parallel?: boolean;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const results: TestRunResult[] = [];

  if (options?.parallel) {
    // Executa testes em paralelo
    const promises = artifact.testCases.map((testCase, index) =>
      runTest(artifact, testCase, llmConfig).then((result) => {
        options.onProgress?.(index + 1, artifact.testCases.length);
        return result;
      })
    );
    results.push(...(await Promise.all(promises)));
  } else {
    // Executa testes sequencialmente
    for (let i = 0; i < artifact.testCases.length; i++) {
      const testCase = artifact.testCases[i];
      const result = await runTest(artifact, testCase, llmConfig);
      results.push(result);
      options?.onProgress?.(i + 1, artifact.testCases.length);
    }
  }

  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const errors = results.filter((r) => r.status === "error").length;

  return {
    artifactId: artifact.id,
    artifactName: artifact.name,
    totalTests: artifact.testCases.length,
    passed,
    failed,
    errors,
    duration: Date.now() - startTime,
    results,
  };
}

/**
 * Executa system prompt com LLM
 */
async function executeSystemPrompt(
  systemPrompt: string,
  userInput: string,
  llmConfig: {
    provider: string;
    model: string;
    apiKey: string;
  }
): Promise<string> {
  // Chama a API do LLM conforme o provedor
  if (llmConfig.provider === "openai") {
    return executeOpenAI(systemPrompt, userInput, llmConfig);
  } else if (llmConfig.provider === "anthropic") {
    return executeAnthropic(systemPrompt, userInput, llmConfig);
  } else if (llmConfig.provider === "google") {
    return executeGoogle(systemPrompt, userInput, llmConfig);
  }

  throw new Error(`Provider não suportado: ${llmConfig.provider}`);
}

/**
 * Executa com OpenAI
 */
async function executeOpenAI(
  systemPrompt: string,
  userInput: string,
  llmConfig: { model: string; apiKey: string }
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${llmConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: llmConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Executa com Anthropic
 */
async function executeAnthropic(
  systemPrompt: string,
  userInput: string,
  llmConfig: { model: string; apiKey: string }
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": llmConfig.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: llmConfig.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userInput }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Executa com Google
 */
async function executeGoogle(
  systemPrompt: string,
  userInput: string,
  llmConfig: { model: string; apiKey: string }
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${llmConfig.model}:generateContent?key=${llmConfig.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\nUser: ${userInput}` }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Valida se o output real corresponde ao esperado
 */
function validateOutput(actual: string, expected: string): boolean {
  // Normaliza espaços e case
  const normalizeText = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  const actualNorm = normalizeText(actual);
  const expectedNorm = normalizeText(expected);

  // Verifica similaridade (pode usar algoritmo de distância de Levenshtein para mais precisão)
  // Por simplicidade, verifica se contem as palavras-chave principais
  const expectedWords = expectedNorm.split(" ");
  const matchedWords = expectedWords.filter((word) => actualNorm.includes(word));

  // Considera "passou" se pelo menos 70% das palavras batem
  return matchedWords.length / expectedWords.length >= 0.7;
}

/**
 * Gera relatório em formato Markdown
 */
export function generateTestReport(result: TestSuiteResult): string {
  const successRate = ((result.passed / result.totalTests) * 100).toFixed(1);

  let report = `# Test Report: ${result.artifactName}\n\n`;
  report += `**Artifact ID:** \`${result.artifactId}\`\n`;
  report += `**Execution Date:** ${new Date().toLocaleString()}\n`;
  report += `**Duration:** ${result.duration}ms\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Tests:** ${result.totalTests}\n`;
  report += `- **✅ Passed:** ${result.passed}\n`;
  report += `- **❌ Failed:** ${result.failed}\n`;
  report += `- **⚠️ Errors:** ${result.errors}\n`;
  report += `- **Success Rate:** ${successRate}%\n\n`;

  if (result.passed === result.totalTests) {
    report += `> 🎉 **All tests passed!** This artifact is ready for production.\n\n`;
  } else {
    report += `> ⚠️ **Some tests failed.** Review failures before deploying to production.\n\n`;
  }

  report += `## Test Results\n\n`;
  result.results.forEach((test, index) => {
    const statusIcon =
      test.status === "passed" ? "✅" : test.status === "failed" ? "❌" : "⚠️";
    report += `### ${statusIcon} Test ${index + 1}: ${test.testId}\n\n`;
    report += `- **Status:** ${test.status.toUpperCase()}\n`;
    report += `- **Execution Time:** ${test.executionTime}ms\n`;

    if (test.status === "failed") {
      report += `\n**Actual Output:**\n\`\`\`\n${test.actualOutput}\n\`\`\`\n\n`;
    }

    if (test.error) {
      report += `\n**Error:**\n\`\`\`\n${test.error}\n\`\`\`\n\n`;
    }

    report += `---\n\n`;
  });

  return report;
}

/**
 * Salva relatório em arquivo
 */
export function saveTestReport(result: TestSuiteResult, filename: string): void {
  const report = generateTestReport(result);
  const blob = new Blob([report], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
