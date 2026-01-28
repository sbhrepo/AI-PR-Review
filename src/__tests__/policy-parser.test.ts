import { ReviewPolicyParser } from '../config/policy-parser';
import { ReviewPolicy } from '../types';

describe('ReviewPolicyParser', () => {
  describe('plaintext parsing', () => {
    it('should parse plaintext format correctly', () => {
      const content = `
[Checks]
Security: weight=5 - SQL injection, command injection, secrets exposure
Reliability: weight=4 - null checks, error handling
Performance: weight=3 - n^2 loops, unnecessary allocations

[Must-Check]
Ensure no secrets or API keys in code
Validate all external inputs

[Exclusions]
Ignore generated files
Ignore .md files

[Output Preferences]
Prefer minimal diffs
Keep comments concise
`;

      const tempFile = '/tmp/test-policy.txt';
      const fs = require('fs');
      fs.writeFileSync(tempFile, content);

      const policy = ReviewPolicyParser.parse(tempFile);

      expect(policy.checks).toHaveProperty('security');
      expect(policy.checks.security.weight).toBe(5);
      expect(policy.checks.security.items).toContain('SQL injection');
      
      expect(policy.must_check).toContain('Ensure no secrets or API keys in code');
      expect(policy.exclusions).toContain('Ignore generated files');
      
      fs.unlinkSync(tempFile);
    });
  });

  describe('YAML parsing', () => {
    it('should parse YAML format correctly', () => {
      const content = `
checks:
  security:
    weight: 5
    items:
      - SQL injection
      - command injection
  reliability:
    weight: 4
    items:
      - null checks
      - error handling

must_check:
  - Ensure no secrets in code
  - Validate inputs

exclusions:
  - "*.lock"
  - "*.md"
`;

      const tempFile = '/tmp/test-policy.yaml';
      const fs = require('fs');
      fs.writeFileSync(tempFile, content);

      const policy = ReviewPolicyParser.parse(tempFile);

      expect(policy.checks).toHaveProperty('security');
      expect(policy.checks.security.weight).toBe(5);
      expect(policy.must_check).toContain('Ensure no secrets in code');
      
      fs.unlinkSync(tempFile);
    });
  });
});
