import fs from 'fs';
import yaml from 'js-yaml';
import { ReviewPolicy } from '../types';

export class ReviewPolicyParser {
  /**
   * Parse AI-review-request.txt file (supports both plaintext and YAML formats)
   */
  static parse(filePath: string): ReviewPolicy {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Review policy file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Try YAML first
    try {
      const yamlData = yaml.load(content) as any;
      if (yamlData && typeof yamlData === 'object') {
        return this.parseYAML(yamlData);
      }
    } catch {
      // Fall back to plaintext parsing
    }

    return this.parsePlaintext(content);
  }

  private static parseYAML(data: any): ReviewPolicy {
    const policy: ReviewPolicy = {
      checks: {},
      must_check: [],
      exclusions: [],
      output_preferences: {
        minimal_diffs: true,
        concise_comments: true,
      },
    };

    if (data.Checks || data.checks) {
      const checks = data.Checks || data.checks;
      for (const [category, config] of Object.entries(checks as any)) {
        const configObj = config as any;
        policy.checks[category.toLowerCase()] = {
          weight: configObj.weight || 1,
          items: Array.isArray(configObj.items) ? configObj.items : configObj.items.split(',').map((s: string) => s.trim()),
        };
      }
    }

    if (data['Must-Check'] || data.must_check) {
      policy.must_check = data['Must-Check'] || data.must_check;
    }

    if (data.Exclusions || data.exclusions) {
      policy.exclusions = data.Exclusions || data.exclusions;
    }

    if (data['Output Preferences'] || data.output_preferences) {
      const prefs = data['Output Preferences'] || data.output_preferences;
      if (prefs.minimal_diffs !== undefined) policy.output_preferences.minimal_diffs = prefs.minimal_diffs;
      if (prefs.concise_comments !== undefined) policy.output_preferences.concise_comments = prefs.concise_comments;
    }

    return policy;
  }

  private static parsePlaintext(content: string): ReviewPolicy {
    const policy: ReviewPolicy = {
      checks: {},
      must_check: [],
      exclusions: [],
      output_preferences: {
        minimal_diffs: true,
        concise_comments: true,
      },
    };

    const lines = content.split('\n');
    let currentSection: string | null = null;

    for (let line of lines) {
      line = line.trim();
      
      if (!line || line.startsWith('#')) continue;

      // Section headers
      if (line.match(/^\[Checks\]/i)) {
        currentSection = 'checks';
        continue;
      } else if (line.match(/^\[Must-Check\]/i)) {
        currentSection = 'must_check';
        continue;
      } else if (line.match(/^\[Exclusions\]/i)) {
        currentSection = 'exclusions';
        continue;
      } else if (line.match(/^\[Output Preferences\]/i)) {
        currentSection = 'output_preferences';
        continue;
      }

      if (currentSection === 'checks') {
        const match = line.match(/^(\w+):\s*weight=(\d+)\s*-\s*(.+)$/i);
        if (match) {
          const [, category, weight, items] = match;
          policy.checks[category.toLowerCase()] = {
            weight: parseInt(weight, 10),
            items: items.split(',').map(s => s.trim()),
          };
        }
      } else if (currentSection === 'must_check') {
        if (line && !line.startsWith('[')) {
          policy.must_check.push(line);
        }
      } else if (currentSection === 'exclusions') {
        if (line && !line.startsWith('[')) {
          policy.exclusions.push(line);
        }
      } else if (currentSection === 'output_preferences') {
        if (line.toLowerCase().includes('minimal diffs')) {
          policy.output_preferences.minimal_diffs = true;
        }
        if (line.toLowerCase().includes('concise')) {
          policy.output_preferences.concise_comments = true;
        }
      }
    }

    return policy;
  }
}
