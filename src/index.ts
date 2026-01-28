// Main exports for programmatic usage
export { Config, ConfigSchema } from './config/schema';
export { ConfigLoader } from './config/loader';
export { ReviewPolicyParser } from './config/policy-parser';

export { GitProvider } from './providers/base';
export { GitHubProvider } from './providers/github';
export { ProviderFactory } from './providers';

export { OllamaClient } from './llm/client';

export { ReviewEngine } from './review/engine';
export { StaticAnalyzer } from './review/static-analyzer';
export { DiffChunker } from './review/chunker';
export { IssueDeduplicator } from './review/deduplicator';

export { CommentPublisher } from './publish/publisher';

export { DedupeStore } from './storage/dedupe-store';

export { logger, createChildLogger } from './logging';

export * from './types';
