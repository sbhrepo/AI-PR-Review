// Core types for the review system

export interface ReviewIssue {
  file: string;
  start_line: number;
  end_line: number;
  category: 'security' | 'reliability' | 'performance' | 'maintainability' | 'style';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  suggested_fix: string;
  references?: string[];
  confidence: number;
  rationale: string;
}

export interface PRMetadata {
  number: number;
  title: string;
  description: string;
  author: string;
  base_branch: string;
  head_branch: string;
  labels: string[];
  state: 'open' | 'closed' | 'merged';
}

export interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: string[];
  content: string;
}

export interface ReviewComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  issue?: ReviewIssue;
}

export interface ReviewSummary {
  total_issues: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  risk_score: number;
  recommendations: string[];
  inline_comment_refs: string[];
}

export interface ReviewPolicy {
  checks: {
    [category: string]: {
      weight: number;
      items: string[];
    };
  };
  must_check: string[];
  exclusions: string[];
  output_preferences: {
    minimal_diffs: boolean;
    concise_comments: boolean;
  };
}

export interface DedupeEntry {
  hash: string;
  file: string;
  line: number;
  title: string;
  comment_id?: string;
  created_at: Date;
  resolved: boolean;
}
