import { PRMetadata, FileDiff, ReviewComment, ReviewSummary } from '../types';

/**
 * Abstract provider interface for Git platforms
 */
export interface GitProvider {
  /**
   * Authenticate with the provider
   */
  authenticate(): Promise<void>;

  /**
   * Fetch PR metadata
   */
  getPRMetadata(repo: string, prNumber: number): Promise<PRMetadata>;

  /**
   * Fetch PR file diffs
   */
  getPRDiffs(repo: string, prNumber: number): Promise<FileDiff[]>;

  /**
   * Get existing review comments on a PR
   */
  getExistingComments(repo: string, prNumber: number): Promise<ReviewComment[]>;

  /**
   * Post an inline review comment
   */
  postInlineComment(
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<{ id: string }>;

  /**
   * Update an existing comment
   */
  updateComment(repo: string, commentId: string, body: string): Promise<void>;

  /**
   * Post a review summary comment
   */
  postReviewSummary(
    repo: string,
    prNumber: number,
    summary: ReviewSummary,
    body: string
  ): Promise<void>;

  /**
   * Add labels to a PR
   */
  addLabels(repo: string, prNumber: number, labels: string[]): Promise<void>;

  /**
   * Resolve/unresolve a review thread
   */
  resolveThread?(repo: string, threadId: string, resolved: boolean): Promise<void>;
}
