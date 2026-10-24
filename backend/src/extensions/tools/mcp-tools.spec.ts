import { Client } from '@modelcontextprotocol/client';
import { asSchema, JSONSchema7 } from 'ai';
import { ChatContext } from '../../domain/chat/interfaces.js';
import { User } from '../../domain/users/index.js';
import { I18nService } from '../../localization/i18n.service.js';
import { MCPToolsExtension, toLlmInputSchema } from './mcp-tools.js';

describe('toLlmInputSchema', () => {
  const inputSchema: JSONSchema7 = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri', description: 'URL to fetch' },
      max_length: { type: 'integer', minimum: 1 },
      apiKey: { type: 'string' },
      options: { type: 'object', properties: { raw: { type: 'boolean' } }, required: ['raw'] },
    },
    required: ['url', 'apiKey'],
    additionalProperties: false,
  };

  it('passes the JSON schema of the MCP tool through, reduced to the attributes defined by the LLM', async () => {
    const schema = await Promise.resolve(asSchema(toLlmInputSchema(inputSchema, (key) => key !== 'apiKey')).jsonSchema);

    expect(schema).toEqual({
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', description: 'URL to fetch' },
        max_length: { type: 'integer', minimum: 1 },
        options: { type: 'object', properties: { raw: { type: 'boolean' } }, required: ['raw'] },
      },
      required: ['url'],
      additionalProperties: false,
    });
  });

  it('does not modify the schema of the MCP tool', () => {
    const copy = structuredClone(inputSchema);

    toLlmInputSchema(inputSchema, () => false);

    expect(inputSchema).toEqual(copy);
  });

  it('handles tools without properties', async () => {
    const schema = await Promise.resolve(asSchema(toLlmInputSchema({ type: 'object' }, () => true)).jsonSchema);

    expect(schema).toEqual({ type: 'object', properties: {} });
  });
});

describe('MCPToolsExtension client lifecycle', () => {
  const values = { serverName: 'test', endpoint: 'http://mcp.internal/sse', schema: { echo: { enabled: true } } };
  const sut = new MCPToolsExtension({ t: (key: string) => key, language: 'en' } as unknown as I18nService);
  const context = () => ({ tools: [], user: { id: 'u' }, context: {}, result: { next: vi.fn() } }) as unknown as ChatContext;

  beforeEach(() => {
    vi.spyOn(Client.prototype, 'connect').mockResolvedValue(undefined);
    vi.spyOn(Client.prototype, 'request').mockResolvedValue({ tools: [{ name: 'echo', inputSchema: { type: 'object' } }] });
    vi.spyOn(Client.prototype, 'close').mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('closes the client after the chat request, also when it fails', async () => {
    const [middleware] = await sut.getMiddlewares({} as User, { externalId: 'mcp_1', values } as never);

    const ctx = context();
    await middleware.invoke(
      ctx,
      () => ctx,
      () => Promise.resolve(true),
    );
    expect(ctx.tools).toHaveLength(1);
    expect(Client.prototype.close).toHaveBeenCalledTimes(1);

    const failing = context();
    await expect(
      middleware.invoke(
        failing,
        () => failing,
        () => Promise.reject(new Error('llm failed')),
      ),
    ).rejects.toThrow();
    expect(Client.prototype.close).toHaveBeenCalledTimes(2);
  });

  it('continues the chat without the tools when the server is not reachable', async () => {
    vi.spyOn(Client.prototype, 'connect').mockRejectedValue(new Error('ECONNREFUSED'));
    const [middleware] = await sut.getMiddlewares({} as User, { externalId: 'mcp_1', values } as never);
    const next = vi.fn().mockResolvedValue(true);

    const ctx = context();
    await middleware.invoke(ctx, () => ctx, next);

    expect(next).toHaveBeenCalledWith(ctx);
    expect(ctx.tools).toHaveLength(0);
  });

  it('closes the client after testing the connection', async () => {
    await sut.test(values as never);
    expect(Client.prototype.close).toHaveBeenCalledTimes(1);
  });

  it('closes the client when listing the tools fails', async () => {
    vi.spyOn(Client.prototype, 'request').mockRejectedValue(new Error('boom'));
    await expect(sut.test(values as never)).rejects.toThrow('boom');
    expect(Client.prototype.close).toHaveBeenCalledTimes(1);
  });
});
