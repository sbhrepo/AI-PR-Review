# pr-ai-reviewer Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         pr-ai-reviewer                              │
│                                                                     │
│  ┌────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │    CLI     │────▶│ Review Engine│────▶│ Comment Publisher│    │
│  │  Commands  │     │              │     │                  │    │
│  └────────────┘     └──────────────┘     └──────────────────┘    │
│                            │                      │               │
│  ┌────────────┐            ▼                      ▼               │
│  │  Webhook   │     ┌──────────────┐     ┌──────────────────┐    │
│  │   Server   │────▶│ Static       │     │  Git Provider    │    │
│  └────────────┘     │ Analyzer     │     │  (GitHub/etc)    │    │
│                     └──────────────┘     └──────────────────┘    │
│                            │                      │               │
│                            ▼                      ▼               │
│                     ┌──────────────┐     ┌──────────────────┐    │
│                     │ LLM Client   │     │ Dedupe Store     │    │
│                     │ (Ollama)     │     │ (SQLite)         │    │
│                     └──────────────┘     └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────────┐
│   GitHub     │    │    Ollama    │      │   File System    │
│     API      │    │  10.169.36.  │      │   (Config/DB)    │
│              │    │  250:11434   │      │                  │
└──────────────┘    └──────────────┘      └──────────────────┘
```

## Component Architecture

### 1. Entry Points

#### CLI (`src/cli/index.ts`)
- **Commands**:
  - `review-pr`: Review a specific PR
  - `serve-webhooks`: Start webhook server
  - `health-check`: Test Ollama connection
- **Responsibilities**: Argument parsing, command routing

#### Webhook Server (`src/cli/webhook-server.ts`)
- **HTTP Server**: Express.js on port 3000
- **Endpoints**:
  - `POST /webhook`: Receive GitHub webhooks
  - `GET /health`: Health check
- **Events**: opened, reopened, synchronize, ready_for_review

### 2. Configuration Layer

#### Config Loader (`src/config/loader.ts`)
- Loads YAML configuration
- Validates with Zod schema
- Environment variable resolution

#### Policy Parser (`src/config/policy-parser.ts`)
- Parses `AI-review-request.txt` (plaintext or YAML)
- Extracts review priorities, must-checks, exclusions

#### Schema (`src/config/schema.ts`)
- Zod-based type-safe configuration
- Provider, Ollama, review, and auth settings

### 3. Provider Layer (`src/providers/`)

```
┌──────────────────────────────────────────────────┐
│              GitProvider Interface                │
├──────────────────────────────────────────────────┤
│  authenticate()                                   │
│  getPRMetadata(repo, pr)                         │
│  getPRDiffs(repo, pr)                            │
│  getExistingComments(repo, pr)                   │
│  postInlineComment(repo, pr, comment)            │
│  postReviewSummary(repo, pr, summary, body)      │
│  addLabels(repo, pr, labels)                     │
└──────────────────────────────────────────────────┘
         │                  │                │
         ▼                  ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   GitHub     │  │   GitLab     │  │   Azure      │
│ (Complete)   │  │   (Stub)     │  │DevOps (Stub) │
└──────────────┘  └──────────────┘  └──────────────┘
```

**GitHub Provider**:
- Octokit integration
- PAT and GitHub App auth
- Rate limiting handling
- Diff parsing with parse-diff

### 4. LLM Integration (`src/llm/`)

#### Ollama Client (`src/llm/client.ts`)
```
┌─────────────────────────────────────────┐
│         OllamaClient                    │
├─────────────────────────────────────────┤
│  Primary: 10.169.36.250:11434          │
│  Fallback: 127.0.0.1:11434             │
│                                         │
│  APIs:                                  │
│  • OpenAI-compatible: /v1/chat/        │
│  • Ollama native: /api/chat            │
│                                         │
│  Features:                              │
│  • Retry with exponential backoff      │
│  • Automatic failover                   │
│  • Timeout handling                     │
│  • JSON response parsing                │
└─────────────────────────────────────────┘
```

**Prompt Structure**:
- **System Prompt**: Review priorities, output format
- **User Prompt**: PR metadata + diff chunks + policy

### 5. Review Engine (`src/review/`)

#### Workflow
```
┌──────────────┐
│  PR Diffs    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│  1. Static Analyzer          │
│     • Security patterns      │
│     • Quality checks         │
│     • Regex-based rules      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  2. Diff Chunker             │
│     • Split by token limit   │
│     • Per-file chunking      │
│     • Context preservation   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  3. LLM Analysis             │
│     • Process each chunk     │
│     • Parse JSON responses   │
│     • Extract issues         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  4. Deduplicator             │
│     • Hash-based merging     │
│     • Confidence ranking     │
│     • Severity sorting       │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  5. Filter by Policy         │
│     • Apply exclusions       │
│     • Confidence threshold   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────┐
│  Issues      │
└──────────────┘
```

#### Static Analyzer
- **Rules**: AWS keys, SQL injection, eval, command injection
- **Output**: ReviewIssue[] with moderate confidence
- **Performance**: Runs before LLM (fast, no API calls)

#### Diff Chunker
- **Strategy**: Split diffs to fit model context window
- **Token Estimation**: ~4 chars per token
- **Fallback**: Per-hunk chunking for large files

#### Deduplicator
- **Hash**: `file:line:title:category`
- **Merge**: Picks highest confidence/severity
- **Cross-source**: Combines static + LLM issues

### 6. Publishing (`src/publish/`)

#### Comment Publisher
```
Issues → Format → Post → Track
         │         │      │
         ▼         ▼      ▼
  ┌──────────┐ ┌────────┐ ┌──────────┐
  │ Inline   │ │GitHub │ │ Dedupe   │
  │ Comments │ │  API  │ │  Store   │
  └──────────┘ └────────┘ └──────────┘
       │
       ▼
  ┌──────────────────────────┐
  │ Review Summary           │
  │ • Risk score             │
  │ • Severity breakdown     │
  │ • Category grouping      │
  │ • Recommendations        │
  └──────────────────────────┘
       │
       ▼
  ┌──────────────────────────┐
  │ Labels                   │
  │ • ai-review              │
  │ • security, performance  │
  │ • needs-attention        │
  └──────────────────────────┘
