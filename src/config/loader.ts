import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Config, ConfigSchema } from './schema';

export class ConfigLoader {
  static load(configPath: string): Config {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const rawConfig = yaml.load(content);

    try {
      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  static loadFromEnv(): Config {
    const configPath = process.env.PR_AI_REVIEWER_CONFIG || './pr-ai-reviewer.config.yaml';
    return this.load(configPath);
  }
}
