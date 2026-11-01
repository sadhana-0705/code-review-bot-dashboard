import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { InlineSuggestions } from './components/InlineSuggestions.tsx';
import { DiffViewer } from './components/DiffViewer.tsx';
import { ReviewChat } from './components/ReviewChat.tsx';
import { MetricsDashboard } from './components/MetricsDashboard.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { WorkspaceModal } from './components/WorkspaceModal.tsx';
import { CustomRulesModal } from './components/CustomRulesModal.tsx';
import { ApiAccessModal } from './components/ApiAccessModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { NotificationsPopover } from './components/NotificationsPopover.tsx';
import {
  CodeFile,
  ReviewItem,
  ReviewFinding,
  ChatMessage,
  MetricsSummary,
} from './types/index.ts';
import {
  ShieldAlert,
  Sparkles,
  Download,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Code2,
  Columns,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';

const INITIAL_JAVA_CODE = `package com.example.codereview.controller;

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
        return "Transferred " + amount;
    }
}`;

function MainApp() {
  const { user, token, activeWorkspace, rules, refreshNotifications } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'review' | 'history' | 'metrics' | 'api'>('review');

  // Modals State
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Code Editor State
  const [files, setFiles] = useState<CodeFile[]>([
    {
      name: 'AccountController.java',
      content: INITIAL_JAVA_CODE,
      language: 'java',
    },
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('java');

  // Review & Output State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentReview, setCurrentReview] = useState<ReviewItem | null>(null);
  const [appliedFixIds, setAppliedFixIds] = useState<Set<string>>(new Set());
  const [selectedFindingId, setSelectedFindingId] = useState<string | undefined>();
  const [activeViewMode, setActiveViewMode] = useState<'findings' | 'diff' | 'chat'>('findings');

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // History & Metrics State
  const [reviewsHistory, setReviewsHistory] = useState<ReviewItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [metricsData, setMetricsData] = useState<MetricsSummary | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const activeRulesPromptDirectives = rules.filter(r => r.isEnabled).map(r => r.promptDirective);

  // Fetch reviews history
  const fetchReviewsHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/reviews', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReviewsHistory(data);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch quality metrics
  const fetchMetrics = async () => {
    if (!token) return;
    setLoadingMetrics(true);
    try {
      const res = await fetch('/api/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetricsData(data);
      }
    } catch (err) {
      console.error('Fetch metrics error:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReviewsHistory();
      fetchMetrics();
    }
  }, [token, activeTab]);

  // Handle Code Analysis Request
  const handleAnalyze = async (inputMethod: 'snippet' | 'upload' | 'repo' | 'multi_file') => {
    setIsAnalyzing(true);
    setAppliedFixIds(new Set());
    setSelectedFindingId(undefined);

    try {
      const res = await fetch('/api/reviews/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          files,
          language: selectedLanguage === 'auto' ? files[0].language : selectedLanguage,
          inputMethod,
          workspaceId: activeWorkspace?.id,
          customRules: activeRulesPromptDirectives,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to review code');
      }

      const reviewResult = await res.json();
      setCurrentReview({
        id: reviewResult.id,
        userUid: user?.uid || 'guest',
        workspaceId: activeWorkspace?.id,
        title: reviewResult.title,
        language: reviewResult.language || selectedLanguage,
        inputMethod,
        filesJson: JSON.stringify(files),
        files,
        summary: reviewResult.summary,
        healthScore: reviewResult.healthScore,
        criticalCount: reviewResult.criticalCount,
        highCount: reviewResult.highCount,
        mediumCount: reviewResult.mediumCount,
        lowCount: reviewResult.lowCount,
        findingsJson: JSON.stringify(reviewResult.findings),
        findings: reviewResult.findings,
        optimizedCode: reviewResult.optimizedCode,
        isBookmarked: false,
        createdAt: reviewResult.createdAt,
      });

      setChatMessages([]);
      setActiveViewMode('findings');
      refreshNotifications();
      if (token) {
        fetchReviewsHistory();
        fetchMetrics();
      }
    } catch (error: any) {
      console.error('Review error:', error);
      alert(`Code Review Failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // One-Click Fix Application
  const handleApplyFix = (finding: ReviewFinding) => {
    const fileIndex = files.findIndex(f => f.name === finding.file);
    const targetIdx = fileIndex !== -1 ? fileIndex : activeFileIndex;
    const targetFile = files[targetIdx];

    if (!targetFile) return;

    // Replace original problematic code with suggested fix
    const updatedContent = targetFile.content.replace(
      finding.originalCode.trim(),
      finding.suggestedFix.trim()
    );

    setFiles(prev =>
      prev.map((f, i) => (i === targetIdx ? { ...f, content: updatedContent } : f))
    );

    setAppliedFixIds(prev => new Set(prev).add(finding.id));
  };

  // Apply all remediations
  const handleApplyAllFixes = () => {
    if (!currentReview?.optimizedCode) return;
    setFiles(prev =>
      prev.map((f, i) =>
        i === activeFileIndex ? { ...f, content: currentReview.optimizedCode! } : f
      )
    );
    if (currentReview.findings) {
      setAppliedFixIds(new Set(currentReview.findings.map(f => f.id)));
    }
  };

  // Follow-up Chat Message
  const handleSendMessage = async (msg: string) => {
    if (!currentReview) return;
    setIsSendingChat(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      reviewId: currentReview.id,
      sender: 'user',
      message: msg,
      createdAt: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/reviews/${currentReview.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: msg }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const aiReply = await res.json();
      setChatMessages(prev => [...prev, aiReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    try {
      const res = await fetch(`/api/reviews/${id}/bookmark`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setReviewsHistory(prev =>
          prev.map(r => (r.id === id ? { ...r, isBookmarked: !r.isBookmarked } : r))
        );
        if (currentReview && currentReview.id === id) {
          setCurrentReview(prev =>
            prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null
          );
        }
      }
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    }
  };

  const handleSelectReviewFromHistory = (review: ReviewItem) => {
    try {
      const parsedFiles = review.filesJson ? JSON.parse(review.filesJson) : [];
      const parsedFindings = review.findingsJson ? JSON.parse(review.findingsJson) : [];
      setFiles(parsedFiles.length > 0 ? parsedFiles : [{ name: 'snippet', content: '', language: review.language }]);
      setSelectedLanguage(review.language);
      setCurrentReview({
        ...review,
        files: parsedFiles,
        findings: parsedFindings,
      });
      setActiveTab('review');
      setActiveViewMode('findings');
    } catch (e) {
      console.error('Error parsing review:', e);
    }
  };

  const primaryFile = files[activeFileIndex] || files[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 3-Zone Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWorkspaces={() => setWorkspaceModalOpen(true)}
        onOpenRules={() => setRulesModalOpen(true)}
        onOpenApiModal={() => setApiModalOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Top Code Input Editor */}
            <CodeEditor
              files={files}
              setFiles={setFiles}
              activeFileIndex={activeFileIndex}
              setActiveFileIndex={setActiveFileIndex}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              activeRulesCount={activeRulesPromptDirectives.length}
            />

            {/* Analysis Output Results Container */}
            {currentReview && (
              <div className="space-y-6">
                {/* Executive Summary Card */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {currentReview.title}
                        </span>
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase">
                          {currentReview.language}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Automated AST inspection, vulnerability signature matching & performance audit
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Health Score Gauge */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                            {currentReview.healthScore}
                            <span className="text-xs font-normal text-slate-400">/100</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">HEALTH SCORE</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => handleToggleBookmark(currentReview.id, e)}
                          title="Bookmark review"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {currentReview.isBookmarked ? (
                            <BookmarkCheck className="w-4 h-4 text-amber-500 fill-current" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setExportModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Report</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    {currentReview.summary}
                  </p>
                </div>

                {/* View Switcher for Review Output */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-lg">
                    <button
                      onClick={() => setActiveViewMode('findings')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                        activeViewMode === 'findings'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Inline Findings ({currentReview.findings?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveViewMode('diff')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                        activeViewMode === 'diff'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      Side-by-Side Diff
                    </button>
                    <button
                      onClick={() => setActiveViewMode('chat')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                        activeViewMode === 'chat'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Discussion Chat ({chatMessages.length})
                    </button>
                  </div>
                </div>

                {/* Tab Views */}
                {activeViewMode === 'findings' && (
                  <InlineSuggestions
                    findings={currentReview.findings || []}
                    onApplyFix={handleApplyFix}
                    onApplyAllFixes={handleApplyAllFixes}
                    onSelectFinding={f => setSelectedFindingId(f.id)}
                    selectedFindingId={selectedFindingId}
                    appliedFixIds={appliedFixIds}
                  />
                )}

                {activeViewMode === 'diff' && (
                  <DiffViewer
                    originalCode={primaryFile?.content || ''}
                    optimizedCode={currentReview.optimizedCode || primaryFile?.content || ''}
                    fileName={primaryFile?.name || 'Code Snippet'}
                  />
                )}

                {activeViewMode === 'chat' && (
                  <ReviewChat
                    messages={chatMessages}
                    onSendMessage={handleSendMessage}
                    isSending={isSendingChat}
                    reviewTitle={currentReview.title}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <HistoryList
            reviews={reviewsHistory}
            loading={loadingHistory}
            onSelectReview={handleSelectReviewFromHistory}
            onToggleBookmark={handleToggleBookmark}
            selectedReviewId={currentReview?.id}
          />
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <MetricsDashboard
            metrics={metricsData}
            loading={loadingMetrics}
            onRunNewReview={() => setActiveTab('review')}
          />
        )}

        {/* API Tab */}
        {activeTab === 'api' && <ApiAccessModal isView={true} />}
      </main>

      {/* Modals */}
      <WorkspaceModal
        isOpen={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
      />

      <CustomRulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />

      <ApiAccessModal
        isOpen={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        isView={false}
      />

      {currentReview && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          review={currentReview}
        />
      )}

      <NotificationsPopover
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onSelectReviewById={id => {
          const matched = reviewsHistory.find(r => r.id === id);
          if (matched) handleSelectReviewFromHistory(matched);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
