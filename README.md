# Ropeli AI — App Builder

AI-powered app builder that generates React Native (Expo) and React web apps from natural language prompts.

## Project Structure

- `client/` — React + Vite frontend with Monaco editor and Sandpack live preview.
- `server/` — Node.js + Express backend with OpenAI/Modal AI code generation and Expo runner.

## Getting Started

### Prerequisites

- Node.js (>= 18)
- npm

### Installation

Run the following command in the root directory to install dependencies for both client and server:

```bash
npm run install:all
```

### Running the Application

To start both the frontend and backend concurrently:

```bash
npm run dev
```

Alternatively, you can start them separately:

- **Frontend**: `npm run dev:client`
- **Backend**: `npm run dev:server`

## Environment Variables

Make sure to set up `.env` files in both `client/` and `server/` directories based on the provided templates or current configuration.
