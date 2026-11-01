import React, { useState } from 'react';
import { Copy, Check, Columns, AlignJustify } from 'lucide-react';

interface DiffViewerProps {
  originalCode: string;
  optimizedCode: string;
  fileName: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  optimizedCode,
  fileName,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [copied, setCopied] = useState(false);

  const originalLines = originalCode.split('\n');
  const optimizedLines = optimizedCode.split('\n');

  const maxLines = Math.max(originalLines.length, optimizedLines.length);

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-white">
            Diff Inspection: {fileName}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            ({originalLines.length} lines original → {optimizedLines.length} lines optimized)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-xs font-medium">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              Unified
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Optimized Code'}</span>
          </button>
        </div>
      </div>

      {/* Diff Viewport */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 font-mono text-xs max-h-[550px] overflow-auto bg-slate-950 text-slate-200">
          {/* Left Column: Original */}
          <div>
            <div className="sticky top-0 z-10 px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-slate-400 font-sans font-medium text-xs flex justify-between">
              <span>Original (Pre-Review)</span>
              <span className="text-rose-400">- Vulnerabilities</span>
            </div>
            <div className="py-2">
              {originalLines.map((line, idx) => {
                const isModified = line !== (optimizedLines[idx] || '');
                return (
                  <div
                    key={idx}
                    className={`flex items-start px-2 py-0.5 leading-relaxed ${
                      isModified ? 'bg-rose-950/30 text-rose-200' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-10 select-none text-right pr-3 text-slate-600 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="w-4 select-none text-rose-500">{isModified ? '-' : ' '}</span>
                    <pre className="whitespace-pre overflow-x-auto flex-1">{line || ' '}</pre>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Optimized */}
          <div>
            <div className="sticky top-0 z-10 px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-slate-400 font-sans font-medium text-xs flex justify-between">
              <span>Optimized (Fixed)</span>
              <span className="text-emerald-400">+ Remediated</span>
            </div>
            <div className="py-2">
              {optimizedLines.map((line, idx) => {
                const isModified = line !== (originalLines[idx] || '');
                return (
                  <div
                    key={idx}
                    className={`flex items-start px-2 py-0.5 leading-relaxed ${
                      isModified ? 'bg-emerald-950/30 text-emerald-200' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-10 select-none text-right pr-3 text-slate-600 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="w-4 select-none text-emerald-500">{isModified ? '+' : ' '}</span>
                    <pre className="whitespace-pre overflow-x-auto flex-1">{line || ' '}</pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="font-mono text-xs max-h-[550px] overflow-auto bg-slate-950 text-slate-200 py-2">
          {Array.from({ length: maxLines }).map((_, idx) => {
            const orig = originalLines[idx];
            const opt = optimizedLines[idx];

            if (orig === opt) {
              return (
                <div key={idx} className="flex items-start px-4 py-0.5 text-slate-400 leading-relaxed">
                  <span className="w-10 select-none text-right pr-4 text-slate-600 tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="w-4 select-none"> </span>
                  <pre className="whitespace-pre overflow-x-auto flex-1">{orig || ' '}</pre>
                </div>
              );
            }

            return (
              <React.Fragment key={idx}>
                {orig !== undefined && (
                  <div className="flex items-start px-4 py-0.5 bg-rose-950/40 text-rose-200 leading-relaxed">
                    <span className="w-10 select-none text-right pr-4 text-rose-500 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="w-4 select-none text-rose-400 font-bold">-</span>
                    <pre className="whitespace-pre overflow-x-auto flex-1">{orig || ' '}</pre>
                  </div>
                )}
                {opt !== undefined && (
                  <div className="flex items-start px-4 py-0.5 bg-emerald-950/40 text-emerald-200 leading-relaxed">
                    <span className="w-10 select-none text-right pr-4 text-emerald-500 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="w-4 select-none text-emerald-400 font-bold">+</span>
                    <pre className="whitespace-pre overflow-x-auto flex-1">{opt || ' '}</pre>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