```

**Comment Format**:
- Emoji severity indicators
- "Why it matters" section
- Suggested fix with code snippet
- Confidence score
- Collapsible rationale

### 7. Storage (`src/storage/`)

#### Dedupe Store (SQLite)
```sql
CREATE TABLE dedupe_entries (
  hash TEXT PRIMARY KEY,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  title TEXT NOT NULL,
  comment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT 0,
  repo TEXT,
  pr_number INTEGER
);
```

**Operations**:
- `hasEntry(hash)`: Check if issue already reported
- `addEntry(...)`: Store new issue
- `resolveEntry(hash)`: Mark as resolved
- `cleanOldEntries(days)`: Cleanup based on retention

### 8. Logging (`src/logging/`)

**Pino Logger**:
- Structured JSON logs
- Automatic secret redaction
- Pretty printing in dev
- Child loggers with context

**Redacted Paths**:
- password, token, secret, api_key, private_key
- authorization headers

## Data Flow

### PR Review Flow
```
1. Trigger (CLI or Webhook)
   │
   ▼
2. Authenticate with Git Provider
   │
   ▼
3. Fetch PR Metadata + Diffs
   │
   ▼
4. Parse Review Policy
   │
   ▼
5. Run Static Analysis
   │
   ▼
6. Chunk Diffs
   │
   ▼
7. For each chunk:
   │  a. Build LLM prompt
   │  b. Call Ollama
   │  c. Parse JSON response
   │  d. Extract issues
   │
   ▼
8. Merge & Deduplicate Issues
   │
   ▼
9. Filter by Policy
   │
   ▼
10. Check Dedupe Store
   │
   ▼
11. Post Inline Comments
   │
   ▼
12. Store in Dedupe DB
   │
   ▼
13. Post Summary Comment
   │
   ▼
14. Add Labels
   │
   ▼
15. Done ✅
```

## Deployment Architectures

### 1. Local CLI
```
Developer Machine
├── pr-ai-reviewer (CLI)
├── Ollama (localhost:11434)
└── GitHub API (internet)
```

### 2. Webhook Server
```
Server/VM
├── pr-ai-reviewer (Express)
├── Ollama (local or remote)
├── SQLite DB
└── GitHub Webhooks ───▶ HTTPS endpoint
```

### 3. Docker Compose
```
Docker Host
├── pr-ai-reviewer container
├── ollama container (optional)
├── shared network
└── volume mounts (config, DB)
```

### 4. Kubernetes
```
Kubernetes Cluster
├── Deployment (2 replicas)
├── Service (ClusterIP)
├── Ingress (TLS)
├── ConfigMap (config + policy)
├── Secret (credentials)
└── PVC (SQLite DB)
```

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│  1. Input Validation                    │
│     • Zod schema validation             │
│     • Webhook signature verification    │
│                                         │
│  2. Secret Management                   │
│     • Environment variables only        │
│     • No secrets in code/logs           │
│     • Pino redaction                    │
│                                         │
│  3. Data Minimization                   │
│     • Only changed hunks to LLM         │
│     • No full file contents             │
│     • Exclude binary/generated files    │
│                                         │
│  4. Access Control                      │
│     • GitHub token scopes               │
│     • Ollama network isolation          │
│     • Database file permissions         │
└─────────────────────────────────────────┘
```

## Error Handling Strategy

```
┌────────────────────────────────────────┐
│  Component   │  Strategy               │
├────────────────────────────────────────┤
│  Ollama API  │  Retry + Fallback       │
│  GitHub API  │  Retry + Rate limiting  │
│  Database    │  Transaction rollback   │
│  Webhooks    │  202 Accepted early     │
│  Parsing     │  Graceful degradation   │
└────────────────────────────────────────┘
```

Each component logs errors and continues processing where possible, ensuring partial results are still useful.

## Extensibility Points

1. **New Provider**: Implement `GitProvider` interface
2. **New Static Rules**: Add to `STATIC_RULES` array
3. **Custom LLM**: Swap `OllamaClient` implementation
4. **Storage Backend**: Replace `DedupeStore` with Redis/PostgreSQL
5. **Output Format**: Customize `CommentPublisher.formatInlineComment()`

## Performance Characteristics

- **Static Analysis**: O(n) where n = lines of code
- **LLM Calls**: O(chunks) × LLM latency
- **Database**: Indexed lookups, O(log n)
- **Chunking**: O(n) where n = diff size
- **Typical PR**: 2-5 minutes end-to-end

## Monitoring Points

- LLM response times
- GitHub API rate limits
- Webhook processing queue depth
- Database size growth
- Error rates by component
- Cache hit rates (future)

---

This architecture provides a **scalable**, **maintainable**, and **extensible** foundation for AI-powered code reviews.
