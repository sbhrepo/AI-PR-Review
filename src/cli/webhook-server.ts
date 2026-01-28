import express, { Request, Response } from 'express';
import { Webhooks } from '@octokit/webhooks';
import { Config } from '../config/schema';
import { ReviewPolicyParser } from '../config/policy-parser';
import { ProviderFactory } from '../providers';
import { ReviewEngine } from '../review/engine';
import { CommentPublisher } from '../publish/publisher';
import { DedupeStore } from '../storage/dedupe-store';
import { IssueDeduplicator } from '../review/deduplicator';
import { logger } from '../logging';

export async function startWebhookServer(
  config: Config,
  policyPath: string,
  port: number
): Promise<void> {
  const app = express();
  
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'development';
  const webhooks = new Webhooks({
    secret: webhookSecret,
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Webhook endpoint
  app.post('/webhook', express.json(), async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;

      if (!signature) {
        logger.warn('Missing webhook signature');
        res.status(401).send('Unauthorized');
        return;
      }

      // Verify webhook signature
      const isValid = await webhooks.verify(JSON.stringify(req.body), signature);
      if (!isValid) {
        logger.warn('Invalid webhook signature');
        res.status(401).send('Unauthorized');
        return;
      }

      logger.info({ event, action: req.body.action }, 'Received webhook');

      // Acknowledge receipt immediately
      res.status(202).send('Accepted');

      // Process webhook asynchronously
      processWebhook(config, policyPath, event, req.body).catch(error => {
        logger.error({ error: error.message, event }, 'Webhook processing failed');
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Webhook handler error');
      res.status(500).send('Internal Server Error');
    }
  });

  webhooks.on('pull_request.opened', async (event) => {
    logger.info({ pr: event.payload.pull_request.number }, 'PR opened event');
  });

  webhooks.on('pull_request.reopened', async (event) => {
    logger.info({ pr: event.payload.pull_request.number }, 'PR reopened event');
  });

  webhooks.on('pull_request.synchronize', async (event) => {
    logger.info({ pr: event.payload.pull_request.number }, 'PR synchronized event');
  });

  app.listen(port, () => {
    logger.info({ port }, '🚀 Webhook server started');
  });
}

async function processWebhook(
  config: Config,
  policyPath: string,
  event: string,
  payload: any
): Promise<void> {
  // Only process PR events
  if (event !== 'pull_request') {
    logger.debug({ event }, 'Ignoring non-PR event');
    return;
  }

  const action = payload.action;
  const validActions = ['opened', 'reopened', 'synchronize', 'ready_for_review'];
  
  if (!validActions.includes(action)) {
    logger.debug({ action }, 'Ignoring PR action');
    return;
  }

  const pr = payload.pull_request;
  const repo = payload.repository.full_name;
  const prNumber = pr.number;

  // Skip draft PRs unless they're marked ready for review
  if (pr.draft && action !== 'ready_for_review') {
    logger.info({ pr: prNumber }, 'Skipping draft PR');
    return;
  }

  try {
    logger.info({ repo, pr: prNumber, action }, 'Processing PR event');

    const policy = ReviewPolicyParser.parse(policyPath);
    const provider = ProviderFactory.create(config);
    await provider.authenticate();

    const reviewEngine = new ReviewEngine(config, provider);
    const publisher = new CommentPublisher(provider, config);
    const dedupeStore = new DedupeStore();
    await dedupeStore.initialize();

    // Run review
    const issues = await reviewEngine.reviewPR(repo, prNumber, policy);
    logger.info({ issueCount: issues.length }, 'Review complete');

    if (issues.length === 0) {
      await dedupeStore.close();
      return;
    }

    // Filter duplicates
    const existingEntries = await dedupeStore.getEntriesForPR(repo, prNumber);
    const existingHashes = new Set(existingEntries.map(e => e.hash));
    
    const newIssues = issues.filter(issue => {
      const hash = IssueDeduplicator.generateHash(issue);
      return !existingHashes.has(hash);
    });

    logger.info({ newIssues: newIssues.length }, 'New issues to report');

    if (newIssues.length > 0) {
      // Post comments
      const commentIds = await publisher.postInlineComments(repo, prNumber, newIssues);
      
      // Store in dedupe database
      for (const issue of newIssues) {
        const hash = IssueDeduplicator.generateHash(issue);
        const commentId = commentIds.get(`${issue.file}:${issue.start_line}:${issue.title}`);
        await dedupeStore.addEntry(hash, issue.file, issue.start_line, issue.title, commentId, repo, prNumber);
      }

      // Post summary and labels
      await publisher.postSummary(repo, prNumber, newIssues, commentIds);
      await publisher.addLabels(repo, prNumber, newIssues);

      logger.info({ pr: prNumber }, '✅ Review posted');
    }

    await dedupeStore.close();
  } catch (error: any) {
    logger.error({ error: error.message, repo, pr: prNumber }, 'Failed to process webhook');
  }
}
