import React, { useState } from 'react';
import { ReviewFinding, Severity, IssueCategory } from '../types/index.ts';
import {
  AlertTriangle,
  Bug,
  Shield,
  Zap,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Code,
  Check,
} from 'lucide-react';

interface InlineSuggestionsProps {
  findings: ReviewFinding[];
  onApplyFix: (finding: ReviewFinding) => void;
  onApplyAllFixes: () => void;
  onSelectFinding: (finding: ReviewFinding) => void;
  selectedFindingId?: string;
  appliedFixIds: Set<string>;
}

export const InlineSuggestions: React.FC<InlineSuggestionsProps> = ({
  findings,
  onApplyFix,
  onApplyAllFixes,
  onSelectFinding,
  selectedFindingId,
  appliedFixIds,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | Severity>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | IssueCategory>('All');

  const filtered = findings.filter(f => {
    if (severityFilter !== 'All' && f.severity !== severityFilter) return false;
    if (categoryFilter !== 'All' && f.category !== categoryFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="text-rose-600 dark:text-rose-400 font-medium">Critical</span>
        );
      case 'High':
        return (
          <span className="text-amber-600 dark:text-amber-400 font-medium">High</span>
        );
      case 'Medium':
        return (
          <span className="text-blue-600 dark:text-blue-400 font-medium">Medium</span>
        );
      case 'Low':
        return (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Low</span>
        );
    }
  };

  const getCategoryIcon = (category: IssueCategory) => {
    switch (category) {
      case 'Bug':
        return <Bug className="w-3.5 h-3.5 text-rose-500" />;
      case 'Security':
        return <Shield className="w-3.5 h-3.5 text-amber-500" />;
      case 'Performance':
        return <Zap className="w-3.5 h-3.5 text-blue-500" />;
      case 'Style':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header and Filter Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Findings & Inline Suggestions
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ({findings.length} issues)
            </span>
          </div>

          {findings.length > 0 && (
            <button
              onClick={onApplyAllFixes}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apply All Remediations
            </button>
          )}
        </div>

        {/* Severity Tabs (Interactive segmented buttons) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(sev => {
            const count =
              sev === 'All'
                ? findings.length
                : findings.filter(f => f.severity === sev).length;
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {sev} <span className="opacity-75 font-mono tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Findings List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            No issues match the selected filters.
          </div>
        ) : (
          filtered.map(finding => {
            const isApplied = appliedFixIds.has(finding.id);
            const isSelected = selectedFindingId === finding.id;

            return (
              <div
                key={finding.id}
                onClick={() => onSelectFinding(finding)}
                className={`p-4 transition-colors cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                  isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(finding.category)}
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {finding.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {getSeverityBadge(finding.severity)}
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      Line {finding.lineStart}{finding.lineEnd > finding.lineStart ? `–${finding.lineEnd}` : ''}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                  {finding.description}
                </p>

                {/* CWE Tag & Category */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span>{finding.file}</span>
                  <span>·</span>
                  <span>{finding.category}</span>
                  {finding.cwe && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{finding.cwe}</span>
                    </>
                  )}
                </div>

                {/* Inline Code Replacement Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono mb-3">
                  <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-slate-800 dark:text-slate-200 overflow-x-auto">
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-sans font-semibold mb-1">
                      Original Problematic Code:
                    </div>
                    <pre className="whitespace-pre">{finding.originalCode}</pre>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200 overflow-x-auto">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold mb-1">
                      Recommended Fix:
                    </div>
                    <pre className="whitespace-pre">{finding.suggestedFix}</pre>
                  </div>
                </div>

                {/* Remediation Explanation & Apply Button */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {finding.explanation}
                  </p>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onApplyFix(finding);
                    }}
                    disabled={isApplied}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isApplied
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Fix Applied</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Fix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
