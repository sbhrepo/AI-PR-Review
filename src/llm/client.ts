import axios, { AxiosInstance } from 'axios';
import { Config } from '../config/schema';
import { logger } from '../logging';
import { ReviewIssue, ReviewPolicy, PRMetadata } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at?: string;
  message?: {
    role: string;
    content: string;
  };
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  done?: boolean;
}

export class OllamaClient {
  private client: AxiosInstance;
  private config: Config;
  private useOpenAICompat: boolean;

  constructor(config: Config) {
    this.config = config;
    this.useOpenAICompat = config.ollama.use_openai_compat;

    const baseURL = this.getBaseURL();
    
    this.client = axios.create({
      baseURL,
      timeout: config.ollama.timeout_ms,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info({ baseURL, useOpenAICompat: this.useOpenAICompat }, 'Ollama client initialized');
  }

  private getBaseURL(): string {
    const { host, port } = this.config.ollama;
    
    // Try primary host first
    const primaryURL = `http://${host}:${port}`;
    
    // If primary is localhost, return it directly
    if (host === '127.0.0.1' || host === 'localhost') {
      return primaryURL;
    }

    // Otherwise, we'll use the configured host and handle fallback in error handling
    return primaryURL;
  }

  private async retryWithFallback<T>(
    operation: () => Promise<T>,
    retries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // If primary host fails and this is the first attempt, try fallback
        if (attempt === 0 && this.config.ollama.host !== '127.0.0.1') {
          logger.warn(`Primary Ollama host failed, trying fallback to localhost`);
          this.client.defaults.baseURL = 'http://127.0.0.1:11434';
          continue;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn({ attempt, delay, error: error.message }, 'Retrying LLM request');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('LLM request failed after retries');
  }

  async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    return this.retryWithFallback(async () => {
      if (this.useOpenAICompat) {
        return this.chatOpenAICompat(messages, signal);
      } else {
        return this.chatOllamaNative(messages, signal);
      }
    });
  }

  private async chatOpenAICompat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const response = await this.client.post<OllamaResponse>(
      '/v1/chat/completions',
      {
        model: this.config.ollama.model,
        messages,
        temperature: this.config.ollama.temperature,
        max_tokens: this.config.ollama.max_tokens,
        stream: false,
      },
      { signal }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    return content;
  }

  private async chatOllamaNative(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const response = await this.client.post<OllamaResponse>(
      '/api/chat',
      {
        model: this.config.ollama.model,
        messages,
        stream: false,
        options: {
          temperature: this.config.ollama.temperature,
          num_predict: this.config.ollama.max_tokens,
        },
      },
      { signal }
    );

    const content = response.data.message?.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    return content;
  }

  async generateReview(
    policy: ReviewPolicy,
    prMetadata: PRMetadata,
    diffChunk: string
  ): Promise<ReviewIssue[]> {
    const systemPrompt = this.buildSystemPrompt(policy);
    const userPrompt = this.buildUserPrompt(prMetadata, diffChunk, policy);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    logger.debug({ messages }, 'Sending review request to LLM');

    const response = await this.chat(messages);
    
    return this.parseIssuesFromResponse(response);
  }

  private buildSystemPrompt(policy: ReviewPolicy): string {
    const priorities = Object.entries(policy.checks)
      .sort((a, b) => b[1].weight - a[1].weight)
      .map(([cat, cfg]) => `${cat} (weight ${cfg.weight})`)
      .join(' > ');

    return `You are a code review assistant. Be accurate, concise, and actionable.

Priority order: ${priorities}

Return a JSON array of issue objects. Each issue must have:
- file: string (file path)
- start_line: number
- end_line: number
- category: "security" | "reliability" | "performance" | "maintainability" | "style"
- severity: "critical" | "high" | "medium" | "low"
- title: string (concise, 1 line)
- explanation: string (2-4 lines, why it matters)
- suggested_fix: string (code snippet or minimal diff)
- references: string[] (optional, relevant docs/links)
- confidence: number (0.0-1.0)
- rationale: string (why you flagged this)

Keep responses deterministic and stable between runs. Focus on real issues, not minor style preferences unless specified.`;
  }

  private buildUserPrompt(
    prMetadata: PRMetadata,
    diffChunk: string,
    policy: ReviewPolicy
  ): string {
    const mustChecks = policy.must_check.length > 0
      ? `\n\nMUST-CHECK items:\n${policy.must_check.map(item => `- ${item}`).join('\n')}`
      : '';

    const checks = Object.entries(policy.checks)
      .map(([cat, cfg]) => `${cat}: ${cfg.items.join(', ')}`)
      .join('\n');

    return `Review this pull request code change:

**PR Title:** ${prMetadata.title}
**Description:** ${prMetadata.description || 'No description'}
**Author:** ${prMetadata.author}

**Review Policy:**
${checks}
${mustChecks}

**Code Changes:**
\`\`\`diff
${diffChunk}
\`\`\`

Analyze the changes and return a JSON array of issues. Only flag genuine problems with high confidence. Return an empty array [] if no issues found.`;
  }

  private parseIssuesFromResponse(response: string): ReviewIssue[] {
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                       response.match(/(\[[\s\S]*\])/);
      
      if (!jsonMatch) {
        logger.warn({ response }, 'No JSON array found in LLM response');
        return [];
      }

      const issues = JSON.parse(jsonMatch[1]) as ReviewIssue[];
      
      // Validate basic structure
      return issues.filter(issue => {
        return issue.file && 
               issue.start_line && 
               issue.category && 
               issue.severity && 
               issue.title;
      });
    } catch (error) {
      logger.error({ error, response }, 'Failed to parse issues from LLM response');
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const endpoint = this.useOpenAICompat ? '/v1/models' : '/api/tags';
      await this.client.get(endpoint, { timeout: 5000 });
      return true;
    } catch (error) {
      logger.error({ error }, 'Ollama health check failed');
      return false;
    }
  }
}
