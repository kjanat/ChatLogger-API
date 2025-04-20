# ChatLogger: Chatbot User Interaction Storage API

[![GitHub Tag](https://img.shields.io/github/v/tag/kjanat/ChatLogger?sort=semver&style=for-the-badge)](https://github.com/kjanat/ChatLogger/tags) <!-- [![Node Current](https://img.shields.io/node/v/%40kjanat%2Fchatlogger?registry_uri=https%3A%2F%2Fnpm.pkg.github.com&style=for-the-badge)](https://www.npmjs.com/package/@kjanat/chatlogger) --> [![GitHub License](https://img.shields.io/github/license/kjanat/ChatLogger?style=for-the-badge)](https://opensource.org/licenses/MIT) [![Codecov](https://img.shields.io/codecov/c/github/kjanat/ChatLogger?style=for-the-badge)](https://codecov.io/gh/kjanat/ChatLogger) [![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/kjanat/ChatLogger/test.yml?style=for-the-badge&label=tests)](https://github.com/kjanat/ChatLogger/actions/workflows/test.yml) [![Last Commit](https://img.shields.io/github/last-commit/kjanat/ChatLogger?style=for-the-badge)](https://github.com/kjanat/ChatLogger/commits) [![Issues](https://img.shields.io/github/issues/kjanat/ChatLogger?style=for-the-badge)](https://github.com/kjanat/ChatLogger/issues)

A MongoDB and Express-based API for storing, retrieving, and analyzing chat interactions between users and AI assistants.

## Features

- User authentication with JWT and API key support
- Chat session management with metadata
- Message storage with role-based categorization (user, assistant, system, etc.)
- Support for function calls and tool calls tracking
- Performance metrics collection (tokens, latency)
- API rate limiting and security features
- Comprehensive request logging
- Interactive Swagger API documentation
- Docker support for easy deployment
- Analytics and reporting for chat activity
- Data export in JSON and CSV formats
- Organization-level access control

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local instance or Atlas)
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

#### Standard Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/kjanat/ChatLogger.git
    cd ChatLogger
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create or copy the [.env.example](.env.example) to a `.env` file in the root directory with the following variables:

    ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/chatlogger
    JWT_SECRET=your_jwt_secret_key_change_in_production
    NODE_ENV=development
    RATE_LIMIT_WINDOW_MS=900000
    RATE_LIMIT_MAX=100
    ```

### Running the Application

#### Local Development

For development with auto-restart using nodemon:

```bash
npm run dev
```

For production environment:

```bash
npm start
```

#### Docker Deployment

You can easily run the application using Docker Compose:

```bash
docker-compose up -d
```

This will start:

- MongoDB instance on port 27017
- Mongo Express (MongoDB admin interface) on port 8081
- ChatLogger application on port 3000

To stop the containers:

```bash
docker-compose down
```

If you need to rebuild the application container:

```bash
docker-compose build app
docker-compose up -d
```

### Testing

Run unit tests:

```bash
npm run test:unit
```

Run integration tests:

```bash
npm run test:integration
```

Run all tests with coverage report:

```bash
npm test
```

## API Documentation

When the server is running, you can access the interactive Swagger documentation at:

```plaintext
http://localhost:3000/api/v1/docs
```

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login a user
- `GET /api/users/profile` - Get current user profile
- `POST /api/users/generate-api-key` - Generate API key for current user

### Chat Sessions

- `POST /api/chats` - Create a new chat session
- `GET /api/chats` - Get all chats for current user
- `GET /api/chats/search` - Search for chats by title or tags
- `GET /api/chats/:chatId` - Get a specific chat by ID
- `PUT /api/chats/:chatId` - Update a chat's details
- `DELETE /api/chats/:chatId` - Delete a chat and its messages

### Messages

- `POST /api/:chatId/messages` - Add a new message to a chat
- `POST /api/:chatId/messages/batch` - Add multiple messages to a chat
- `GET /api/:chatId/messages` - Get all messages for a specific chat
- `GET /api/:chatId/messages/:messageId` - Get a specific message
- `PUT /api/:chatId/messages/:messageId` - Update a message
- `DELETE /api/:chatId/messages/:messageId` - Delete a message

### Organizations

- `POST /api/organizations` - Create a new organization
- `GET /api/organizations` - Get all organizations (superadmin only)
- `GET /api/organizations/current` - Get the current user's organization
- `GET /api/organizations/:id` - Get a specific organization by ID
- `PUT /api/organizations/:id` - Update an organization's details
- `POST /api/organizations/:id/regenerate-api-key` - Regenerate an API key for an organization

### Analytics

- `GET /api/analytics/activity` - Retrieve chat activity metrics by date
- `GET /api/analytics/messages/stats` - Get message statistics grouped by role
- `GET /api/analytics/users/top` - List top users by chat activity

### Export

- `GET /api/export/chats` - Export chats and messages for a given date range
- `GET /api/export/users/activity` - Export user activity data

## Message Structure

The API supports storing various message types with the following structure:

```json
{
    "role": "user|assistant|system|function|tool",
    "content": "The message content",
    "name": "optional_name",
    "functionCall": {
        // Function call details
    },
    "toolCalls": [
        // Tool call details
    ],
    "metadata": {
        // Any additional metadata
    },
    "tokens": 100,
    "promptTokens": 50,
    "completionTokens": 50,
    "latency": 1200
}
```

## Version Management

ChatLogger uses a centralized version management system with the `semver` package to ensure proper semantic versioning. The version is maintained in a single place (`src/config/version.js`) and referenced throughout the application.

### Versioning Scripts

You can easily bump the version across the entire application using npm scripts:

```bash
# Standard version bumping
npm run version:patch      # 0.1.1 -> 0.1.2
npm run version:minor      # 0.1.1 -> 0.2.0
npm run version:major      # 0.1.1 -> 1.0.0

# Pre-release versioning
npm run version:prepatch   # 0.1.1 -> 0.1.2-0
npm run version:preminor   # 0.1.1 -> 0.2.0-0
npm run version:premajor   # 0.1.1 -> 1.0.0-0
npm run version:prerelease # 0.1.1 -> 0.1.2-0 (if no pre-release)
                           # 0.1.2-0 -> 0.1.2-1 (if already pre-release)

# Common pre-release identifiers
npm run version:alpha      # 0.1.1 -> 0.1.2-alpha.0
npm run version:beta       # 0.1.1 -> 0.1.2-beta.0
npm run version:rc         # 0.1.1 -> 0.1.2-rc.0
```

These commands will:

- Update the version in `src/config/version.js`
- Update the version in `package.json`
- Commit the changes to git with a version bump message
- Create a git tag with the new version (e.g., "v0.1.2" or "v0.1.2-beta.0")

### Docker Build with Version

When building a Docker image, the version will be automatically included in the image metadata:

```bash
# Build with current version
npm run docker:build
```

This will:

- Build a Docker image with the current version from version.js
- Tag the image as both `chatlogger:<version>` and `chatlogger:latest`

You can also start the entire application stack using Docker Compose with the current version:

```bash
# Start with Docker Compose using current version
npm run docker:compose
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ChatLogger is licensed under the MIT License. This means you are free to use, modify, and distribute the software, provided that the original copyright notice and permission notice are included in all copies or substantial portions of the software.

For more details, see the [LICENSE](LICENSE) file included in this repository.
