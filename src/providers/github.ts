import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import parseDiff from 'parse-diff';
import { GitProvider } from './base';
import { PRMetadata, FileDiff, ReviewComment, ReviewSummary, DiffHunk } from '../types';
import { logger } from '../logging';
import { Config } from '../config/schema';

export class GitHubProvider implements GitProvider {
  private octokit: Octokit | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    const githubConfig = this.config.auth.github;
    if (!githubConfig) {
      throw new Error('GitHub auth configuration missing');
    }

    if (githubConfig.type === 'app') {
      const appId = process.env[githubConfig.app_id_env || 'GITHUB_APP_ID'];
      const installationId = process.env[githubConfig.installation_id_env || 'GITHUB_APP_INSTALLATION_ID'];
      const privateKey = process.env[githubConfig.private_key_env || 'GITHUB_APP_PRIVATE_KEY'];

      if (!appId || !installationId || !privateKey) {
        throw new Error('GitHub App credentials missing from environment');
      }

      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          installationId,
        },
      });
    } else {
      const token = process.env[githubConfig.token_env || 'GITHUB_TOKEN'];
      if (!token) {
        throw new Error('GitHub token missing from environment');
      }

      this.octokit = new Octokit({ auth: token });
    }

    logger.info('GitHub provider authenticated');
  }

  async getPRMetadata(repo: string, prNumber: number): Promise<PRMetadata> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    const { data: pr } = await this.octokit.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    return {
      number: pr.number,
      title: pr.title,
      description: pr.body || '',
      author: pr.user?.login || 'unknown',
      base_branch: pr.base.ref,
      head_branch: pr.head.ref,
      labels: pr.labels.map(l => l.name),
      state: pr.state as 'open' | 'closed',
    };
  }

  async getPRDiffs(repo: string, prNumber: number): Promise<FileDiff[]> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    
    // Get files changed in PR
    const { data: files } = await this.octokit.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: prNumber,
      per_page: 100,
    });

    const fileDiffs: FileDiff[] = [];

    for (const file of files) {
      if (!file.patch) continue;

      const parsed = parseDiff(file.patch);
      const hunks: DiffHunk[] = [];

      for (const chunk of parsed[0]?.chunks || []) {
        hunks.push({
          old_start: chunk.oldStart,
          old_lines: chunk.oldLines,
          new_start: chunk.newStart,
          new_lines: chunk.newLines,
          lines: chunk.changes.map(c => c.content),
          content: chunk.content,
        });
      }

      fileDiffs.push({
        path: file.filename,
        status: file.status as any,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
        hunks,
      });
    }

    return fileDiffs;
  }

  async getExistingComments(repo: string, prNumber: number): Promise<ReviewComment[]> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    const { data: comments } = await this.octokit.pulls.listReviewComments({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    return comments.map(c => ({
      path: c.path,
      line: c.line || c.original_line || 0,
      side: (c.side?.toUpperCase() as 'LEFT' | 'RIGHT') || 'RIGHT',
      body: c.body,
    }));
  }

  async postInlineComment(
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<{ id: string }> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    
    try {
      // Get the PR to obtain the commit SHA
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });

      const { data } = await this.octokit.pulls.createReviewComment({
        owner,
        repo: repoName,
        pull_number: prNumber,
        body: comment.body,
        path: comment.path,
        line: comment.line,
        commit_id: pr.head.sha,
        side: comment.side,
      });

      return { id: data.id.toString() };
    } catch (error: any) {
      logger.error({ error: error.message, comment }, 'Failed to post inline comment');
      throw error;
    }
  }

  async updateComment(repo: string, commentId: string, body: string): Promise<void> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    await this.octokit.pulls.updateReviewComment({
      owner,
      repo: repoName,
      comment_id: parseInt(commentId, 10),
      body,
    });
  }

  async postReviewSummary(
    repo: string,
    prNumber: number,
    summary: ReviewSummary,
    body: string
  ): Promise<void> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    
    await this.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: prNumber,
      body,
    });
  }

  async addLabels(repo: string, prNumber: number, labels: string[]): Promise<void> {
    if (!this.octokit) throw new Error('Not authenticated');

    const [owner, repoName] = repo.split('/');
    
    await this.octokit.issues.addLabels({
      owner,
      repo: repoName,
      issue_number: prNumber,
      labels,
    });
  }
}
