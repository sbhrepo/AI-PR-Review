import { Config } from '../config/schema';
import { GitProvider } from '../providers';
import { OllamaClient } from '../llm/client';
import { StaticAnalyzer } from './static-analyzer';
import { DiffChunker } from './chunker';
import { IssueDeduplicator } from './deduplicator';
import { ReviewPolicy, ReviewIssue, PRMetadata } from '../types';
import { logger } from '../logging';

export class ReviewEngine {
  private config: Config;
  private provider: GitProvider;
  private llmClient: OllamaClient;
  private staticAnalyzer: StaticAnalyzer;
  private chunker: DiffChunker;

  constructor(config: Config, provider: GitProvider) {
    this.config = config;
    this.provider = provider;
    this.llmClient = new OllamaClient(config);
    this.staticAnalyzer = new StaticAnalyzer();
    this.chunker = new DiffChunker(config);
  }

  async reviewPR(
    repo: string,
    prNumber: number,
    policy: ReviewPolicy
  ): Promise<ReviewIssue[]> {
    logger.info({ repo, prNumber }, 'Starting PR review');

    // 1. Fetch PR metadata and diffs
    const [metadata, diffs] = await Promise.all([
      this.provider.getPRMetadata(repo, prNumber),
      this.provider.getPRDiffs(repo, prNumber),
    ]);

    logger.info({ fileCount: diffs.length }, 'Fetched PR diffs');

    // 2. Run static analysis
    const staticIssues = this.staticAnalyzer.analyzeAll(diffs);
    logger.info({ staticIssueCount: staticIssues.length }, 'Static analysis complete');

    // 3. Chunk diffs for LLM processing
    const chunks = this.chunker.chunkDiffs(diffs);
    logger.info({ chunkCount: chunks.length }, 'Diffs chunked');

    // 4. Process each chunk with LLM
    const llmIssues: ReviewIssue[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info({ chunk: i + 1, totalChunks: chunks.length, files: chunk.files }, 'Processing chunk');

      try {
        const chunkIssues = await this.llmClient.generateReview(
          policy,
          metadata,
          chunk.content
        );
        llmIssues.push(...chunkIssues);
        logger.info({ chunkIssues: chunkIssues.length }, 'Chunk processed');
      } catch (error: any) {
        logger.error({ error: error.message, chunk: i + 1 }, 'Failed to process chunk');
        // Continue with other chunks
      }
    }

    logger.info({ llmIssueCount: llmIssues.length }, 'LLM analysis complete');

    // 5. Merge and deduplicate issues
    const allIssues = IssueDeduplicator.merge([staticIssues, llmIssues]);
    logger.info({ totalIssues: allIssues.length }, 'Issues merged and deduplicated');

    // 6. Filter by policy constraints
    const filteredIssues = this.filterByPolicy(allIssues, policy);
    logger.info({ filteredIssues: filteredIssues.length }, 'Issues filtered by policy');

    return filteredIssues;
  }

  private filterByPolicy(issues: ReviewIssue[], policy: ReviewPolicy): ReviewIssue[] {
    return issues.filter(issue => {
      // Check if file should be excluded
      for (const exclusion of policy.exclusions) {
        if (issue.file.includes(exclusion)) {
          return false;
        }
      }

      // Apply confidence threshold (optional)
      if (issue.confidence < 0.5) {
        return false;
      }

      return true;
    });
  }

  async healthCheck(): Promise<boolean> {
    return this.llmClient.healthCheck();
  }
}
