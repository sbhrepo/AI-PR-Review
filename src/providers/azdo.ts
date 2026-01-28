import { GitProvider } from './base';
import { PRMetadata, FileDiff, ReviewComment, ReviewSummary } from '../types';
import { logger } from '../logging';

/**
 * Azure DevOps provider stub - to be fully implemented
 */
export class AzureDevOpsProvider implements GitProvider {
  async authenticate(): Promise<void> {
    logger.warn('Azure DevOps provider not yet implemented');
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async getPRMetadata(repo: string, prNumber: number): Promise<PRMetadata> {
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async getPRDiffs(repo: string, prNumber: number): Promise<FileDiff[]> {
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async getExistingComments(repo: string, prNumber: number): Promise<ReviewComment[]> {
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async postInlineComment(
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<{ id: string }> {
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async updateComment(repo: string, commentId: string, body: string): Promise<void> {
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async postReviewSummary(
    repo: string,
    prNumber: number,
    summary: ReviewSummary,
    body: string
  ): Promise<void> {
    throw new Error('Azure DevOps provider not yet implemented');
  }

  async addLabels(repo: string, prNumber: number, labels: string[]): Promise<void> {
    throw new Error('Azure DevOps provider not yet implemented');
  }
}
