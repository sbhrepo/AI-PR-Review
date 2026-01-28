# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-28

### Added
- Initial release
- GitHub provider with full PR review support
- Ollama LLM integration with OpenAI-compatible API
- Static code analysis for security and quality issues
- Inline comment posting with precise line anchors
- Review summary generation with risk scores
- Deduplication system to avoid repeated comments
- Auto-labeling based on findings
- CLI commands: review-pr, serve-webhooks, health-check
- Webhook server for automated PR reviews
- Docker and Kubernetes deployment support
- Comprehensive documentation and examples
- Unit tests and CI/CD pipeline
- Policy-driven reviews via AI-review-request.txt
- Support for plaintext and YAML policy formats

### Security
- Secret redaction in logs
- No secrets sent to LLM
- Only changed code hunks included in prompts

## [Unreleased]

### Planned
- GitLab provider implementation
- Azure DevOps provider implementation
- Response caching for duplicate diffs
- Configurable static analysis rules
- Web UI for review management
- Multi-model support (OpenAI, Anthropic, etc.)
- PR comment threading support
- Review approval workflow
