# Contributing to pr-ai-reviewer

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/pr-ai-reviewer/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node version, OS, etc.)
   - Logs or screenshots if applicable

### Suggesting Features

1. Check existing [Issues](https://github.com/yourusername/pr-ai-reviewer/issues) and [Discussions](https://github.com/yourusername/pr-ai-reviewer/discussions)
2. Create a new discussion or issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/pr-ai-reviewer.git
   cd pr-ai-reviewer
   git remote add upstream https://github.com/yourusername/pr-ai-reviewer.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass: `npm test`
   - Lint your code: `npm run lint`

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `test:` adding or updating tests
   - `refactor:` code refactoring
   - `chore:` maintenance tasks

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub

### Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Lint
npm run lint
```

### Testing

- Write unit tests for all new functionality
- Aim for >70% code coverage
- Run the full test suite before submitting PR
- Add integration tests for complex features

### Code Style

- Use TypeScript with strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Prefer async/await over callbacks
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions/classes
- Update examples if configuration changes
- Add comments for complex logic

### Commit Guidelines

- Use clear, descriptive commit messages
- Reference issues in commits: `fixes #123`
- Keep commits atomic (one logical change per commit)
- Squash commits before merging if needed

## Project Structure

```
src/
├── cli/          # CLI commands and webhook server
├── config/       # Configuration and policy parsing
├── llm/          # LLM client and prompts
├── logging/      # Logging infrastructure
├── providers/    # Git provider implementations
├── publish/      # Comment publishing
├── review/       # Review engine and analysis
├── storage/      # Database and persistence
└── types/        # TypeScript type definitions
```

## Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release!

## Questions?

- Open a [Discussion](https://github.com/yourusername/pr-ai-reviewer/discussions)
- Join our community chat (if available)
- Email: maintainers@yourdomain.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
