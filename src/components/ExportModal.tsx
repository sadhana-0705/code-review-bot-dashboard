import React, { useState } from 'react';
import { ReviewItem } from '../types/index.ts';
import { Download, FileText, Printer, Copy, Check, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewItem;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, review }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const findings = review.findings || JSON.parse(review.findingsJson || '[]');

  const generateMarkdown = () => {
    return `# Code Review Report: ${review.title}
**Date:** ${new Date(review.createdAt).toLocaleDateString()}
**Language:** ${review.language.toUpperCase()}
**Overall Health Score:** ${review.healthScore}/100
**Input Method:** ${review.inputMethod}

---

## Executive Summary
${review.summary || 'Automated code review completed by CodeRefine AI.'}

---

## Key Metrics & Severity
- **Critical Issues:** ${review.criticalCount}
- **High Severity:** ${review.highCount}
- **Medium Severity:** ${review.mediumCount}
- **Low Severity:** ${review.lowCount}

---

## Findings & Recommendations

${findings
  .map(
    (f: any, i: number) => `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}
- **File:** \`${f.file}\` (Lines ${f.lineStart}-${f.lineEnd})
- **Category:** ${f.category} ${f.cwe ? `(${f.cwe})` : ''}
- **Description:** ${f.description}

**Original Code:**
\`\`\`${review.language}
${f.originalCode}
\`\`\`

**Suggested Remediation:**
\`\`\`${review.language}
${f.suggestedFix}
\`\`\`

**Explanation:** ${f.explanation}
`
  )
  .join('\n\n')}

---

## Optimized Code Output
\`\`\`${review.language}
${review.optimizedCode || '// No code modification'}
\`\`\`
`;
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CodeRefine_Report_${review.id}_${review.language}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              Export Review Report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Export the structured findings, vulnerability breakdown, and optimized code as a Markdown document or printable PDF report.
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/40 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-500" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Download Markdown (.md)</div>
                  <div className="text-[11px] text-slate-500">Includes complete findings, CWE metadata, and patches</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/40 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-indigo-500" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Print or Save as PDF</div>
                  <div className="text-[11px] text-slate-500">Formatted executive report for stakeholder presentation</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/40 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Copy className="w-5 h-5 text-indigo-500" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Copy Markdown to Clipboard</div>
                  <div className="text-[11px] text-slate-500">Paste directly into GitHub PR comments or Jira tickets</div>
                </div>
              </div>
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
