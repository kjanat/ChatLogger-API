# ChatLogger: Chatbot User Interaction Storage API

A MongoDB and Express-based API for storing, retrieving, and analyzing chat interactions between users and AI assistants.

## Features

- User authentication with JWT and API key support
- Chat session management with metadata
- Message storage with role-based categorization (user, assistant, system, etc.)
- Support for function calls and tool calls tracking
- Performance metrics collection (tokens, latency)
- API rate limiting
- Comprehensive request logging
- Swagger API documentation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local instance or Atlas)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```sh
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatlogger
JWT_SECRET=your_jwt_secret_key_change_in_production
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=15*60*1000
RATE_LIMIT_MAX=100
```

### Running the Application

For development (with auto-restart):

```bash
npm run dev
```

For production:

```bash
npm start
```

## API Documentation

When the server is running, you can access the Swagger documentation at:

```plaintext
http://localhost:3000/api-docs
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

## License

[MIT](LICENSE)
