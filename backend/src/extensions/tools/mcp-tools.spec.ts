import { asSchema, JSONSchema7 } from 'ai';
import { toLlmInputSchema } from './mcp-tools';

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
