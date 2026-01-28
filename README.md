# pr-ai-reviewer

Production-grade AI-powered code review tool that performs automated reviews on pull requests, adds precise inline comments, and posts comprehensive review summaries—guided by user-defined review policies.

[![CI](https://github.com/yourusername/pr-ai-reviewer/workflows/CI/badge.svg)](https://github.com/yourusername/pr-ai-reviewer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **🤖 AI-Powered Analysis**: Uses local LLM (Ollama) for intelligent code review
- **📝 Inline Comments**: Posts precise comments at exact file/line locations
- **📊 Summary Reports**: Generates comprehensive review summaries with risk scores
- **🔍 Static Analysis**: Runs lightweight security and quality checks before LLM
- **🎯 Policy-Driven**: Review focus areas defined in `AI-review-request.txt`
- **🔄 Deduplication**: Avoids duplicate comments across PR updates
- **🏷️ Auto-Labeling**: Adds relevant labels based on findings
- **🔌 Multiple Providers**: GitHub (full), GitLab & Azure DevOps (extensible)
- **⚡ Multiple Modes**: CLI, webhook server, or scheduled execution
- **🐳 Production-Ready**: Docker, Kubernetes, and CI/CD examples included

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🔧 Prerequisites

### Required

1. **Node.js** >= 18.0.0
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **Ollama** with a compatible model
   ```bash
   # Install Ollama (macOS/Linux)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Or visit https://ollama.ai for other platforms
   
   # Pull a model (recommended: llama3.1:8b-instruct)
   ollama pull llama3.1:8b-instruct
   
   # Start Ollama server
   ollama serve
   ```

3. **Git Provider Access**
   - GitHub: Personal Access Token (PAT) or GitHub App credentials
   - GitLab: Personal Access Token (not yet fully implemented)
   - Azure DevOps: Personal Access Token (not yet fully implemented)

### Optional

- **Docker** >= 20.10 (for containerized deployment)
- **Kubernetes** >= 1.24 (for K8s deployment)

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/pr-ai-reviewer.git
cd pr-ai-reviewer

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp examples/.env.example .env
# Edit .env with your credentials

# 4. Copy example configs
cp examples/pr-ai-reviewer.config.yaml ./
cp examples/AI-review-request.txt ./

# 5. Build the project
npm run build

# 6. Test Ollama connection
npm start health-check

# 7. Review a PR
npm start review-pr --repo owner/repo --pr 123

# 8. Start webhook server
npm start serve-webhooks --port 3000
```

### Docker Quick Start

```bash
# 1. Set up configs and environment
cp examples/.env.example .env
cp examples/pr-ai-reviewer.config.yaml ./
cp examples/AI-review-request.txt ./

# 2. Start with Docker Compose
docker-compose up -d

# 3. Check logs
docker-compose logs -f pr-ai-reviewer

# 4. Check health
curl http://localhost:3000/health
```

## 📦 Installation

### From Source

```bash
# Clone and install
git clone https://github.com/yourusername/pr-ai-reviewer.git
cd pr-ai-reviewer
npm install
npm run build

# Optional: Install globally
npm link
pr-ai-reviewer --help
```

### From NPM (when published)

```bash
npm install -g pr-ai-reviewer
pr-ai-reviewer --help
```

### Docker Image

```bash
# Build locally
docker build -t pr-ai-reviewer:latest .

# Or pull from registry (when published)
docker pull yourusername/pr-ai-reviewer:latest
```

## ⚙️ Configuration

### 1. Main Configuration File

Create `pr-ai-reviewer.config.yaml`:

```yaml
provider: github              # 'github', 'gitlab', or 'azdo'
repos:
  - owner/repo-name          # List of repos to monitor
  - owner/another-repo

run_mode: webhook             # 'webhook', 'cli', or 'scheduled'

ollama:
  host: 10.169.36.250        # Primary Ollama host
  port: 11434                 # Ollama port
  model: llama3.1:8b-instruct # Model name
  use_openai_compat: true     # Use OpenAI-compatible API
  temperature: 0.3            # LLM temperature (0-1)
  max_tokens: 4096            # Max tokens per request
  timeout_ms: 120000          # Request timeout

review:
  max_files: 100              # Max files to review per PR
  max_hunks_per_file: 50      # Max hunks per file
  max_lines_per_hunk: 500     # Max lines per hunk
  fail_on_severity_at_or_above: high  # Optional: Fail CI on severity
  labeling_enabled: true      # Auto-label PRs
  summary_enabled: true       # Post summary comment
  dedupe_window_days: 14      # Days to keep dedupe entries
  excluded_paths:
    - "**/*.lock"
    - "**/*.min.js"
    - "**/node_modules/**"
    - "**/dist/**"

auth:
  github:
    type: pat                 # 'pat' or 'app'
    token_env: GITHUB_TOKEN   # Env var for PAT
    # For GitHub App:
    # type: app
    # app_id_env: GITHUB_APP_ID
    # installation_id_env: GITHUB_APP_INSTALLATION_ID
    # private_key_env: GITHUB_APP_PRIVATE_KEY
```

### 2. Review Policy File

Create `AI-review-request.txt` (plaintext format):

```text
[Checks]
Security: weight=5 - SQL injection, command injection, secrets exposure
Reliability: weight=4 - null checks, error handling, resource cleanup
Performance: weight=3 - n^2 loops, unnecessary allocations
Maintainability: weight=2 - complexity, code duplication
Style: weight=1 - formatting, linting

[Must-Check]
Ensure no secrets or API keys in code
Validate all external inputs
Error paths must log actionable messages
Public APIs require input validation

[Exclusions]
Ignore generated files and lockfiles
Ignore .md, .png, .svg files

[Output Preferences]
Prefer minimal diffs in suggestions
Keep comments concise
```

Or use YAML format (`AI-review-request.yaml`):

```yaml
checks:
  security:
    weight: 5
    items:
      - SQL injection
      - secrets exposure
  reliability:
    weight: 4
    items:
      - null checks
      - error handling

must_check:
  - Ensure no secrets in code
  - Validate external inputs

exclusions:
  - "*.lock"
  - "*.md"
```

### 3. Environment Variables

Create `.env`:

```bash
# GitHub Authentication
GITHUB_TOKEN=ghp_your_personal_access_token

# Or GitHub App
# GITHUB_APP_ID=123456
# GITHUB_APP_INSTALLATION_ID=12345678
# GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Webhook Secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Optional
LOG_LEVEL=info
NODE_ENV=production
```

## 🎯 Usage

### CLI Mode

#### Review a Specific PR

```bash
pr-ai-reviewer review-pr \
  --repo owner/repo-name \
  --pr 123 \
  --policy ./AI-review-request.txt \
  --config ./pr-ai-reviewer.config.yaml
```

#### Dry Run (no posting)

```bash
pr-ai-reviewer review-pr \
  --repo owner/repo-name \
  --pr 123 \
  --dry-run
```

#### Health Check

```bash
pr-ai-reviewer health-check
```

### Webhook Server Mode

#### Start Server

```bash
pr-ai-reviewer serve-webhooks \
  --port 3000 \
  --config ./pr-ai-reviewer.config.yaml \
  --policy ./AI-review-request.txt
```

#### Configure GitHub Webhook

1. Go to your repo → Settings → Webhooks → Add webhook
2. **Payload URL**: `https://your-domain.com/webhook`
3. **Content type**: `application/json`
4. **Secret**: Your `GITHUB_WEBHOOK_SECRET`
5. **Events**: Select "Pull requests"
6. Save

The server will automatically review PRs on:
- `opened`
- `reopened`
- `synchronize` (new commits)
- `ready_for_review`

### Scheduled Mode (GitHub Actions)

Create `.github/workflows/pr-review.yml`:

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Install pr-ai-reviewer
      run: |
        git clone https://github.com/yourusername/pr-ai-reviewer.git
        cd pr-ai-reviewer
        npm ci
        npm run build
    
    - name: Review PR
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        cd pr-ai-reviewer
        npm start review-pr \
          --repo ${{ github.repository }} \
          --pr ${{ github.event.pull_request.number }}
```

## 🚢 Deployment

### Docker Deployment

#### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f pr-ai-reviewer

# Stop services
docker-compose down
```

#### Standalone Docker

```bash
# Build
docker build -t pr-ai-reviewer:latest .

# Run
docker run -d \
  --name pr-ai-reviewer \
  -p 3000:3000 \
  -e GITHUB_TOKEN=your_token \
  -e GITHUB_WEBHOOK_SECRET=your_secret \
  -v $(pwd)/pr-ai-reviewer.config.yaml:/app/config/pr-ai-reviewer.config.yaml:ro \
  -v $(pwd)/AI-review-request.txt:/app/AI-review-request.txt:ro \
  -v $(pwd)/data:/app/data \
  pr-ai-reviewer:latest
```

### Kubernetes Deployment

#### 1. Create Secret

```bash
# Edit k8s/secrets.yaml with your credentials
kubectl apply -f k8s/secrets.yaml
```

#### 2. Deploy Application

```bash
kubectl apply -f k8s/deployment.yaml
```

#### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -l app=pr-ai-reviewer

# Check logs
kubectl logs -f deployment/pr-ai-reviewer

# Port forward for testing
kubectl port-forward svc/pr-ai-reviewer 3000:3000

# Test health
curl http://localhost:3000/health
```

#### 4. Expose via Ingress (Optional)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pr-ai-reviewer
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - pr-review.yourdomain.com
    secretName: pr-review-tls
  rules:
  - host: pr-review.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: pr-ai-reviewer
            port:
              number: 3000
```

### Cloud Providers

#### AWS ECS/Fargate

1. Build and push to ECR:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
   docker build -t pr-ai-reviewer .
   docker tag pr-ai-reviewer:latest <account>.dkr.ecr.us-east-1.amazonaws.com/pr-ai-reviewer:latest
   docker push <account>.dkr.ecr.us-east-1.amazonaws.com/pr-ai-reviewer:latest
   ```

2. Create ECS task definition with container pointing to ECR image
3. Create ECS service with load balancer
4. Store secrets in AWS Secrets Manager

#### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/pr-ai-reviewer
gcloud run deploy pr-ai-reviewer \
  --image gcr.io/PROJECT-ID/pr-ai-reviewer \
  --platform managed \
  --port 3000 \
  --set-env-vars GITHUB_TOKEN=secretRef:github-token
```

## 🛠️ Development

### Setup

```bash
git clone https://github.com/yourusername/pr-ai-reviewer.git
cd pr-ai-reviewer
npm install
```

### Commands

```bash
npm run build          # Build TypeScript
npm run dev            # Run with ts-node (development)
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run lint           # Lint code
npm run lint:fix       # Fix linting issues
npm run format         # Format with Prettier
```

### Project Structure

```
pr-ai-reviewer/
├── src/
│   ├── cli/              # CLI commands and webhook server
│   ├── config/           # Configuration loader and schema
│   ├── llm/              # Ollama client and prompts
│   ├── logging/          # Structured logging
│   ├── providers/        # Git provider abstractions
│   ├── publish/          # Comment publishing
│   ├── review/           # Review engine, static analysis
│   ├── storage/          # Dedupe database
│   └── types/            # TypeScript types
├── examples/             # Example configurations
├── k8s/                  # Kubernetes manifests
├── __tests__/            # Unit tests
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Adding a New Provider

1. Create provider class in `src/providers/`:
   ```typescript
   export class MyProvider implements GitProvider {
     async authenticate(): Promise<void> { }
     async getPRMetadata(repo: string, prNumber: number): Promise<PRMetadata> { }
     // ... implement other methods
   }
   ```

2. Register in `src/providers/index.ts`:
   ```typescript
   case 'myprovider':
     return new MyProvider(config);
   ```

3. Add tests and documentation

## 🔍 Troubleshooting

### Ollama Connection Issues

**Problem**: Cannot connect to Ollama

```bash
# Check Ollama is running
curl http://10.169.36.250:11434/api/tags

# Try localhost fallback
curl http://127.0.0.1:11434/api/tags

# Check firewall rules
sudo ufw status
```

**Solution**: Update `ollama.host` in config or ensure Ollama is accessible

### GitHub Authentication Failures

**Problem**: `401 Unauthorized` or `403 Forbidden`

```bash
# Test token
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Check token scopes (needs repo, write:discussion)
```

**Solution**: Generate new token with correct scopes at https://github.com/settings/tokens

### Webhook Not Triggering

**Problem**: Webhook configured but no reviews posted

1. Check webhook deliveries in GitHub Settings → Webhooks
2. Verify webhook secret matches `GITHUB_WEBHOOK_SECRET`
3. Check server logs: `docker-compose logs -f pr-ai-reviewer`
4. Ensure payload URL is accessible from GitHub

### LLM Timeouts

**Problem**: Reviews fail with timeout errors

**Solutions**:
- Increase `ollama.timeout_ms` in config
- Reduce `review.max_files` or `max_lines_per_hunk`
- Use a faster model (e.g., `llama3.1:8b` instead of `70b`)
- Check Ollama server resources (CPU/RAM/GPU)

### Rate Limiting

**Problem**: GitHub API rate limit exceeded

**Solutions**:
- Use GitHub App instead of PAT (higher rate limits)
- Implement retry with exponential backoff (already included)
- Reduce review frequency

### Database Locked

**Problem**: SQLite database locked

```bash
# Check for stale processes
ps aux | grep pr-ai-reviewer

# Remove lock file (careful!)
rm pr-ai-reviewer.db-lock
```

## 📊 Performance Optimization

### LLM Performance

- Use quantized models (Q4, Q5) for faster inference
- Adjust `temperature` lower (0.1-0.3) for deterministic output
- Reduce `max_tokens` if not needed
- Use batch processing for multiple PRs

### Chunking Strategy

- Adjust `max_lines_per_hunk` based on model context window
- Larger chunks = fewer LLM calls but longer processing
- Smaller chunks = more precise but more API calls

### Caching

Current implementation doesn't cache LLM responses. To add caching:

1. Hash the diff content
2. Store LLM response with hash key
3. Return cached response if diff unchanged

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure CI passes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for local LLM runtime
- [Octokit](https://github.com/octokit) for GitHub API client
- [@octokit/webhooks](https://github.com/octokit/webhooks.js) for webhook handling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/pr-ai-reviewer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pr-ai-reviewer/discussions)
- **Email**: support@yourdomain.com

---

**Built with ❤️ for better code reviews**
