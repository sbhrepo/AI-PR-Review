import { IssueDeduplicator } from '../review/deduplicator';
import { ReviewIssue } from '../types';

describe('IssueDeduplicator', () => {
  const createTestIssue = (overrides?: Partial<ReviewIssue>): ReviewIssue => ({
    file: 'test.ts',
    start_line: 10,
    end_line: 10,
    category: 'security',
    severity: 'high',
    title: 'Test issue',
    explanation: 'This is a test',
    suggested_fix: 'Fix it',
    confidence: 0.9,
    rationale: 'Because',
    ...overrides,
  });

  describe('generateHash', () => {
    it('should generate consistent hashes for same issue', () => {
      const issue1 = createTestIssue();
      const issue2 = createTestIssue();

      const hash1 = IssueDeduplicator.generateHash(issue1);
      const hash2 = IssueDeduplicator.generateHash(issue2);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different issues', () => {
      const issue1 = createTestIssue({ start_line: 10 });
      const issue2 = createTestIssue({ start_line: 20 });

      const hash1 = IssueDeduplicator.generateHash(issue1);
      const hash2 = IssueDeduplicator.generateHash(issue2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('deduplicate', () => {
    it('should remove duplicate issues', () => {
      const issues = [
        createTestIssue(),
        createTestIssue(),
        createTestIssue({ start_line: 20 }),
      ];

      const unique = IssueDeduplicator.deduplicate(issues);

      expect(unique).toHaveLength(2);
    });

    it('should preserve order', () => {
      const issues = [
        createTestIssue({ start_line: 10 }),
        createTestIssue({ start_line: 20 }),
        createTestIssue({ start_line: 10 }),
      ];

      const unique = IssueDeduplicator.deduplicate(issues);

      expect(unique[0].start_line).toBe(10);
      expect(unique[1].start_line).toBe(20);
    });
  });

  describe('merge', () => {
    it('should merge issues from multiple sources', () => {
      const staticIssues = [
        createTestIssue({ confidence: 0.7 }),
      ];

      const llmIssues = [
        createTestIssue({ confidence: 0.9 }),
        createTestIssue({ start_line: 20, confidence: 0.8 }),
      ];

      const merged = IssueDeduplicator.merge([staticIssues, llmIssues]);

      expect(merged).toHaveLength(2);
      // Should pick the higher confidence issue for line 10
      expect(merged[0].confidence).toBe(0.9);
    });

    it('should prioritize by severity when confidence is equal', () => {
      const issues1 = [
        createTestIssue({ confidence: 0.8, severity: 'medium' }),
      ];

      const issues2 = [
        createTestIssue({ confidence: 0.8, severity: 'critical' }),
      ];

      const merged = IssueDeduplicator.merge([issues1, issues2]);

      expect(merged).toHaveLength(1);
      expect(merged[0].severity).toBe('critical');
    });
  });
});
