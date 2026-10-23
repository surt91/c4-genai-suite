import { ChatCacheImpl } from 'src/domain/chat/cache';
import { ChatContext } from 'src/domain/chat/interfaces';
import { CacheRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';
import { ToolsApi } from './generated';
import { OpenApiExtension } from './open-api';

describe(OpenApiExtension.name, () => {
  const extension = { externalId: 'open-api_1', values: { endpoint: 'http://tools.internal', headers: '' } };

  function createContext(cache: ChatCacheImpl, user: User): ChatContext {
    return { cache, user, tools: [], context: {}, result: { next: jest.fn() } } as unknown as ChatContext;
  }

  beforeEach(() => {
    jest.spyOn(ToolsApi.prototype, 'getTools').mockResolvedValue({
      items: [{ name: 'lookup', description: 'Lookup', arguments: {} }],
    });
    jest.spyOn(ToolsApi.prototype, 'executeTool').mockResolvedValue({ result: 'ok' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('binds the (cached) tools to the user of the current request', async () => {
    const sut = new OpenApiExtension({} as CacheRepository, { t: (key: string) => key } as unknown as I18nService);
    const cache = new ChatCacheImpl();
    const alice = { id: 'alice', name: 'Alice', email: 'alice@example.com' } as User;
    const bob = { id: 'bob', name: 'Bob', email: 'bob@example.com' } as User;

    const [middleware] = await sut.getMiddlewares(
      alice,
      extension as unknown as Parameters<OpenApiExtension['getMiddlewares']>[1],
    );
    const aliceContext = createContext(cache, alice);
    const bobContext = createContext(cache, bob);
    await middleware.invoke(
      aliceContext,
      () => aliceContext,
      () => Promise.resolve(true),
    );
    await middleware.invoke(
      bobContext,
      () => bobContext,
      () => Promise.resolve(true),
    );

    // The tool list is only fetched once (cached) ...
    expect(ToolsApi.prototype.getTools).toHaveBeenCalledTimes(1);

    // ... but the tool of the second request runs with the second user.
    await bobContext.tools[0].execute({});
    expect(ToolsApi.prototype.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'lookup', user: { id: 'bob', name: 'Bob', email: 'bob@example.com' } }),
    );
  });
});
