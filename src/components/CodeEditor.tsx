import React, { useState, useRef } from 'react';
import { CodeFile } from '../types/index.ts';
import {
  FileCode,
  Upload,
  GitBranch,
  Plus,
  Trash2,
  Sparkles,
  Play,
  RotateCcw,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

interface CodeEditorProps {
  files: CodeFile[];
  setFiles: React.Dispatch<React.SetStateAction<CodeFile[]>>;
  activeFileIndex: number;
  setActiveFileIndex: (index: number) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  onAnalyze: (inputMethod: 'snippet' | 'upload' | 'repo' | 'multi_file') => void;
  isAnalyzing: boolean;
  activeRulesCount: number;
}

const PRESET_SNIPPETS: {
  title: string;
  language: string;
  files: CodeFile[];
}[] = [
  {
    title: 'Java Spring Boot: SQL Injection & Insecure Auth',
    language: 'java',
    files: [
      {
        name: 'AccountController.java',
        language: 'java',
        content: `package com.example.codereview.controller;

import org.springframework.web.bind.annotation.*;
import java.sql.*;
import java.util.*;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private Connection getConnection() throws SQLException {
        // Hardcoded plain database credentials
        return DriverManager.getConnection("jdbc:postgresql://localhost:5432/finance", "admin", "SuperSecret123!");
    }

    @GetMapping("/search")
    public List<Map<String, Object>> searchAccounts(@RequestParam String query) throws SQLException {
        Connection conn = getConnection();
        Statement stmt = conn.createStatement();
        // Critical: SQL Injection vulnerability via unparameterized concatenated query string
        String sql = "SELECT * FROM users WHERE username LIKE '%" + query + "%' OR email = '" + query + "'";
        ResultSet rs = stmt.executeQuery(sql);

        List<Map<String, Object>> results = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", rs.getInt("id"));
            row.put("username", rs.getString("username"));
            row.put("password_hash", rs.getString("password_hash")); // Critical: Leaking password hashes
            results.add(row);
        }
        // Bug / Resource Leak: Statement & Connection never closed
        return results;
    }

    @PostMapping("/transfer")
    public String transferFunds(@RequestParam Long fromId, @RequestParam Long toId, @RequestParam Double amount) {
        // Logic Bug & Race Condition: No transaction isolation, no balance validation before debit
        // Potential negative balance exploit
        return "Transferred " + amount;
    }
}`,
      },
    ],
  },
  {
    title: 'TypeScript / Node: Race Condition & Secret Leak',
    language: 'typescript',
    files: [
      {
        name: 'paymentService.ts',
        language: 'typescript',
        content: `import express, { Request, Response } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'STRIPE_API_KEY_PLACEHOLDER', {
  apiVersion: '2023-10-16',
});

// Bug: Module-scoped state shared across concurrent incoming requests
let currentProcessingOrder: any = null;

export async function processCheckout(req: Request, res: Response) {
  try {
    currentProcessingOrder = req.body.order;

    // Race condition: concurrent requests will overwrite currentProcessingOrder
    await new Promise((resolve) => setTimeout(resolve, 50));

    const total = currentProcessingOrder.items.reduce(
      (sum: number, item: any) => sum + (item.price * item.quantity),
      0
    );

    // Security flaw: Client-provided price is trusted directly without DB verification
    const payment = await stripe.paymentIntents.create({
      amount: total * 100,
      currency: 'usd',
      confirm: true,
      metadata: { orderId: currentProcessingOrder.id }
    });

    res.json({ success: true, paymentId: payment.id });
  } catch (err: any) {
    // Leaks entire internal stack trace and secret configuration to client
    res.status(500).json({ error: err.message, stack: err.stack, env: process.env });
  }
}`,
      },
    ],
  },
  {
    title: 'Python: Path Traversal & Insecure Eval',
    language: 'python',
    files: [
      {
        name: 'report_generator.py',
        language: 'python',
        content: `import os
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

# Security: Insecure secret key
app.config['SECRET_KEY'] = 'dev-secret-key-12345'

@app.route('/api/view-report', methods=['GET'])
def view_report():
    report_name = request.args.get('filename')
    # Critical: Arbitrary Path Traversal (e.g. filename=../../../../etc/passwd)
    file_path = os.path.join("/var/reports", report_name)
    
    with open(file_path, 'r') as f:
        data = f.read()
    return jsonify({"content": data})

@app.route('/api/compute-metric', methods=['POST'])
def compute_metric():
    formula = request.json.get('formula')
    # Critical: Remote Code Execution via eval
    result = eval(formula)
    return jsonify({"result": result})

if __name__ == '__main__':
    # Critical: Production app running with debug=True enabled
    app.run(host='0.0.0.0', port=5000, debug=True)`,
      },
    ],
  },
  {
    title: 'Multi-File: Microservice Controller + Model',
    language: 'typescript',
    files: [
      {
        name: 'UserController.ts',
        language: 'typescript',
        content: `import { Request, Response } from 'express';
import { UserModel } from './UserModel.ts';

export class UserController {
  static async getUserProfile(req: Request, res: Response) {
    const userId = req.params.id;
    // Missing input validation
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  }
}`,
      },
      {
        name: 'UserModel.ts',
        language: 'typescript',
        content: `export class UserModel {
  // In-memory array without thread/concurrency safety
  static users: any[] = [];

  static async findById(id: string) {
    // Performance: O(N) linear search on unindexed array
    return this.users.find(u => u.id === id);
  }

  static async createUser(data: any) {
    // Missing sanitization or password hashing
    this.users.push({ ...data, createdAt: new Date() });
    return data;
  }
}`,
      },
    ],
  },
];

const LANGUAGES = [
  { id: 'auto', name: 'Auto Detect' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'java', name: 'Java' },
  { id: 'python', name: 'Python' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'cpp', name: 'C++' },
  { id: 'sql', name: 'SQL' },
];

export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  setFiles,
  activeFileIndex,
  setActiveFileIndex,
  selectedLanguage,
  setSelectedLanguage,
  onAnalyze,
  isAnalyzing,
  activeRulesCount,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'repo'>('paste');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFile = files[activeFileIndex] || files[0];

  const handleContentChange = (val: string) => {
    setFiles(prev =>
      prev.map((f, i) => (i === activeFileIndex ? { ...f, content: val } : f))
    );
  };

  const handleFileNameChange = (name: string) => {
    setFiles(prev =>
      prev.map((f, i) => (i === activeFileIndex ? { ...f, name } : f))
    );
  };

  const handleAddNewFile = () => {
    const newFileName = `file_${files.length + 1}.${
      selectedLanguage === 'python'
        ? 'py'
        : selectedLanguage === 'java'
        ? 'java'
        : selectedLanguage === 'go'
        ? 'go'
        : 'ts'
    }`;
    setFiles(prev => [
      ...prev,
      {
        name: newFileName,
        content: '// New code snippet\n',
        language: selectedLanguage === 'auto' ? 'typescript' : selectedLanguage,
      },
    ]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= files.length - 1) {
      setActiveFileIndex(Math.max(0, files.length - 2));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newFilesList: CodeFile[] = [];
    const readers: Promise<void>[] = [];

    Array.from(uploaded).forEach(file => {
      const promise = new Promise<void>(resolve => {
        const reader = new FileReader();
        reader.onload = event => {
          const content = event.target?.result as string;
          const ext = file.name.split('.').pop()?.toLowerCase();
          let lang = 'typescript';
          if (ext === 'py') lang = 'python';
          else if (ext === 'java') lang = 'java';
          else if (ext === 'go') lang = 'go';
          else if (ext === 'rs') lang = 'rust';
          else if (ext === 'cpp' || ext === 'cc' || ext === 'h') lang = 'cpp';
          else if (ext === 'sql') lang = 'sql';
          else if (ext === 'js' || ext === 'jsx') lang = 'javascript';

          newFilesList.push({
            name: file.name,
            content,
            language: lang,
          });
          resolve();
        };
        reader.readAsText(file);
      });
      readers.push(promise);
    });

    Promise.all(readers).then(() => {
      setFiles(newFilesList);
      setActiveFileIndex(0);
      setActiveTab('paste');
    });
  };

  const handleLoadPreset = (preset: (typeof PRESET_SNIPPETS)[0]) => {
    setFiles(preset.files);
    setSelectedLanguage(preset.language);
    setActiveFileIndex(0);
  };

  const handleCopyCode = () => {
    if (currentFile?.content) {
      navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate numbered lines for display
  const lineCount = (currentFile?.content || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Top Bar for Code Input Mode & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          {/* Input Method Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'paste'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Direct Snippet
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              File Upload
            </button>
            <button
              onClick={() => setActiveTab('repo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'repo'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Git Repository
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Language:</span>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Snippets */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Sample Presets:</span>
          <div className="flex items-center gap-1">
            {PRESET_SNIPPETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadPreset(preset)}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title={`Load ${preset.title}`}
              >
                {preset.title.split(':')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-File Tab Bar (When multiple files or adding file) */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {files.map((file, i) => (
            <div
              key={i}
              onClick={() => setActiveFileIndex(i)}
              className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors ${
                i === activeFileIndex
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium border border-slate-200/80 dark:border-slate-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-500" />
              <span>{file.name}</span>
              {files.length > 1 && (
                <button
                  onClick={e => handleRemoveFile(i, e)}
                  className="hover:text-rose-500 p-0.5 rounded"
                  title="Remove file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddNewFile}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Add another file for multi-file review"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add File</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Copy current code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {activeTab === 'upload' ? (
        <div className="p-10 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 dark:border-slate-800 m-6 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
          <Upload className="w-10 h-10 text-indigo-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Upload Code Files
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-sm mb-4">
            Upload individual code files (.js, .ts, .py, .java, .go, .rs, .cpp, .sql) or select multiple files for batch context review.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Select Files to Upload
          </button>
        </div>
      ) : activeTab === 'repo' ? (
        <div className="p-6">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  GitHub / GitLab Pull Requests
                </span>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                Connected: github.com/acme-org/backend-service
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select a pull request or commit to load its modified files directly into the review workspace:
            </p>
            <div className="space-y-2">
              <div
                onClick={() => handleLoadPreset(PRESET_SNIPPETS[0])}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    #142: feat(auth): Spring Boot Account Search & Fund Transfer API
                  </span>
                  <span className="text-xs text-slate-500 font-mono">branch: feature/auth-v2</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Includes AccountController.java with direct database query execution and missing input validation.
                </p>
              </div>

              <div
                onClick={() => handleLoadPreset(PRESET_SNIPPETS[1])}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    #139: fix(checkout): Express payment handler with concurrent processing
                  </span>
                  <span className="text-xs text-slate-500 font-mono">branch: bugfix/checkout-race</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Modifies paymentService.ts with Stripe API tokens and async order processing.
                </p>
              </div>

              <div
                onClick={() => handleLoadPreset(PRESET_SNIPPETS[3])}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    #131: refactor(users): Multi-file UserController & In-Memory UserModel
                  </span>
                  <span className="text-xs text-slate-500 font-mono">branch: refactor/users-service</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Batch review across 2 files: UserController.ts and UserModel.ts.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex font-mono text-xs min-h-[380px] max-h-[500px] overflow-auto bg-slate-950 text-slate-100">
          {/* Line Numbers */}
          <div className="select-none py-3 px-3.5 text-right text-slate-600 bg-slate-950/80 border-r border-slate-800/80 font-mono tabular-nums leading-relaxed">
            {lineNumbers.map(n => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Raw Code Text Area */}
          <textarea
            value={currentFile?.content || ''}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Paste code snippet here..."
            spellCheck={false}
            className="flex-1 w-full p-3 bg-transparent text-slate-200 resize-none focus:outline-none font-mono leading-relaxed whitespace-pre overflow-x-auto selection:bg-indigo-500/30"
            rows={Math.max(lineCount, 18)}
          />
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{files.length} file{files.length > 1 ? 's' : ''} staged</span>
          <span>·</span>
          <span>{lineCount} lines</span>
          {activeRulesCount > 0 && (
            <>
              <span>·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {activeRulesCount} active team rules enforced
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => onAnalyze(activeTab === 'upload' ? 'upload' : activeTab === 'repo' ? 'repo' : files.length > 1 ? 'multi_file' : 'snippet')}
          disabled={isAnalyzing || !currentFile?.content?.trim()}
          className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing with Gemini 3.8 Flash...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Automated Code Review</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
