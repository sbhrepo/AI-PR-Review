import { GitProvider } from './base';
import { PRMetadata, FileDiff, ReviewComment, ReviewSummary } from '../types';
import { logger } from '../logging';

/**
 * GitLab provider stub - to be fully implemented
 */
export class GitLabProvider implements GitProvider {
  async authenticate(): Promise<void> {
    logger.warn('GitLab provider not yet implemented');
    throw new Error('GitLab provider not yet implemented');
  }

  async getPRMetadata(repo: string, prNumber: number): Promise<PRMetadata> {
    throw new Error('GitLab provider not yet implemented');
  }

  async getPRDiffs(repo: string, prNumber: number): Promise<FileDiff[]> {
    throw new Error('GitLab provider not yet implemented');
  }

  async getExistingComments(repo: string, prNumber: number): Promise<ReviewComment[]> {
    throw new Error('GitLab provider not yet implemented');
  }

  async postInlineComment(
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<{ id: string }> {
    throw new Error('GitLab provider not yet implemented');
  }

  async updateComment(repo: string, commentId: string, body: string): Promise<void> {
    throw new Error('GitLab provider not yet implemented');
  }

  async postReviewSummary(
    repo: string,
    prNumber: number,
    summary: ReviewSummary,
    body: string
  ): Promise<void> {
    throw new Error('GitLab provider not yet implemented');
  }

  async addLabels(repo: string, prNumber: number, labels: string[]): Promise<void> {
    throw new Error('GitLab provider not yet implemented');
  }
}
