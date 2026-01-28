import { z } from 'zod';

export const ConfigSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'azdo']),
  repos: z.array(z.string()),
  run_mode: z.enum(['webhook', 'cli', 'scheduled']),
  
  ollama: z.object({
    host: z.string().default('10.169.36.250'),
    port: z.number().default(11434),
    model: z.string().default('llama3.1:8b-instruct'),
    use_openai_compat: z.boolean().default(true),
    temperature: z.number().default(0.3),
    max_tokens: z.number().default(4096),
    timeout_ms: z.number().default(120000),
  }),
  
  review: z.object({
    max_files: z.number().default(100),
    max_hunks_per_file: z.number().default(50),
    max_lines_per_hunk: z.number().default(500),
    fail_on_severity_at_or_above: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    labeling_enabled: z.boolean().default(true),
    summary_enabled: z.boolean().default(true),
    dedupe_window_days: z.number().default(14),
    excluded_paths: z.array(z.string()).default([
      '**/*.lock',
      '**/*.min.js',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
    ]),
  }),
  
  auth: z.object({
    github: z.object({
      type: z.enum(['app', 'pat']),
      app_id_env: z.string().optional(),
      installation_id_env: z.string().optional(),
      private_key_env: z.string().optional(),
      token_env: z.string().optional(),
    }).optional(),
    gitlab: z.object({
      token_env: z.string(),
    }).optional(),
    azdo: z.object({
      token_env: z.string(),
    }).optional(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
