# Contributing to fi-fore-importer

Thank you for your interest in contributing to fi-fore-importer!

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/fi-fore-importer.git
   cd fi-fore-importer
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/prometheusgr/fi-fore-importer.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Build and test:
   ```bash
   npm run build
   npm test
   ```

## Development Workflow

### Creating a Branch

Create a branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:

- `feature/add-xyz` for new features
- `fix/issue-123` for bug fixes
- `docs/update-readme` for documentation
- `test/improve-coverage` for tests

### Writing Code

- Follow the existing code style and TypeScript conventions
- Add type annotations (no implicit `any`)
- Write unit tests for new functionality
- Update documentation for user-facing changes

### Testing

Before submitting a pull request:

```bash
npm run typecheck:all
npm test
npm run build
```

`npm run typecheck:all` validates both production TypeScript types and Jest test typing, so issues in either code path are caught before review.

Ensure:

- TypeScript compilation succeeds without errors
- All tests pass
- No regression in existing tests

## Submitting Changes

### Pull Request Process

1. Ensure your branch is up to date with `upstream/main`
2. Push your branch to your fork
3. Create a pull request against `prometheusgr/fi-fore-importer:main`
4. Fill out the PR template with:
   - Clear description of changes
   - Link to related issues (if applicable)
   - Testing performed
   - Any breaking changes
5. Address review comments promptly

### PR Guidelines

- **One concern per PR**: Keep PRs focused and reviewable
- **Clear commit messages**: Use descriptive commit messages
- **No force pushes**: After PR is opened, don't force push unless requested
- **Update CHANGELOG.md**: Document your changes in CHANGELOG.md
- **Add tests**: All features should have test coverage

## Code Review

All submissions require review. We use GitHub's review tools:

- Comment on specific lines to discuss implementation
- Request changes if issues need to be addressed
- Approve when satisfied with the changes

### Review Expectations

- Be respectful and constructive
- Explain the reasoning behind suggestions
- Recognize effort and improvement

## Reporting Issues

### Bug Reports

Include:

- TypeScript version and Node.js version
- Steps to reproduce
- Expected vs. actual behavior
- Relevant error messages or logs

### Feature Requests

Include:

- Use case or problem statement
- Proposed solution
- Alternative approaches considered

## Design Principles

When contributing, keep these principles in mind:

1. **Provider-agnostic**: The importer should not depend on specific transaction sources or payment providers
2. **Dependency-minimal**: Avoid unnecessary external dependencies
3. **Contract-driven**: Use well-defined adapter boundaries between the importer and host application
4. **Type-safe**: Leverage TypeScript for compile-time safety
5. **Testable**: Code should be easy to unit test with clear dependencies

## License

By contributing to fi-fore-importer, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Check existing issues and discussions
- Open a new issue for questions or clarification
- Review MOVE_PLAN.md and README.md for architecture context

Thank you for contributing!
