import { FileDiff, ReviewIssue } from '../types';
import { logger } from '../logging';

interface StaticCheckRule {
  id: string;
  category: ReviewIssue['category'];
  severity: ReviewIssue['severity'];
  pattern: RegExp;
  title: string;
  explanation: string;
  suggested_fix: string;
  enabled: boolean;
}

const STATIC_RULES: StaticCheckRule[] = [
  {
    id: 'secret-aws-key',
    category: 'security',
    severity: 'critical',
    pattern: /AKIA[0-9A-Z]{16}/g,
    title: 'Potential AWS Access Key exposed',
    explanation: 'AWS access keys should never be committed to source code. This can lead to unauthorized access to your AWS resources.',
    suggested_fix: 'Remove the key and use environment variables or AWS Secrets Manager. Rotate the compromised key immediately.',
    enabled: true,
  },
  {
    id: 'secret-generic-token',
    pattern: /(?:token|api[_-]?key|secret)["\s]*[:=]["\s]*[a-zA-Z0-9_\-]{20,}/gi,
    category: 'security',
    severity: 'high',
    title: 'Potential secret or API key in code',
    explanation: 'Hardcoded secrets should be avoided. Use environment variables or secret management systems.',
    suggested_fix: 'Move the secret to an environment variable and reference it via process.env or similar.',
    enabled: true,
  },
  {
    id: 'sql-injection',
    pattern: /(?:execute|query|exec)\s*\(\s*["'].*?\+.*?["']\s*\)/gi,
    category: 'security',
    severity: 'high',
    title: 'Potential SQL injection vulnerability',
    explanation: 'String concatenation in SQL queries can lead to SQL injection attacks. Use parameterized queries instead.',
    suggested_fix: 'Use parameterized queries or prepared statements with placeholders.',
    enabled: true,
  },
  {
    id: 'eval-usage',
    pattern: /\beval\s*\(/g,
    category: 'security',
    severity: 'high',
    title: 'Use of eval() is dangerous',
    explanation: 'eval() can execute arbitrary code and poses significant security risks if user input is involved.',
    suggested_fix: 'Avoid eval(). Use safer alternatives like JSON.parse() for data or explicit function calls.',
    enabled: true,
  },
  {
    id: 'command-injection',
    pattern: /(?:exec|spawn|execSync|spawnSync)\s*\(.*?\+.*?\)/g,
    category: 'security',
    severity: 'high',
    title: 'Potential command injection',
    explanation: 'Concatenating user input into shell commands can lead to command injection attacks.',
    suggested_fix: 'Use array-based arguments for child_process methods or properly sanitize inputs.',
    enabled: true,
  },
  {
    id: 'missing-error-handling',
    pattern: /await\s+[^;]+;(?!\s*(?:catch|\.catch))/g,
    category: 'reliability',
    severity: 'medium',
    title: 'Async call without error handling',
    explanation: 'Unhandled promise rejections can cause unexpected application crashes.',
    suggested_fix: 'Wrap in try-catch or add .catch() handler.',
    enabled: true,
  },
  {
    id: 'nested-loop',
    pattern: /for\s*\([^)]*\)\s*{[^}]*for\s*\([^)]*\)/g,
    category: 'performance',
    severity: 'medium',
    title: 'Nested loop detected',
    explanation: 'Nested loops can cause O(n²) or worse performance. Consider optimizing with hash maps or alternative algorithms.',
    suggested_fix: 'Review algorithm complexity. Consider using Map/Set for lookups or breaking into separate functions.',
    enabled: false, // Can produce false positives
  },
];

export class StaticAnalyzer {
  private rules: StaticCheckRule[];

  constructor(enabledRules?: string[]) {
    if (enabledRules) {
      this.rules = STATIC_RULES.filter(r => enabledRules.includes(r.id));
    } else {
      this.rules = STATIC_RULES.filter(r => r.enabled);
    }
  }

  analyzeFile(file: FileDiff): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    if (!file.patch) return issues;

    // Get added lines only (lines starting with +)
    const addedLines = file.patch.split('\n').filter(line => line.startsWith('+'));
    const addedContent = addedLines.join('\n');

    for (const rule of this.rules) {
      const matches = addedContent.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (!match.index) continue;

        // Find line number
        const lineNumber = this.findLineNumber(file.patch, match[0]);
        
        if (lineNumber > 0) {
          issues.push({
            file: file.path,
            start_line: lineNumber,
            end_line: lineNumber,
            category: rule.category,
            severity: rule.severity,
            title: rule.title,
            explanation: rule.explanation,
            suggested_fix: rule.suggested_fix,
            confidence: 0.7, // Static analysis has moderate confidence
            rationale: `Detected by static rule: ${rule.id}`,
            references: [],
          });
        }
      }
    }

    logger.debug({ file: file.path, issueCount: issues.length }, 'Static analysis complete');
    return issues;
  }

  private findLineNumber(patch: string, matchedText: string): number {
    const lines = patch.split('\n');
    let currentLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track line numbers from diff headers
      const hunkMatch = line.match(/@@ -\d+,\d+ \+(\d+),\d+ @@/);
      if (hunkMatch) {
        currentLine = parseInt(hunkMatch[1], 10) - 1;
        continue;
      }

      // Only count added or context lines
      if (line.startsWith('+') || line.startsWith(' ')) {
        currentLine++;
      }

      // Check if this line contains the match
      if (line.includes(matchedText)) {
        return currentLine;
      }
    }

    return 0;
  }

  analyzeAll(files: FileDiff[]): ReviewIssue[] {
    const allIssues: ReviewIssue[] = [];

    for (const file of files) {
      const fileIssues = this.analyzeFile(file);
      allIssues.push(...fileIssues);
    }

    return allIssues;
  }
}
