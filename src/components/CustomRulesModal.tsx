import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { CustomRule } from '../types/index.ts';
import { X, Sliders, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CustomRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RULE_TEMPLATES = [
  {
    name: 'Strict SQL Parameterization',
    category: 'Security',
    promptDirective: 'Enforce prepared statements and parameterized queries for all database interactions. Flag any string concatenation in SQL as a Critical vulnerability.',
  },
  {
    name: 'Modern React & TypeScript',
    category: 'Style',
    promptDirective: 'Reject any usage of "any" type. Enforce React functional components with explicit interface props and avoid unnecessary state mutation.',
  },
  {
    name: 'Spring Boot Clean Architecture',
    category: 'Architecture',
    promptDirective: 'Ensure service layer encapsulates business logic, controllers handle only HTTP routing, and all write operations are annotated with @Transactional.',
  },
  {
    name: 'Zero-Secret Hardcoding Policy',
    category: 'Security',
    promptDirective: 'Strictly prohibit hardcoded API tokens, private keys, or passwords. Require environment variables or secret vaults.',
  },
];

export const CustomRulesModal: React.FC<CustomRulesModalProps> = ({ isOpen, onClose }) => {
  const { rules, refreshRules, token, activeWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Security');
  const [promptDirective, setPromptDirective] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !promptDirective.trim() || !token || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          category,
          promptDirective: promptDirective.trim(),
          workspaceId: activeWorkspace?.id,
        }),
      });
      if (res.ok) {
        setName('');
        setPromptDirective('');
        await refreshRules();
      }
    } catch (err) {
      console.error('Create rule error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!token) return;
    try {
      await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshRules();
    } catch (err) {
      console.error('Delete rule error:', err);
    }
  };

  const handleApplyTemplate = (template: typeof RULE_TEMPLATES[0]) => {
    setName(template.name);
    setCategory(template.category);
    setPromptDirective(template.promptDirective);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Custom Review Rules & Guidelines
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teach the AI reviewer your team’s custom coding standards and architectural policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Quick Rule Templates */}
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-2">
              Recommended Policy Templates:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RULE_TEMPLATES.map((tmpl, i) => (
                <div
                  key={i}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {tmpl.promptDirective}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Create Rule Form */}
          <form
            onSubmit={handleCreateRule}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3"
          >
            <span className="font-bold text-slate-900 dark:text-white block">
              Add New Custom Rule
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Disallow any, enforce strict types"
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Security">Security</option>
                  <option value="Bug">Bug Prevention</option>
                  <option value="Performance">Performance</option>
                  <option value="Style">Style & Format</option>
                  <option value="Architecture">Architecture</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                AI Prompt Directive (What should the bot inspect and enforce?)
              </label>
              <textarea
                value={promptDirective}
                onChange={e => setPromptDirective(e.target.value)}
                placeholder="Explicit instructions for the Gemini review engine..."
                rows={2}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium cursor-pointer transition-colors"
            >
              {isSubmitting ? 'Saving Rule...' : 'Save Rule to Workspace'}
            </button>
          </form>

          {/* Active Rules List */}
          <div>
            <span className="font-bold text-slate-900 dark:text-white block mb-2">
              Active Team Rules ({rules.length})
            </span>
            {rules.length === 0 ? (
              <p className="text-slate-500">No custom rules active yet. Select a template above or create your own.</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">{rule.name}</span>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                          {rule.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {rule.promptDirective}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
