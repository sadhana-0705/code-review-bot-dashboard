export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueCategory = 'Bug' | 'Security' | 'Performance' | 'Style';

export interface CodeFile {
  name: string;
  content: string;
  language: string;
}

export interface ReviewFinding {
  id: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  severity: Severity;
  category: IssueCategory;
  title: string;
  description: string;
  originalCode: string;
  suggestedFix: string;
  explanation: string;
  cwe?: string;
}

export interface ReviewItem {
  id: number;
  userUid: string;
  workspaceId?: number;
  title: string;
  language: string;
  inputMethod: 'snippet' | 'upload' | 'repo' | 'multi_file';
  filesJson: string;
  files?: CodeFile[];
  summary: string;
  healthScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findingsJson: string;
  findings?: ReviewFinding[];
  optimizedCode?: string;
  isBookmarked: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  reviewId: number;
  sender: 'user' | 'assistant';
  userUid?: string;
  message: string;
  createdAt: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerUid: string;
  userRole?: 'admin' | 'reviewer' | 'developer';
  createdAt: string;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userUid: string;
  email: string;
  role: 'admin' | 'reviewer' | 'developer';
  createdAt: string;
}

export interface CustomRule {
  id: number;
  workspaceId?: number;
  userUid: string;
  name: string;
  description?: string;
  promptDirective: string;
  category: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userUid: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface MetricsSummary {
  totalReviews: number;
  averageHealthScore: number;
  totalIssues: number;
  severityDistribution: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  categoryDistribution: {
    Bug: number;
    Security: number;
    Performance: number;
    Style: number;
  };
  recentTrend: {
    date: string;
    title: string;
    healthScore: number;
    critical: number;
    high: number;
  }[];
  topVulnerabilities: {
    title: string;
    count: number;
  }[];
}
