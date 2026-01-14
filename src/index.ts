#!/usr/bin/env bun
/**
 * IntraCom - Agent Bus MCP Server
 *
 * A generic MCP server for cross-agent communication between AI coding assistants.
 * Agents can register, discover each other, and exchange messages through
 * allowlist-enforced mailboxes.
 *
 * Features:
 * - Agent registration with capabilities and allowlists
 * - Message passing with allowlist enforcement
 * - Token-based authentication (optional)
 * - Persistent mailbox storage (JSON file)
 *
 * Compatible with: OpenCode, Claude Code, Aider, Roo Code, and any MCP-enabled tool.
 *
 * @see https://github.com/btr-supply/agentic-intracom
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Types
interface Agent {
  agentId: string;
  capabilities: Record<string, unknown>;
  allowlist: string[];
  tokenHash?: string;
}

interface Message {
  id: string;
  ts: number;
  from: string;
  to: string;
  body: string;
  meta?: Record<string, unknown>;
}

interface BusState {
  agents: Record<string, Agent>;
  mailboxes: Record<string, Message[]>;
}

// Storage
const STORAGE_PATH = process.env.INTRACOM_STORAGE || "./intracom-state.json";

function loadState(): BusState {
  try {
    const file = Bun.file(STORAGE_PATH);
    if (file.size === 0) return { agents: {}, mailboxes: {} };
    return file.json() as BusState;
  } catch {
    return { agents: {}, mailboxes: {} };
  }
}

function saveState(state: BusState): void {
  Bun.write(STORAGE_PATH, JSON.stringify(state, null, 2));
}

function hashToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = Bun.crypto.subtle.hashSync("sha-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function requireAgent(state: BusState, agentId: string): Agent {
  const agent = state.agents[agentId];
  if (!agent) throw new Error(`Agent not registered: ${agentId}`);
  return agent;
}

function checkToken(agent: Agent, token?: string): void {
  if (agent.tokenHash && (!token || hashToken(token) !== agent.tokenHash)) {
    throw new Error("Invalid token");
  }
}

// Initialize state
let state = loadState();

// Create MCP server
const server = new Server(
  {
    name: "intracom",
    version: "1.0.0",
  },
  {
    capabilities: { tools: { listChanged: false } },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "agent_list",
      description: "List all registered agents with their capabilities and allowlists",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "agent_register",
      description: "Register or update an agent with capabilities, allowlist, and optional token",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Unique agent identifier" },
          capabilities: {
            type: "object",
            description: "Agent capabilities (role, domains, skills, etc.)",
          },
          allowlist: {
            type: "array",
            items: { type: "string" },
            description: "List of agent IDs this agent can send messages to",
          },
          token: { type: "string", description: "Authentication token (optional)" },
        },
        required: ["agentId", "capabilities", "allowlist"],
      },
    },
    {
      name: "agent_unregister",
      description: "Remove an agent from the registry",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          token: { type: "string" },
        },
        required: ["agentId"],
      },
    },
    {
      name: "message_send",
      description: "Send a message to another agent (enforces allowlist)",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Sender agent ID" },
          to: { type: "string", description: "Recipient agent ID" },
          body: { type: "string", description: "Message content" },
          meta: {
            type: "object",
            description: "Optional metadata (task_id, priority, etc.)",
          },
          token: { type: "string", description: "Authentication token" },
        },
        required: ["from", "to", "body"],
      },
    },
    {
      name: "message_read",
      description: "Read messages from an agent's mailbox (drains by default)",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID to read messages for" },
          max: { type: "number", description: "Max messages to return (default: 50)" },
          drain: {
            type: "boolean",
            description: "Remove messages after reading (default: true)",
          },
          token: { type: "string", description: "Authentication token" },
        },
        required: ["agentId"],
      },
    },
    {
      name: "message_peek",
      description: "Get message counts without reading content",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID to check (optional, omit for all)" },
        },
      },
    },
  ],
}));

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {
      case "agent_list": {
        const agents = Object.values(state.agents).map((a) => ({
          agentId: a.agentId,
          capabilities: a.capabilities,
          allowlist: a.allowlist,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(agents, null, 2) }],
        };
      }

      case "agent_register": {
        const { agentId, capabilities, allowlist, token } = args as {
          agentId: string;
          capabilities: Record<string, unknown>;
          allowlist: string[];
          token?: string;
        };

        state.agents[agentId] = {
          agentId,
          capabilities,
          allowlist,
          tokenHash: token ? hashToken(token) : undefined,
        };

        if (!state.mailboxes[agentId]) {
          state.mailboxes[agentId] = [];
        }

        saveState(state);
        return { content: [{ type: "text", text: `OK: Agent '${agentId}' registered` }] };
      }

      case "agent_unregister": {
        const { agentId, token } = args as { agentId: string; token?: string };

        const agent = requireAgent(state, agentId);
        checkToken(agent, token);

        delete state.agents[agentId];
        delete state.mailboxes[agentId];

        saveState(state);
        return { content: [{ type: "text", text: `OK: Agent '${agentId}' unregistered` }] };
      }

      case "message_send": {
        const { from, to, body, meta, token } = args as {
          from: string;
          to: string;
          body: string;
          meta?: Record<string, unknown>;
          token?: string;
        };

        const sender = requireAgent(state, from);
        checkToken(sender, token);

        requireAgent(state, to);

        if (!sender.allowlist.includes(to)) {
          throw new Error(`Not allowed: ${from} -> ${to}`);
        }

        const msg: Message = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          from,
          to,
          body,
          meta,
        };

        state.mailboxes[to] ??= [];
        state.mailboxes[to].push(msg);

        saveState(state);
        return { content: [{ type: "text", text: `OK: Message sent to '${to}'` }] };
      }

      case "message_read": {
        const { agentId, max = 50, drain = true, token } = args as {
          agentId: string;
          max?: number;
          drain?: boolean;
          token?: string;
        };

        const agent = requireAgent(state, agentId);
        checkToken(agent, token);

        const mailbox = state.mailboxes[agentId] ?? [];
        const messages = mailbox.slice(0, max);

        if (drain) {
          state.mailboxes[agentId] = mailbox.slice(messages.length);
          saveState(state);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  agentId,
                  count: messages.length,
                  remaining: state.mailboxes[agentId]?.length ?? 0,
                  messages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "message_peek": {
        const { agentId } = args as { agentId?: string };

        if (agentId) {
          const mailbox = state.mailboxes[agentId] ?? [];
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ agentId, count: mailbox.length }, null, 2),
              },
            ],
          };
        }

        const counts = Object.fromEntries(
          Object.entries(state.mailboxes).map(([id, box]) => [id, box.length])
        );

        return {
          content: [{ type: "text", text: JSON.stringify(counts, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `ERROR: ${msg}` }],
      isError: true,
    };
  }
});

// Start server
await server.connect(new StdioServerTransport());
