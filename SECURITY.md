# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: security@yourdomain.com

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Best Practices

When using pr-ai-reviewer:

1. **Never commit secrets**
   - Use environment variables for all credentials
   - Rotate compromised tokens immediately
   - Use GitHub Apps over PATs when possible

2. **Review LLM prompts**
   - Ensure no sensitive data is sent to LLM
   - Review logs for accidentally exposed secrets
   - Configure appropriate exclusions in policy

3. **Secure webhook endpoints**
   - Always validate webhook signatures
   - Use HTTPS for webhook URLs
   - Rotate webhook secrets regularly

4. **Database security**
   - Protect SQLite database file
   - Regular backups
   - Limit file permissions

5. **Network security**
   - Use firewalls to restrict access
   - Keep Ollama server access controlled
   - Use TLS/SSL for external connections

## Known Security Considerations

1. **LLM Data Privacy**: Code diffs are sent to the configured LLM. Ensure your Ollama instance is properly secured and not exposed publicly.

2. **Secrets in Logs**: While we redact known secret patterns, carefully review logs in production.

3. **Rate Limiting**: GitHub API rate limits may be hit. Use GitHub Apps for higher limits.

## Security Features

- **Secret Redaction**: Automatic redaction of tokens, passwords, and keys from logs
- **Webhook Signature Verification**: Validates all incoming webhooks
- **Minimal Context**: Only changed code hunks sent to LLM
- **Static Analysis**: Pre-LLM checks for obvious security issues

## Updates

We will disclose security vulnerabilities responsibly:

1. Private notification to reporters
2. Patch development
3. Security advisory published
4. Public disclosure after patch release
