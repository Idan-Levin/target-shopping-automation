# StageHand Agent

A Node.js/TypeScript service that receives shopping lists from the Slack Shopping Agent, processes them through BrowserBase for Target.com automation, and reports back to Slack.

## Overview

The StageHand Agent serves as a bridge between:

1. **Slack Shopping Agent** - A Python agent that manages a shopping list in Slack
2. **BrowserBase** - A platform for running headless browsers that provides the infrastructure for Target.com automation

When an admin in Slack initiates the `/order-placed` command, the Slack agent exports the shopping list and sends it to the StageHand agent. StageHand then processes each item, adds them to the Target.com cart, and provides status updates in Slack. Once all items are processed, an admin can trigger the checkout process with a separate command.

## Architecture

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  Slack          │        │  StageHand      │        │  BrowserBase    │
│  Shopping Agent │ ──────▶│  Agent          │ ──────▶│  (Headless      │
│  (Python)       │ ◀──────│  (TypeScript)   │ ◀──────│  Browser        │
└─────────────────┘        └─────────────────┘        │  Platform)      │
                                                      └─────────────────┘
```

The system is built with a combination of languages:

1. **Slack Shopping Agent**: Python-based agent that handles user interactions in Slack
2. **StageHand Agent**: TypeScript service that processes shopping lists and coordinates with BrowserBase
3. **BrowserBase**: Platform for running headless browsers that manages the infrastructure for web automation

### About BrowserBase

BrowserBase is a cloud platform that provides infrastructure for running headless browsers at scale. It offers:

- **Framework Compatibility**: Native compatibility with Stagehand, Playwright, Puppeteer, and Selenium
- **Observability**: Complete session visibility through Session Inspector and Session Replay
- **Advanced Features**: Automatic captcha solving, residential proxies, browser extensions, and file management
- **Long-running Sessions**: Support for persistent browser sessions
- **Secure, Scalable Infrastructure**: For production-grade browser automation

In this project, BrowserBase eliminates the need to maintain our own fleet of headless browsers and provides the reliability needed for automated shopping.

## Features

- RESTful API with secure API key authentication
- Asynchronous processing of shopping lists
- Real-time status updates to Slack
- In-memory state management of shopping runs
- Integration with BrowserBase for scalable browser automation
- Two-phase checkout (add to cart, then explicit approval)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check endpoint |
| `/trigger-shopping-run` | POST | Triggers a new shopping run with a list of items |
| `/checkout/:runId` | POST | Initiates checkout for a completed shopping run |

## Prerequisites

- Node.js 18+
- BrowserBase account and API key
  - Sign up at [BrowserBase](https://browserbase.io/)
  - Create a project and obtain your API key and project ID
- Target.com account
- Slack Bot Token (for sending status updates)
- Slack Shopping Agent integration

## Environment Variables

Create a `.env` file based on `.env.example`:

```
# Server settings
PORT=10000  # Port the server will listen on
API_KEY=your_secret_api_key_here  # Secret shared with the Slack Agent for authentication

# BrowserBase configuration
BROWSERBASE_API_KEY=your_browserbase_api_key  # API key for BrowserBase
BROWSERBASE_PROJECT_ID=your_browserbase_project_id  # Project ID in BrowserBase

# LLM Provider (required for Stagehand)
OPENAI_API_KEY=your_openai_api_key_here  # OpenAI API key
# Uncomment if using another provider
# ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional: Anthropic API key
# GROQ_API_KEY=your_groq_api_key_here  # Optional: Groq API key

# Target credentials
TARGET_USERNAME=your_target_email  # Email/Username for Target.com
TARGET_PASSWORD=your_target_password  # Password for Target.com

# Slack integration (OPTIONAL - for status updates)
# If not configured properly, the app will function without sending Slack notifications
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token  # Bot Token with chat:write permissions
SLACK_CHANNEL_ID=C0123456789  # Channel ID to post status updates to
```

The Slack integration is optional. The StageHand agent will function properly even without Slack notifications, which can be useful for development and testing.

## Setup & Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create and configure your `.env` file
4. Run in development mode:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```

## Deployment on Render.com

1. Create a new **Web Service** on Render
2. Connect to your Git repository
3. Configure the build settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/server.js`
4. Set up the environment variables (copy from your `.env` file), making sure to include:
   - `PORT`
   - `API_KEY`
   - `BROWSERBASE_API_KEY`
   - `BROWSERBASE_PROJECT_ID`
   - `OPENAI_API_KEY` (critical for Stagehand functionality)
   - `TARGET_USERNAME`
   - `TARGET_PASSWORD`
   - `SLACK_BOT_TOKEN` (optional)
   - `SLACK_CHANNEL_ID` (optional)
5. Deploy the service

## Integration with Slack Shopping Agent

The Python-based Slack Shopping Agent needs to be configured to call the StageHand agent:

1. Add these environment variables to the Slack agent's Python environment:
   ```
   STAGEHAND_API_ENDPOINT=https://your-stagehand-render-app.onrender.com
   STAGEHAND_API_KEY=your_secret_api_key_here  # Same as API_KEY in StageHand
   ```

2. Configure the Slack app with the following slash commands:
   - `/order-placed` - Triggers a new shopping run with the current shopping list
   - `/target-checkout <run_id>` - Initiates checkout for a completed shopping run

3. The Python Slack app will need to call the StageHand API endpoints:
   - POST to `/trigger-shopping-run` when the `/order-placed` command is used
   - POST to `/checkout/:runId` when the `/target-checkout <run_id>` command is used

## Error Handling

- If a shopping item fails to be added to the cart, the run continues with the next items
- Failed items are reported to Slack but don't halt the entire process
- Errors during checkout or unexpected failures are reported to Slack
- All errors are logged with detailed information

## Security Considerations

- API key authentication is required for all endpoints except `/healthz`
- Target.com credentials are stored as environment variables on Render.com
- No credentials are exposed in logs or API responses
- Slack Bot token has limited scope for posting messages only

## Development Roadmap

- [ ] Add persistent storage for run state (Redis or PostgreSQL)
- [ ] Implement automatic retry for failed items
- [ ] Add unit tests and integration tests
- [ ] Implement webhook callbacks for enhanced status reporting
- [ ] Add admin UI for monitoring runs

## License

ISC 

## Troubleshooting

### Slack Authentication Issues

If you see `invalid_auth` errors in your logs:

1. **Check your Slack Bot Token**:
   - Ensure your SLACK_BOT_TOKEN starts with `xoxb-`
   - Verify the token is still valid and hasn't been revoked
   - Confirm the bot has been added to the channel specified in SLACK_CHANNEL_ID

2. **Bot Permissions**:
   - Your bot needs the following OAuth scopes:
     - `chat:write` - To send messages in channels
     - `chat:write.public` - If posting to public channels the bot isn't a member of

3. **Channel Membership**:
   - Invite your bot to the channel using `/invite @YourBot`
   - Verify the SLACK_CHANNEL_ID is correct (should start with 'C')

4. **Optional Configuration**:
   - Slack integration is optional - the agent will continue to function without Slack notifications
   - If you don't need Slack notifications, you can leave these values blank in your .env file