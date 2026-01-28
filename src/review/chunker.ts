import { FileDiff } from '../types';
import { Config } from '../config/schema';
import { logger } from '../logging';

export interface DiffChunk {
  files: string[];
  content: string;
  estimatedTokens: number;
}

export class DiffChunker {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Split large diffs into manageable chunks for LLM processing
   */
  chunkDiffs(files: FileDiff[]): DiffChunk[] {
    const maxTokensPerChunk = Math.floor(this.config.ollama.max_tokens * 0.6); // Reserve space for response
    const chunks: DiffChunk[] = [];
    
    let currentChunk: DiffChunk = {
      files: [],
      content: '',
      estimatedTokens: 0,
    };

    for (const file of files) {
      // Skip if file should be excluded
      if (this.shouldExclude(file.path)) {
        logger.debug({ file: file.path }, 'Excluding file from review');
        continue;
      }

      const fileContent = this.formatFileDiff(file);
      const fileTokens = this.estimateTokens(fileContent);

      // If adding this file would exceed chunk size, start a new chunk
      if (currentChunk.estimatedTokens + fileTokens > maxTokensPerChunk && currentChunk.files.length > 0) {
        chunks.push(currentChunk);
        currentChunk = {
          files: [],
          content: '',
          estimatedTokens: 0,
        };
      }

      // If single file is too large, split it by hunks
      if (fileTokens > maxTokensPerChunk) {
        const fileChunks = this.chunkLargeFile(file, maxTokensPerChunk);
        chunks.push(...fileChunks);
      } else {
        currentChunk.files.push(file.path);
        currentChunk.content += fileContent + '\n\n';
        currentChunk.estimatedTokens += fileTokens;
      }
    }

    // Add remaining chunk
    if (currentChunk.files.length > 0) {
      chunks.push(currentChunk);
    }

    logger.info({ totalChunks: chunks.length, totalFiles: files.length }, 'Diff chunking complete');
    return chunks;
  }

  private chunkLargeFile(file: FileDiff, maxTokens: number): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    const hunks = file.hunks || [];

    let currentChunk: DiffChunk = {
      files: [file.path],
      content: `File: ${file.path}\n`,
      estimatedTokens: 20,
    };

    for (const hunk of hunks) {
      const hunkContent = this.formatHunk(hunk);
      const hunkTokens = this.estimateTokens(hunkContent);

      if (currentChunk.estimatedTokens + hunkTokens > maxTokens && currentChunk.content.length > 50) {
        chunks.push(currentChunk);
        currentChunk = {
          files: [file.path],
          content: `File: ${file.path}\n`,
          estimatedTokens: 20,
        };
      }

      currentChunk.content += hunkContent + '\n';
      currentChunk.estimatedTokens += hunkTokens;
    }

    if (currentChunk.content.length > 50) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private formatFileDiff(file: FileDiff): string {
    let result = `File: ${file.path} (${file.status})\n`;
    result += `+${file.additions} -${file.deletions}\n\n`;

    if (file.patch) {
      result += file.patch;
    } else if (file.hunks) {
      for (const hunk of file.hunks) {
        result += this.formatHunk(hunk);
      }
    }

    return result;
  }

  private formatHunk(hunk: any): string {
    return `@@ -${hunk.old_start},${hunk.old_lines} +${hunk.new_start},${hunk.new_lines} @@\n${hunk.content || hunk.lines.join('\n')}\n`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private shouldExclude(filePath: string): boolean {
    const { excluded_paths } = this.config.review;
    
    for (const pattern of excluded_paths) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }
}
