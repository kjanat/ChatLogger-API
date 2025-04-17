# GitHub Copilot Custom Instructions

## Repository Context

This repository is for the [ChatLogger](https://github.com/kjanat/ChatLogger) project, which provides an API for managing chats, messages, organizations, and analytics. It includes features like rate limiting, Swagger documentation, and health check endpoints.

## Coding Style

- Follow the existing code style and structure.
- Use comments to explain non-obvious logic.
- Ensure all new code is covered by tests.
- Use `eslint` and `prettier` for code formatting and linting.

## Security Practices

- Use `helmet` for security headers.
- Ensure CORS is configured properly.
- Validate all user inputs and sanitize data.
- Use environment variables for sensitive information (e.g., JWT secret, database URI).
- Implement rate limiting to prevent abuse of the API.
- Implement logging and monitoring for security events

## Documentation

- Update Swagger documentation for any new API endpoints.
- Ensure [README.md](../README.md) reflects any major changes.
- Document any new environment variables in the [`.env.example`](../.env.example) file.

## Testing

- Write unit and integration tests for all new features.
- Use Jest for testing.
- Create both unit and integration tests.
    - Unit tests for `{file}.js` are located in `./__tests__/{file}.test.js`.
    - Integration tests for `{api}.js` are located in `/tests/integration/{api}.integration.test.js`.
- Ensure tests pass before committing changes.
- Create at least one positive and one negative test for each new feature.
- Use `supertest` for testing API endpoints.

## Commit Messages

- Use clear and descriptive commit messages.
- Follow the format: `type(scope): description` (e.g., `feat(auth): add login endpoint`).

## Pull Requests

- Ensure all checks pass before creating a pull request.
- Provide a clear description of the changes in the pull request.
- Link related issues in the pull request description.
