import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Key, Copy, Check, RotateCcw, Terminal, Play, X, ShieldAlert } from 'lucide-react';

interface ApiAccessModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isView?: boolean; // Can be rendered as full tab view or modal
}

export const ApiAccessModal: React.FC<ApiAccessModalProps> = ({
  isOpen = true,
  onClose,
  isView = false,
}) => {
  const { apiKey, regenerateKey, user, token } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Live test runner state
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        language: 'typescript',
        failThreshold: 'High',
        files: [
          {
            name: 'authService.ts',
            content: 'function verifyToken(token: string) { return eval(token); }',
            language: 'typescript',
          },
        ],
      },
      null,
      2
    )
  );
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isView && !isOpen) return null;

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await regenerateKey();
    setIsRegenerating(false);
  };

  const curlCommand = `curl -X POST "${window.location.origin}/api/cicd/review" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "language": "typescript",
    "failThreshold": "High",
    "files": [
      {
        "name": "OrderService.ts",
        "content": "export function calculateTotal(items) { return items.reduce((a,b) => a+b.price, 0); }",
        "language": "typescript"
      }
    ]
  }'`;

  const githubActionsYaml = `name: AI Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger CodeRefine AI Scan
        run: |
          curl -f -X POST "${window.location.origin}/api/cicd/review" \\
            -H "Content-Type: application/json" \\
            -H "X-API-Key: \${{ secrets.CODEREFINE_API_KEY }}" \\
            -d @- << EOF
          {
            "failThreshold": "High",
            "files": [
              {
                "name": "src/App.tsx",
                "content": "$(cat src/App.tsx | jq -sR .)"
              }
            ]
          }
          EOF`;

  const handleRunLiveTest = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const parsed = JSON.parse(testPayload);
      const res = await fetch('/api/cicd/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setTestResponse(data);
    } catch (e: any) {
      setTestResponse({ error: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const content = (
    <div className="space-y-6 text-xs">
      {/* API Key Panel */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Developer API Key
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              Use this key in the <code className="font-mono text-indigo-500">X-API-Key</code> header to trigger automated reviews from CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins).
            </p>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || !user}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Roll Key</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={apiKey || (user ? 'Generating key...' : 'Sign in to generate persistent API key')}
            className="flex-1 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white select-all focus:outline-none"
          />
          <button
            onClick={handleCopyKey}
            disabled={!apiKey}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Curl & REST Endpoint Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Curl snippet */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-500" />
              cURL Trigger Example
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(curlCommand);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2000);
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              {copiedCurl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCurl ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="flex-1 p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto">
            {curlCommand}
          </pre>
        </div>

        {/* GitHub Actions YAML */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-500" />
              GitHub Actions Workflow
            </span>
          </div>
          <pre className="flex-1 p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto">
            {githubActionsYaml}
          </pre>
        </div>
      </div>

      {/* Live CI/CD Tester */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              Live CI/CD REST Runner & Validator
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              Test your CI/CD payload against <code className="font-mono text-indigo-500">POST /api/cicd/review</code>
            </p>
          </div>

          <button
            onClick={handleRunLiveTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            {isTesting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Send Test Request</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
              Request Payload (JSON)
            </label>
            <textarea
              value={testPayload}
              onChange={e => setTestPayload(e.target.value)}
              rows={8}
              className="w-full p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] leading-relaxed focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
              Live Server Response
            </label>
            <div className="w-full h-[185px] p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] leading-relaxed overflow-auto border border-slate-800">
              {testResponse ? (
                <pre>{JSON.stringify(testResponse, null, 2)}</pre>
              ) : (
                <span className="text-slate-500">Click "Send Test Request" to inspect the JSON output.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isView) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              CI/CD Pipeline Integration & API Keys
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto flex-1">{content}</div>
      </div>
    </div>
  );
};
