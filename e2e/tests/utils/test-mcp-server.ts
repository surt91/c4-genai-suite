/**
 * A tiny MCP server (streamable HTTP) for the E2E tests of forms, URL requests and tool errors. Each worker starts its
 * own instance (like the mock LLM), so that tests do not ask each other questions.
 *
 * Tools:
 * - `confirm_booking`: asks for a confirmation with a form (elicitation in form mode)
 * - `open_login`: asks the user to open a login page (elicitation in URL mode). The page is served by this server and
 *   reports the completion (`notifications/elicitation/complete`) when it is opened.
 * - `failing_tool`: always fails (a tool result marked as error)
 */

import { randomUUID } from 'crypto';
import * as http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, CallToolResult, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from './config';

export const TEST_MCP_TOOLS = {
  confirm: 'confirm_booking',
  login: 'open_login',
  failing: 'failing_tool',
};

export const TEST_MCP_FAILURE = 'Service unavailable (E2E failure)';

function text(value: string, isError = false): CallToolResult {
  return { content: [{ type: 'text', text: value }], isError };
}

export async function startTestMcpServer(port: number): Promise<{ close: () => void; url: string; loginUrl: string }> {
  const loginBase = `http://localhost:${port}/login`;
  // the pending logins by elicitation ID
  const logins = new Map<string, () => void>();

  const createServer = () => {
    const server = new Server({ name: 'e2e-test-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

    server.setRequestHandler(ListToolsRequestSchema, () =>
      Promise.resolve({
        tools: [
          {
            name: TEST_MCP_TOOLS.confirm,
            description: 'Books a meeting room after a confirmation of the user.',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: TEST_MCP_TOOLS.login,
            description: 'Logs in at the calendar service.',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: TEST_MCP_TOOLS.failing,
            description: 'A tool that always fails.',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      }),
    );

    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const options = { relatedRequestId: extra.requestId };

      switch (request.params.name) {
        case TEST_MCP_TOOLS.confirm: {
          const result = await server.elicitInput(
            {
              mode: 'form',
              message: 'Book the meeting room **Galaxy**?',
              requestedSchema: {
                type: 'object',
                properties: { title: { type: 'string', title: 'Title' } },
                required: ['title'],
              },
            },
            options,
          );
          return result.action === 'accept'
            ? text(`Booked: ${String((result.content as { title?: string })?.title)}`)
            : text(`Booking ${result.action}`);
        }
        case TEST_MCP_TOOLS.login: {
          const elicitationId = randomUUID();
          const completed = new Promise<void>((resolve) => {
            logins.set(elicitationId, resolve);
            setTimeout(resolve, 60_000);
          });
          const result = await server.elicitInput(
            {
              mode: 'url',
              message: 'Please log in at the calendar service.',
              elicitationId,
              url: `${loginBase}/${elicitationId}?token=e2e-secret`,
            },
            options,
          );
          if (result.action !== 'accept') {
            return text(`Login ${result.action}`);
          }
          await completed;
          await server.createElicitationCompletionNotifier(elicitationId, options)();
          return text('Logged in at the calendar service');
        }
        case TEST_MCP_TOOLS.failing:
          return text(TEST_MCP_FAILURE, true);
        default:
          return text(`Unknown tool ${request.params.name}`, true);
      }
    });

    return server;
  };

  const transports = new Map<string, StreamableHTTPServerTransport>();

  const readBody = (req: http.IncomingMessage) =>
    new Promise<unknown>((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => resolve(body ? JSON.parse(body) : undefined));
    });

  const httpServer = http.createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);

      if (url.pathname.startsWith('/login/')) {
        const id = url.pathname.slice('/login/'.length);
        logins.get(id)?.();
        logins.delete(id);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!doctype html><title>Calendar login</title><h1>Logged in, you can close this page.</h1>');
        return;
      }

      if (url.pathname !== '/mcp') {
        res.writeHead(404).end();
        return;
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        if (req.method !== 'POST') {
          res.writeHead(400).end();
          return;
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport!);
          },
        });
        transport.onclose = () => {
          if (transport?.sessionId) {
            transports.delete(transport.sessionId);
          }
        };
        await createServer().connect(transport);
      }

      await transport.handleRequest(req, res, body);
    })().catch((err) => {
      console.error('[TestMCP] request failed', err);
      if (!res.headersSent) {
        res.writeHead(500).end();
      }
    });
  });

  return new Promise((resolve) => {
    httpServer.listen(port, '0.0.0.0', () => {
      const url = `http://${config.MOCK_LLM_HOST}:${port}/mcp`;
      console.log(`[TestMCP] Running on port ${port}, accessible to the backend at ${url}`);
      resolve({
        url,
        loginUrl: loginBase,
        close: () => {
          for (const transport of transports.values()) {
            void transport.close();
          }
          httpServer.close();
        },
      });
    });
  });
}
