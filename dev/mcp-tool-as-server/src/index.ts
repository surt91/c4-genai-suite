import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Server } from "@modelcontextprotocol/server";
import { proxyServer, startHTTPServer } from "mcp-proxy";
import { spawn } from "node:child_process";

type MultipleServerConfig = {
  mcpServers: {
    [serverName: string]: {
      command: 'npx' | 'uvx',
      args: string[],
      env: Record<string, string>,
      port: number,
      transport: 'sse' | 'stdio' | undefined,
    }
  }
}

async function startServers(config: MultipleServerConfig) {
  await Promise.allSettled(Object.entries(config.mcpServers).map(async ([serverName, serverConfig]) => {
    const port = Number(serverConfig.port);
    const supportedCommands = ['npx', 'uvx'];
    if (!supportedCommands.includes(serverConfig.command) || !Number.isInteger(port) || port <= 0) {
      console.warn(`Invalid configuration ${JSON.stringify(serverConfig)} only npx and uvx allowed`);
      return;
    }

    if (serverConfig.transport === 'stdio' || serverConfig.transport === undefined) {
      // we use a proxy to map from stdio to sse
      const stdioTransport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args,
        env: {
          PATH,
          ...(serverConfig.env ?? {})
        }
      });

      const stdioClient = new Client(
          {
            name: `${serverName}-proxy`,
            version: "1.0.0",
          },
          {
            capabilities: {
              elicitation: {},
            },
          },
      );

      console.log(`Starting server ${serverName} on port ${serverConfig.port}`);
      await start(serverConfig.port, stdioClient, stdioTransport);
    } else if (serverConfig.transport === 'sse') {
      // if the tool offers sse directly, we just start it
      const child = spawn(
          serverConfig.command,
          serverConfig.args,
          // this works for MCP servers written with FastMCP, we might need to look for a more general method
          { env: { ...process.env, FASTMCP_PORT: String(serverConfig.port) } }
      );

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        console.log(chunk);
      });
      child.stderr.on('data', (chunk) => {
        console.log(chunk);
      });
      child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });

      console.log(`Starting server ${serverName}.`);
    }
  }));
}

async function start(port: number, stdioClient: Client, stdioTransport: StdioClientTransport) {
  await stdioClient.connect(stdioTransport);

  const serverVersion = stdioClient.getServerVersion() ?? { name: "mcp-proxy", version: "1.0.0" };
  const serverCapabilities = stdioClient.getServerCapabilities() ?? {};

  await startHTTPServer({
    createServer: async () => {
      // mcp-proxy only forwards (and registers handlers for) the capabilities of the proxied server,
      // e.g. completions only if the server offers them
      const mcpServer = new Server(serverVersion, { capabilities: serverCapabilities });

      await proxyServer({
        server: mcpServer,
        client: stdioClient,
        serverCapabilities,
      });

      return mcpServer;
    },
    port,
    // SSE (the default transport of the backend) and streamable HTTP
    sseEndpoint: "/sse",
    streamEndpoint: "/mcp",
  });
}

const { CONFIG, PATH } = process.env as Record<string, any> & { CONFIG: string, PATH: string };
const config: MultipleServerConfig = JSON.parse(CONFIG);
void startServers(config);
