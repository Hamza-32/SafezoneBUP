# Contributing to SafezoneBUP

We welcome contributions to the SafezoneBUP project! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive to all contributors
- Focus on campus safety and student well-being
- Maintain professional communication

## Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Development Setup

```bash
# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Database setup
npm run db:setup
npm run db:seed
```

## Code Style

- Use TypeScript for type safety
- Follow existing component structure
- Use Tailwind CSS for styling
- Format code with Prettier
- Keep components modular and reusable

## Testing

- Test your changes locally before submitting PR
- Update documentation as needed
- Ensure database migrations work correctly

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add new feature`
- `fix: Resolve issue`
- `docs: Update documentation`
- `refactor: Improve code structure`
- `test: Add tests`

## Pull Request Process

1. Ensure your PR has a clear title and description
2. Link any related issues
3. Include screenshots/videos for UI changes
4. Ensure all tests pass
5. Request review from maintainers

## Reporting Issues

When reporting bugs:
- Describe the issue clearly
- Include steps to reproduce
- Provide screenshots/logs if applicable
- Mention your environment (OS, Node version, etc.)

## Feature Requests

- Explain the use case
- Describe the expected behavior
- Consider safety implications for campus
- Be open to feedback and suggestions

Thank you for contributing to SafezoneBUP!
