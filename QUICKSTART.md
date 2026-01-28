# Quick Start Guide

This guide will help you get pr-ai-reviewer up and running in under 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Ollama installed with a model pulled
- GitHub personal access token

## Step 1: Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve

# Pull a model (in another terminal)
ollama pull llama3.1:8b-instruct
```

## Step 2: Clone and Setup

```bash
# Clone repository
git clone https://github.com/yourusername/pr-ai-reviewer.git
cd pr-ai-reviewer

# Install dependencies
npm install

# Build
npm run build
```

## Step 3: Configure

```bash
# Copy example files
cp examples/.env.example .env
cp examples/pr-ai-reviewer.config.yaml ./
cp examples/AI-review-request.txt ./

# Edit .env with your GitHub token
nano .env
```

Add your GitHub token:
```
GITHUB_TOKEN=ghp_your_token_here
```

## Step 4: Test Connection

```bash
# Check Ollama is accessible
npm start health-check
```

## Step 5: Review a PR

```bash
# Review a specific PR
npm start review-pr --repo owner/repo-name --pr 123

# Or with dry-run (no posting)
npm start review-pr --repo owner/repo-name --pr 123 --dry-run
```

## Step 6: (Optional) Setup Webhook Server

```bash
# Start webhook server
npm start serve-webhooks --port 3000
```

Then configure GitHub webhook:
1. Go to repo Settings → Webhooks → Add webhook
2. URL: `https://your-domain.com/webhook`
3. Content type: `application/json`
4. Events: Select "Pull requests"

## That's it! 🎉

Your AI code reviewer is now ready. Every time a PR is opened or updated, it will automatically review the code and post comments.

## Next Steps

- Customize `AI-review-request.txt` with your review policy
- Adjust `pr-ai-reviewer.config.yaml` settings
- Set up deployment (Docker, K8s, etc.)
- Read the full [README.md](README.md) for advanced features

## Troubleshooting

**Can't connect to Ollama?**
- Check Ollama is running: `curl http://127.0.0.1:11434/api/tags`
- Update host in config if needed

**GitHub auth fails?**
- Verify token has `repo` scope
- Test: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

**No comments posted?**
- Check logs for errors
- Try dry-run mode first
- Verify PR exists and is open

## Get Help

- [Full Documentation](README.md)
- [Troubleshooting Guide](README.md#troubleshooting)
- [GitHub Issues](https://github.com/yourusername/pr-ai-reviewer/issues)
