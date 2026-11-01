import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ReviewFinding {
  id: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Bug' | 'Security' | 'Performance' | 'Style';
  title: string;
  description: string;
  originalCode: string;
  suggestedFix: string;
  explanation: string;
  cwe?: string;
}

export interface ReviewResult {
  title: string;
  language: string;
  summary: string;
  healthScore: number; // 0-100
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: ReviewFinding[];
  optimizedCode: string; // The complete revised/fixed version of the primary code or all files
}

export async function analyzeCodeWithGemini(params: {
  files: { name: string; content: string; language?: string }[];
  primaryLanguage: string;
  customRules?: string[];
  contextPrompt?: string;
}): Promise<ReviewResult> {
  const { files, primaryLanguage, customRules = [], contextPrompt = '' } = params;

  const filesFormatted = files
    .map(
      (f, i) => `=== FILE ${i + 1}: ${f.name} (Language: ${f.language || primaryLanguage}) ===\n${f.content}\n=== END FILE ${i + 1} ===`
    )
    .join('\n\n');

  const rulesFormatted = customRules.length > 0
    ? `\n\nApply the following workspace custom team rules strictly:\n${customRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';

  const prompt = `You are CodeRefine AI, an elite principal software engineer and automated code reviewer.
Perform a rigorous, production-grade automated code review on the provided file(s).

Your analysis MUST thoroughly inspect:
1. BUG DETECTION: Syntax errors, unhandled edge cases, nil/null pointer dereferences, race conditions, type mismatches, memory/resource leaks, off-by-one errors.
2. SECURITY VULNERABILITY SCANNING: SQL injection, XSS, SSRF, CSRF, hardcoded secrets/credentials, insecure deserialization, path traversal, weak crypto, CWE classifications.
3. PERFORMANCE OPTIMIZATION: Time & space complexity bottlenecks, N+1 database queries, redundant computations, unindexed lookups, expensive re-renders or allocations.
4. STYLE & BEST PRACTICES: Naming conventions, readability, idiomatic patterns, architectural hygiene (Clean Code, PEP8, Google/Airbnb guidelines).

Code to review:
${filesFormatted}
${rulesFormatted}
${contextPrompt ? `\nAdditional Context: ${contextPrompt}` : ''}

Generate structured findings with accurate 1-indexed line numbers matching the submitted code, categorize findings into Critical, High, Medium, or Low severity, provide exact clean code replacements for each issue, and deliver the complete, polished 'optimizedCode'.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: 'You are an automated code review engine. You return precise, structured JSON containing categorized findings, line numbers, and fixed code.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Short descriptive review title',
          },
          language: {
            type: Type.STRING,
            description: 'Primary programming language detected or used',
          },
          summary: {
            type: Type.STRING,
            description: 'Executive summary of code quality, architecture, and key risks',
          },
          healthScore: {
            type: Type.INTEGER,
            description: 'Code health score from 0 (terrible) to 100 (flawless)',
          },
          criticalCount: {
            type: Type.INTEGER,
            description: 'Number of critical issues found',
          },
          highCount: {
            type: Type.INTEGER,
            description: 'Number of high issues found',
          },
          mediumCount: {
            type: Type.INTEGER,
            description: 'Number of medium issues found',
          },
          lowCount: {
            type: Type.INTEGER,
            description: 'Number of low issues found',
          },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                file: { type: Type.STRING },
                lineStart: { type: Type.INTEGER },
                lineEnd: { type: Type.INTEGER },
                severity: {
                  type: Type.STRING,
                  enum: ['Critical', 'High', 'Medium', 'Low'],
                },
                category: {
                  type: Type.STRING,
                  enum: ['Bug', 'Security', 'Performance', 'Style'],
                },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                originalCode: { type: Type.STRING },
                suggestedFix: { type: Type.STRING },
                explanation: { type: Type.STRING },
                cwe: { type: Type.STRING },
              },
              required: [
                'id',
                'file',
                'lineStart',
                'lineEnd',
                'severity',
                'category',
                'title',
                'description',
                'originalCode',
                'suggestedFix',
                'explanation',
              ],
            },
          },
          optimizedCode: {
            type: Type.STRING,
            description: 'The complete fully optimized and remediated source code for the primary file',
          },
        },
        required: [
          'title',
          'language',
          'summary',
          'healthScore',
          'criticalCount',
          'highCount',
          'mediumCount',
          'lowCount',
          'findings',
          'optimizedCode',
        ],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  return parsed as ReviewResult;
}

export async function askFollowUpQuestion(params: {
  codeContext: string;
  findingsContext: string;
  history: { sender: 'user' | 'assistant'; message: string }[];
  question: string;
}): Promise<string> {
  const { codeContext, findingsContext, history, question } = params;

  const conversationHistory = history
    .map(h => `${h.sender === 'user' ? 'Developer' : 'ReviewBot'}: ${h.message}`)
    .join('\n');

  const prompt = `Context:
Original Code:
${codeContext}

Findings Identified:
${findingsContext}

Previous Chat Conversation:
${conversationHistory}

Developer's Follow-up Question:
${question}

Answer with deep technical insight, citing specific lines of code, why the flaw is risky or how the optimization behaves, and provide clear code examples if relevant. Keep explanations direct, authoritative, and helpful.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: 'You are CodeRefine AI, answering a developer follow-up question regarding a code review.',
    },
  });

  return response.text || 'No response generated.';
}
