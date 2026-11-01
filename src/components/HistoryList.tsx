import React, { useState } from 'react';
import { ReviewItem } from '../types/index.ts';
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Calendar,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface HistoryListProps {
  reviews: ReviewItem[];
  loading: boolean;
  onSelectReview: (review: ReviewItem) => void;
  onToggleBookmark: (id: number, e: React.MouseEvent) => void;
  selectedReviewId?: number;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  reviews,
  loading,
  onSelectReview,
  onToggleBookmark,
  selectedReviewId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const languages = ['All', ...Array.from(new Set(reviews.map(r => r.language).filter(Boolean)))];

  const filtered = reviews.filter(r => {
    if (onlyBookmarked && !r.isBookmarked) return false;
    if (selectedLanguage !== 'All' && r.language.toLowerCase() !== selectedLanguage.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.language.toLowerCase().includes(q) ||
        (r.summary && r.summary.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reviews by title, code terms, or language..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Language:</span>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {languages.map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setOnlyBookmarked(!onlyBookmarked)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
              onlyBookmarked
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-medium'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {onlyBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 fill-current" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>Bookmarked</span>
          </button>
        </div>
      </div>

      {/* Reviews Table / List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading review history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            No code reviews match your criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filtered.map(review => {
              const isSelected = selectedReviewId === review.id;
              const dateStr = review.createdAt
                ? new Date(review.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={review.id}
                  onClick={() => onSelectReview(review)}
                  className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                    isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={e => onToggleBookmark(review.id, e)}
                      className="mt-0.5 text-slate-400 hover:text-amber-500 transition-colors p-1"
                      title={review.isBookmarked ? 'Remove bookmark' : 'Bookmark snippet'}
                    >
                      {review.isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-amber-500 fill-current" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {review.title}
                        </span>
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase">
                          {review.language}
                        </span>
                      </div>

                      <p className="text-slate-500 dark:text-slate-400 truncate mb-1">
                        {review.summary || 'Automated code quality and security scan completed.'}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{dateStr}</span>
                        <span>·</span>
                        <span>{review.inputMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Health Score & Severity Badges */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                        {review.healthScore} <span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Health Score
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {review.criticalCount > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                          {review.criticalCount} Crit
                        </span>
                      )}
                      {review.highCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                          {review.highCount} High
                        </span>
                      )}
                      {review.criticalCount === 0 && review.highCount === 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Passed
                        </span>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
