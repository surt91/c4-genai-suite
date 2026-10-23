import { HttpException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { AuditLogService } from '../../audit-log/index.js';
import { ConfigurationRepository, ExtensionEntity, ExtensionRepository } from '../../database/index.js';
import { Extension, ExtensionStringArgument } from '../index.js';
import { ExplorerService } from '../services/index.js';
import { UpdateExtension, UpdateExtensionHandler } from './update-extension.js';

const mockPerformedBy = { id: 'test-user', name: 'Test User' };

describe(UpdateExtension.name, () => {
  let handler: UpdateExtensionHandler;
  let repository: ExtensionRepository;
  let configRepository: ConfigurationRepository;
  let explorer: ExplorerService;
  let auditLogService: AuditLogService;

  beforeEach(() => {
    explorer = {
      getExtension: vi.fn(),
    } as unknown as ExplorerService;
    repository = {
      findOneBy: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    } as unknown as ExtensionRepository;
    configRepository = {
      findOneBy: vi.fn().mockResolvedValue({ id: 1, name: 'Test Config' }),
    } as unknown as ConfigurationRepository;
    auditLogService = {
      createAuditLog: vi.fn(),
    } as unknown as AuditLogService;

    handler = new UpdateExtensionHandler(explorer, repository, configRepository, auditLogService);
  });

  it('should throw not found when extension entity does not exist', async () => {
    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });
    vi.spyOn(repository, 'findOneBy').mockImplementation(() => {
      return Promise.resolve(null);
    });

    try {
      const result = await handler.execute(
        new UpdateExtension(
          1,
          {
            enabled: true,
            values: {},
          },
          mockPerformedBy,
        ),
      );
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });

  it('should throw bad request when extension does not exist', async () => {
    vi.spyOn(explorer, 'getExtension').mockImplementation(() => undefined);
    vi.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({} as ExtensionEntity);
    });

    try {
      const result = await handler.execute(
        new UpdateExtension(
          1,
          {
            enabled: true,
            values: {},
          },
          mockPerformedBy,
        ),
      );
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('should update extension with valid values', async () => {
    vi.spyOn(repository, 'create').mockReturnValue({} as ExtensionEntity);
    vi.spyOn(repository, 'save').mockImplementation((v) => Promise.resolve(v as ExtensionEntity));
    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });
    vi.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({ name: 'test' } as ExtensionEntity);
    });

    const result = await handler.execute(
      new UpdateExtension(
        1,
        {
          enabled: true,
          values: {},
        },
        mockPerformedBy,
      ),
    );
    expect(result).toBeDefined();
    expect(result.extension.enabled).toBe(true);
    expect(result.extension.spec.name).toBe('test');
    expect(result.extension.values).toStrictEqual({});
  });

  it('should succeed and mask values', async () => {
    let saveArg: DeepPartial<ExtensionEntity> | undefined;

    vi.spyOn(repository, 'create').mockReturnValue({} as ExtensionEntity);

    vi.spyOn(repository, 'save').mockImplementation((v) => {
      saveArg = structuredClone(v);
      return Promise.resolve(saveArg as ExtensionEntity);
    });

    const test = vi.fn().mockImplementation(() => {});
    vi.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({ values: { foo: 'existing' } as Record<string, any> } as ExtensionEntity);
    });

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

    const result = await handler.execute(
      new UpdateExtension(
        1,
        {
          enabled: true,
          values: {
            bar: 'secure',
          },
        },
        mockPerformedBy,
      ),
    );

    expect(saveArg).toEqual({
      enabled: true,
      state: {},
      values: {
        foo: 'existing',
        bar: 'secure',
      },
    });

    expect(result.extension.values).toEqual({
      foo: 'existing',
      bar: '********************',
    });
  });
});
