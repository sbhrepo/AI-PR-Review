import { Config } from '../config/schema';
import { GitProvider } from './base';
import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';
import { AzureDevOpsProvider } from './azdo';

export class ProviderFactory {
  static create(config: Config): GitProvider {
    switch (config.provider) {
      case 'github':
        return new GitHubProvider(config);
      case 'gitlab':
        return new GitLabProvider();
      case 'azdo':
        return new AzureDevOpsProvider();
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}

export * from './base';
export * from './github';
export * from './gitlab';
export * from './azdo';
