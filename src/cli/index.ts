#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { ConfigLoader } from '../config/loader';
import { ReviewPolicyParser } from '../config/policy-parser';
import { ProviderFactory } from '../providers';
import { ReviewEngine } from '../review/engine';
import { CommentPublisher } from '../publish/publisher';
import { DedupeStore } from '../storage/dedupe-store';
import { IssueDeduplicator } from '../review/deduplicator';
import { logger } from '../logging';
import { startWebhookServer } from './webhook-server';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('pr-ai-reviewer')
  .description('AI-powered code review tool for pull requests')
  .version('1.0.0');

program
  .command('review-pr')
  .description('Review a specific pull request')
  .requiredOption('--repo <repo>', 'Repository (owner/name)')
  .requiredOption('--pr <number>', 'PR number')
  .option('--policy <path>', 'Path to AI-review-request.txt', './AI-review-request.txt')
  .option('--config <path>', 'Path to config file', './pr-ai-reviewer.config.yaml')
  .option('--dry-run', 'Run review without posting comments')
  .action(async (options) => {
    try {
      logger.info({ repo: options.repo, pr: options.pr }, 'Starting PR review');

      // Load configuration
      const config = ConfigLoader.load(options.config);
      const policy = ReviewPolicyParser.parse(options.policy);

      // Initialize components
      const provider = ProviderFactory.create(config);
      await provider.authenticate();

      const reviewEngine = new ReviewEngine(config, provider);
      const publisher = new CommentPublisher(provider, config);
      const dedupeStore = new DedupeStore();
      await dedupeStore.initialize();

      // Check LLM health
      const healthy = await reviewEngine.healthCheck();
      if (!healthy) {
        logger.warn('LLM health check failed, but continuing anyway');
      }

      // Run review
      const prNumber = parseInt(options.pr, 10);
      const issues = await reviewEngine.reviewPR(options.repo, prNumber, policy);

      logger.info({ issueCount: issues.length }, 'Review complete');

      if (issues.length === 0) {
        logger.info('No issues found! 🎉');
        await dedupeStore.close();
        return;
      }

      // Filter out already-reported issues
      const existingEntries = await dedupeStore.getEntriesForPR(options.repo, prNumber);
      const existingHashes = new Set(existingEntries.map(e => e.hash));
      
      const newIssues = issues.filter(issue => {
        const hash = IssueDeduplicator.generateHash(issue);
        return !existingHashes.has(hash);
      });

      logger.info({ newIssues: newIssues.length, totalIssues: issues.length }, 'Filtered duplicate issues');

      if (options.dryRun) {
        logger.info({ issues: newIssues }, 'Dry run - issues found');
        await dedupeStore.close();
        return;
      }

      // Post comments
      if (newIssues.length > 0) {
        const commentIds = await publisher.postInlineComments(options.repo, prNumber, newIssues);
        
        // Store in dedupe database
        for (const issue of newIssues) {
          const hash = IssueDeduplicator.generateHash(issue);
          const commentId = commentIds.get(`${issue.file}:${issue.start_line}:${issue.title}`);
          await dedupeStore.addEntry(
            hash,
            issue.file,
            issue.start_line,
            issue.title,
            commentId,
            options.repo,
            prNumber
          );
        }

        // Post summary
        await publisher.postSummary(options.repo, prNumber, newIssues, commentIds);

        // Add labels
        await publisher.addLabels(options.repo, prNumber, newIssues);

        logger.info('✅ Review posted successfully');
      } else {
        logger.info('No new issues to report');
      }

      // Cleanup old entries
      const cleaned = await dedupeStore.cleanOldEntries(config.review.dedupe_window_days);
      logger.info({ cleaned }, 'Cleaned old dedupe entries');

      await dedupeStore.close();
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, 'Review failed');
      process.exit(1);
    }
  });

program
  .command('review-open-prs')
  .description('Review all open PRs in configured repositories')
  .option('--policy <path>', 'Path to AI-review-request.txt', './AI-review-request.txt')
  .option('--config <path>', 'Path to config file', './pr-ai-reviewer.config.yaml')
  .option('--dry-run', 'Run review without posting comments')
  .action(async (options) => {
    try {
      const config = ConfigLoader.load(options.config);
      logger.info({ repos: config.repos }, 'Reviewing all open PRs');

      // This would require implementing getPRs() on the provider
      logger.warn('review-open-prs not yet fully implemented - use webhook or individual review-pr commands');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to review open PRs');
      process.exit(1);
    }
  });

program
  .command('serve-webhooks')
  .description('Start webhook server to listen for PR events')
  .option('--port <port>', 'Server port', '3000')
  .option('--config <path>', 'Path to config file', './pr-ai-reviewer.config.yaml')
  .option('--policy <path>', 'Path to AI-review-request.txt', './AI-review-request.txt')
  .action(async (options) => {
    try {
      const config = ConfigLoader.load(options.config);
      const port = parseInt(options.port, 10);

      await startWebhookServer(config, options.policy, port);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start webhook server');
      process.exit(1);
    }
  });

program
  .command('health-check')
  .description('Check if Ollama LLM is accessible')
  .option('--config <path>', 'Path to config file', './pr-ai-reviewer.config.yaml')
  .action(async (options) => {
    try {
      const config = ConfigLoader.load(options.config);
      const { OllamaClient } = await import('../llm/client');
      const client = new OllamaClient(config);

      logger.info('Checking Ollama connection...');
      const healthy = await client.healthCheck();

      if (healthy) {
        logger.info('✅ Ollama is healthy');
        process.exit(0);
      } else {
        logger.error('❌ Ollama health check failed');
        process.exit(1);
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Health check failed');
      process.exit(1);
    }
  });

program.parse();
