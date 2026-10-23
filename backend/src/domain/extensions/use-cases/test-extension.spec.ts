import { HttpException, HttpStatus } from '@nestjs/common';
import { ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { Extension, ExtensionStringArgument } from '../index.js';
import { ExplorerService } from '../services/index.js';
import { TestExtension, TestExtensionHandler } from './test-extension.js';

describe(TestExtension.name, () => {
  let handler: TestExtensionHandler;
  let repository: ExtensionRepository;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: vi.fn(),
    } as unknown as ExplorerService;
    repository = {
      findOneBy: vi.fn(),
    } as unknown as ExtensionRepository;

    handler = new TestExtensionHandler(explorer, repository);
  });

  it('should throw not found when extension does not exist', async () => {
    vi.spyOn(explorer, 'getExtension').mockImplementation(() => undefined);

    try {
      const result = await handler.execute(new TestExtension('unknown', {}));
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });

  it('should throw bad request when extension test method does not exist', async () => {
    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });

    try {
      const result = await handler.execute(new TestExtension('unknown', {}));
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('should throw not found when extension entity does not exist', async () => {
    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' },
        test: async () => {},
        getMiddlewares: () => Promise.resolve([]),
      };
    });

    vi.spyOn(repository, 'findOneBy').mockImplementation(() => Promise.resolve(null));

    try {
      const result = await handler.execute(new TestExtension('unknown', {}, 1));
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });

  it('should succeed when extension, test method and extension entity exist', async () => {
    const test = vi.fn().mockImplementation(() => {});

    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' },
        test,
        getMiddlewares: () => Promise.resolve([]),
      };
    });

    vi.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({ name: 'unknown' } as ExtensionEntity);
    });

    const result = await handler.execute(new TestExtension('unknown', {}, 1));
    expect(result).toBe(true);
  });

  it('should succeed and remove masked values', async () => {
    const test = vi.fn().mockImplementation(() => {});

    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            foo: {
              type: 'string',
              required: true,
            } as ExtensionStringArgument,
            bar: {
              type: 'string',
              format: 'password',
              required: true,
            } as ExtensionStringArgument,
          },
          title: 'test',
          description: '',
          type: 'llm',
        },
        test,
        getMiddlewares: () => Promise.resolve([]),
      };
    });

    vi.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({ name: 'unknown' } as ExtensionEntity);
    });

    const result = await handler.execute(
      new TestExtension(
        'unknown',
        {
          foo: 'abc',
          bar: '********************',
        },
        1,
      ),
    );

    expect(test).toHaveBeenCalledWith({
      foo: 'abc',
    });
    expect(result).toBe(true);
  });

  it('should not use the stored values of an extension of another type', async () => {
    const test = vi.fn();
    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => ({
      spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' },
      test,
      getMiddlewares: () => Promise.resolve([]),
    }));
    vi.spyOn(repository, 'findOneBy').mockResolvedValue({
      name: 'other',
      values: { apiKey: 'secret' },
    } as unknown as ExtensionEntity);

    await expect(handler.execute(new TestExtension('open-ai', { endpoint: 'http://attacker' }, 1))).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    expect(test).not.toHaveBeenCalled();
  });
});
