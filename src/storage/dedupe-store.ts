import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { DedupeEntry } from '../types';
import { logger } from '../logging';
import path from 'path';

export class DedupeStore {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = './pr-ai-reviewer.db') {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error({ error: err.message }, 'Failed to open database');
          reject(err);
          return;
        }

        this.createTables()
          .then(() => {
            logger.info({ dbPath: this.dbPath }, 'Dedupe store initialized');
            resolve();
          })
          .catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));

    await run(`
      CREATE TABLE IF NOT EXISTS dedupe_entries (
        hash TEXT PRIMARY KEY,
        file TEXT NOT NULL,
        line INTEGER NOT NULL,
        title TEXT NOT NULL,
        comment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved BOOLEAN DEFAULT 0,
        repo TEXT,
        pr_number INTEGER
      )
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_repo_pr ON dedupe_entries(repo, pr_number)
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_created_at ON dedupe_entries(created_at)
    `);
  }

  async hasEntry(hash: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT 1 FROM dedupe_entries WHERE hash = ? AND resolved = 0',
        [hash],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  async getEntry(hash: string): Promise<DedupeEntry | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT * FROM dedupe_entries WHERE hash = ?',
        [hash],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              hash: row.hash,
              file: row.file,
              line: row.line,
              title: row.title,
              comment_id: row.comment_id,
              created_at: new Date(row.created_at),
              resolved: row.resolved === 1,
            });
          }
        }
      );
    });
  }

  async addEntry(
    hash: string,
    file: string,
    line: number,
    title: string,
    commentId?: string,
    repo?: string,
    prNumber?: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO dedupe_entries 
         (hash, file, line, title, comment_id, repo, pr_number, created_at, resolved) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)`,
        [hash, file, line, title, commentId, repo, prNumber],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async resolveEntry(hash: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        'UPDATE dedupe_entries SET resolved = 1 WHERE hash = ?',
        [hash],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async cleanOldEntries(daysOld: number): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        `DELETE FROM dedupe_entries 
         WHERE created_at < datetime('now', '-' || ? || ' days')`,
        [daysOld],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async getEntriesForPR(repo: string, prNumber: number): Promise<DedupeEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM dedupe_entries WHERE repo = ? AND pr_number = ? AND resolved = 0',
        [repo, prNumber],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const entries = rows.map((row) => ({
              hash: row.hash,
              file: row.file,
              line: row.line,
              title: row.title,
              comment_id: row.comment_id,
              created_at: new Date(row.created_at),
              resolved: row.resolved === 1,
            }));
            resolve(entries);
          }
        }
      );
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) reject(err);
        else {
          logger.info('Dedupe store closed');
          resolve();
        }
      });
    });
  }
}
