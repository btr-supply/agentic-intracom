# IntraCom

> Agent Bus MCP Server for cross-agent communication between AI coding assistants.

**IntraCom** is a generic [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI agents from different coding assistants (OpenCode, Claude Code, Aider, Roo Code, etc.) to communicate with each other through a shared message bus.

## Features

- **Agent Registration**: Register agents with capabilities and allowlists
- **Message Passing**: Send messages with allowlist enforcement
- **Token Authentication**: Optional token-based auth per agent
- **Persistent Storage**: JSON-based state persistence
- **Tool Discovery**: List all registered agents and their capabilities
- **Generic Design**: Works with any MCP-enabled AI tool

## Installation

```bash
# Clone the repository
git clone https://github.com/btr-supply/agentic-intracom.git
cd agentic-intracom

# Install dependencies
bun install
```

## Usage

### Starting the Server

```bash
bun run start
```

The server uses stdio for MCP communication. Configure it in your AI tool's MCP settings.

### Configuration

Via environment variable:

```bash
export INTRACOM_STORAGE="./intracom-state.json"
bun run start
```

## MCP Tools

### `agent_list`
List all registered agents with their capabilities and allowlists.

### `agent_register`
Register or update an agent with capabilities, allowlist, and optional token.

### `agent_unregister`
Remove an agent from the registry.

### `message_send`
Send a message to another agent (enforces allowlist).

### `message_read`
Read messages from an agent's mailbox (drains by default).

### `message_peek`
Get message counts without reading content.

## OpenCode Integration

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "intracom": {
      "type": "local",
      "command": ["bun", "run", "/path/to/agentic-intracom/src/index.ts"],
      "environment": {
        "INTRACOM_STORAGE": "./intracom-state.json"
      },
      "enabled": true
    }
  }
}
```

### Example Agent Configuration

```markdown
---
description: Frontend Lead
mode: subagent
---

# Neo - Frontend Lead

You are registered as `neo` on IntraCom.

## Protocol

1. On start: Register yourself
2. Send messages to other agents
3. Read your mailbox periodically
```

## Claude Code Integration

Add to your `claude.json`:

```json
{
  "mcpServers": {
    "intracom": {
      "command": "bun",
      "args": ["/path/to/agentic-intracom/src/index.ts"],
      "env": {
        "INTRACOM_STORAGE": "./intracom-state.json"
      }
    }
  }
}
```

## Development

```bash
# Run with watch mode
bun run dev

# Format code
bunx prettier --write .
```

## License

MIT - see [LICENSE](LICENSE) for details.
