import { StaticAnalyzer } from '../review/static-analyzer';
import { FileDiff } from '../types';

describe('StaticAnalyzer', () => {
  const analyzer = new StaticAnalyzer();

  const createFileDiff = (patch: string): FileDiff => ({
    path: 'test.ts',
    status: 'modified',
    additions: 10,
    deletions: 5,
    patch,
    hunks: [],
  });

  describe('analyzeFile', () => {
    it('should detect AWS keys', () => {
      const patch = `
@@ -1,3 +1,4 @@
 const config = {
-  key: 'old-key'
+  key: 'AKIAIOSFODNN7EXAMPLE'
 };
`;

      const file = createFileDiff(patch);
      const issues = analyzer.analyzeFile(file);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].category).toBe('security');
      expect(issues[0].title).toContain('AWS');
    });

    it('should detect potential SQL injection', () => {
      const patch = `
@@ -1,3 +1,4 @@
 function getUser(id) {
-  return db.query('SELECT * FROM users WHERE id = ?', [id]);
+  return db.query('SELECT * FROM users WHERE id = ' + id);
 }
`;

      const file = createFileDiff(patch);
      const issues = analyzer.analyzeFile(file);

      const sqlInjectionIssue = issues.find(i => i.title.toLowerCase().includes('sql'));
      expect(sqlInjectionIssue).toBeDefined();
      expect(sqlInjectionIssue?.severity).toBe('high');
    });

    it('should detect eval usage', () => {
      const patch = `
@@ -1,3 +1,4 @@
 function processInput(code) {
+  eval(code);
 }
`;

      const file = createFileDiff(patch);
      const issues = analyzer.analyzeFile(file);

      const evalIssue = issues.find(i => i.title.toLowerCase().includes('eval'));
      expect(evalIssue).toBeDefined();
    });

    it('should not flag removed lines', () => {
      const patch = `
@@ -1,4 +1,3 @@
 const config = {
-  key: 'AKIAIOSFODNN7EXAMPLE'
+  key: process.env.AWS_KEY
 };
`;

      const file = createFileDiff(patch);
      const issues = analyzer.analyzeFile(file);

      // Should not detect the AWS key since it was removed
      expect(issues).toHaveLength(0);
    });
  });

  describe('analyzeAll', () => {
    it('should analyze multiple files', () => {
      const files = [
        createFileDiff(`
@@ -1,2 +1,3 @@
+const secret = 'api_key_1234567890abcdefghij';
`),
        createFileDiff(`
@@ -1,2 +1,3 @@
+eval(userInput);
`),
      ];

      const issues = analyzer.analyzeAll(files);
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
