import crypto from 'crypto';
import { ReviewIssue } from '../types';

export class IssueDeduplicator {
  /**
   * Generate a hash for an issue to detect duplicates
   */
  static generateHash(issue: ReviewIssue): string {
    const key = `${issue.file}:${issue.start_line}:${issue.title}:${issue.category}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Remove duplicate issues from an array
   */
  static deduplicate(issues: ReviewIssue[]): ReviewIssue[] {
    const seen = new Set<string>();
    const unique: ReviewIssue[] = [];

    for (const issue of issues) {
      const hash = this.generateHash(issue);
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(issue);
      }
    }

    return unique;
  }

  /**
   * Merge issues from multiple sources (static + LLM)
   * Prioritize higher confidence and severity
   */
  static merge(issuesLists: ReviewIssue[][]): ReviewIssue[] {
    const allIssues = issuesLists.flat();
    const grouped = new Map<string, ReviewIssue[]>();

    // Group by hash
    for (const issue of allIssues) {
      const hash = this.generateHash(issue);
      if (!grouped.has(hash)) {
        grouped.set(hash, []);
      }
      grouped.get(hash)!.push(issue);
    }

    // Pick best issue from each group
    const merged: ReviewIssue[] = [];
    for (const [hash, issues] of grouped) {
      // Sort by confidence desc, then severity
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      issues.sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      merged.push(issues[0]);
    }

    return merged;
  }
}
