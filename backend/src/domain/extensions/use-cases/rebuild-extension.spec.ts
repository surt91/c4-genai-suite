import { ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { Extension, ExtensionStringArgument } from '../index.js';
import { ExplorerService } from '../services/index.js';
import { RebuildExtension, RebuildExtensionHandler } from './rebuild-extension.js';

describe(RebuildExtension.name, () => {
  const extension: Extension = {
    spec: {
      name: 'mcp',
      title: 'MCP',
      description: '',
      type: 'tool',
      arguments: {
        endpoint: { type: 'string', required: true } as ExtensionStringArgument,
        apiKey: { type: 'string', format: 'password', required: false } as ExtensionStringArgument,
      },
    },
    buildSpec: () => Promise.resolve(extension.spec),
    getMiddlewares: () => Promise.resolve([]),
  };

  function createHandler(stored: Partial<ExtensionEntity>) {
    const explorer = { getExtension: () => extension } as unknown as ExplorerService;
    const repository = {
      findOneBy: vi.fn().mockResolvedValue(stored),
      create: vi.fn((x: object) => x),
    } as unknown as ExtensionRepository;
    return new RebuildExtensionHandler(explorer, repository);
  }

  it('does not return the stored secrets', async () => {
    const handler = createHandler({ id: 1, name: 'mcp', enabled: true, values: { endpoint: 'http://mcp', apiKey: 'secret' } });

    const { extension: rebuilt } = await handler.execute(new RebuildExtension('mcp', { endpoint: 'http://mcp' }, 1));

    expect(rebuilt.values.apiKey).toBe('********************');
    expect(rebuilt.values.endpoint).toBe('http://mcp');
  });

  it('does not use the stored values of an extension of another type', async () => {
    const handler = createHandler({ id: 1, name: 'brave-web-search', enabled: true, values: { apiKey: 'secret' } });

    await expect(handler.execute(new RebuildExtension('mcp', { endpoint: 'http://attacker' }, 1))).rejects.toMatchObject({
      status: 404,
    });
  });
});
