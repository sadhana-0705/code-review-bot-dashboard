import React from 'react';
import { MetricsSummary } from '../types/index.ts';
import { ShieldCheck, AlertCircle, Bug, Shield, Zap, CheckCircle2, TrendingUp } from 'lucide-react';

interface MetricsDashboardProps {
  metrics: MetricsSummary | null;
  loading: boolean;
  onRunNewReview: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  loading,
  onRunNewReview,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading code quality analytics...
      </div>
    );
  }

  if (!metrics || metrics.totalReviews === 0) {
    return (
      <div className="p-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
        <ShieldCheck className="w-12 h-12 text-indigo-500 mx-auto mb-3 opacity-80" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          No Code Reviews Logged Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
          Run your first automated code review to start tracking health scores, vulnerability trends, and code quality benchmarks over time.
        </p>
        <button
          onClick={onRunNewReview}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          Review First Code Snippet
        </button>
      </div>
    );
  }

  const {
    totalReviews,
    averageHealthScore,
    totalIssues,
    severityDistribution,
    categoryDistribution,
    recentTrend,
    topVulnerabilities,
  } = metrics;

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Health Score */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Average Health Score</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">Benchmark</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {averageHealthScore}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                averageHealthScore >= 80
                  ? 'bg-emerald-500'
                  : averageHealthScore >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${averageHealthScore}%` }}
            />
          </div>
        </div>

        {/* Total Scanned Reviews */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Code Reviews</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalReviews}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Across direct snippets, uploads, and repo PRs
          </p>
        </div>

        {/* Total Issues Flagged */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Issues Detected</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalIssues}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {severityDistribution.Critical} critical · {severityDistribution.High} high priority
          </p>
        </div>

        {/* Remediations Ready */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">AI Remediation Rate</span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
            100%
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            One-click patch generated for all findings
          </p>
        </div>
      </div>

      {/* Two Column Breakdown: Severity & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Severity Distribution
          </h4>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-medium text-rose-600 dark:text-rose-400">Critical Severity</span>
                <span className="font-mono tabular-nums font-semibold">{severityDistribution.Critical}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{
                    width: `${totalIssues > 0 ? (severityDistribution.Critical / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-medium text-amber-600 dark:text-amber-400">High Severity</span>
                <span className="font-mono tabular-nums font-semibold">{severityDistribution.High}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{
                    width: `${totalIssues > 0 ? (severityDistribution.High / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-medium text-blue-600 dark:text-blue-400">Medium Severity</span>
                <span className="font-mono tabular-nums font-semibold">{severityDistribution.Medium}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{
                    width: `${totalIssues > 0 ? (severityDistribution.Medium / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Low Severity</span>
                <span className="font-mono tabular-nums font-semibold">{severityDistribution.Low}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${totalIssues > 0 ? (severityDistribution.Low / totalIssues) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Category Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-rose-500 mb-1.5">
                <Bug className="w-4 h-4" />
                <span className="font-semibold text-slate-900 dark:text-white">Bugs & Logic</span>
              </div>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {categoryDistribution.Bug}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Race conditions & null checks
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-amber-500 mb-1.5">
                <Shield className="w-4 h-4" />
                <span className="font-semibold text-slate-900 dark:text-white">Security</span>
              </div>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {categoryDistribution.Security}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Injections & sensitive leaks
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-blue-500 mb-1.5">
                <Zap className="w-4 h-4" />
                <span className="font-semibold text-slate-900 dark:text-white">Performance</span>
              </div>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {categoryDistribution.Performance}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Complexity & memory leaks
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-emerald-500 mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold text-slate-900 dark:text-white">Style & Clean Code</span>
              </div>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {categoryDistribution.Style}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Conventions & standards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Recurring Vulnerabilities & Mistakes */}
      {topVulnerabilities.length > 0 && (
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Most Common Code Smells & Vulnerabilities
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {topVulnerabilities.map((vuln, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {vuln.title}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {vuln.count} occurrences
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
