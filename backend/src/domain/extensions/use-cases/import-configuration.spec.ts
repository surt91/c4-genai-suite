import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Mock } from 'vitest';
import { I18nService } from '../../../localization/i18n.service.js';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../database/index.js';
import { ChatSuggestion } from '../../shared.js';
import { ExtensionObjectArgument, ExtensionStringArgument } from '../interfaces.js';
import { ExplorerService } from '../services/index.js';
import { PortableConfiguration } from './export-configuration.js';
import { ImportConfiguration, ImportConfigurationHandler } from './import-configuration.js';

interface MockQueryRunner {
  connect: Mock;
  startTransaction: Mock;
  commitTransaction: Mock;
  rollbackTransaction: Mock;
  release: Mock;
  manager: {
    save: Mock;
    findBy: Mock;
  };
}

interface MockDataSource {
  createQueryRunner: Mock;
  manager: {
    findOne: Mock;
  };
}

describe(ImportConfiguration.name, () => {
  let handler: ImportConfigurationHandler;
  let dataSource: MockDataSource;
  let queryRunner: MockQueryRunner;
  let explorer: ExplorerService;
  let i18n: I18nService;
  let i18nTranslate: Mock;

  beforeEach(() => {
    explorer = {
      getExtension: vi.fn(),
    } as unknown as ExplorerService;

    i18nTranslate = vi.fn((key: string, args?: Record<string, string>) => {
      let result = key;
      if (args) {
        Object.entries(args).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, v);
        });
      }
      return result;
    });

    i18n = {
      t: i18nTranslate,
    } as unknown as I18nService;

    queryRunner = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        save: vi.fn(),
        findBy: vi.fn().mockResolvedValue([]),
      },
    };

    dataSource = {
      createQueryRunner: vi.fn().mockReturnValue(queryRunner),
      manager: {
        findOne: vi.fn(),
      },
    };

    handler = new ImportConfigurationHandler(dataSource as unknown as DataSource, explorer, i18n);
  });

  it('should throw BadRequestException when extension is not available', async () => {
    vi.spyOn(explorer, 'getExtension').mockReturnValue(undefined);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'non-existent-extension',
          enabled: true,
          values: {},
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'The following extensions are not available in this system: non-existent-extension',
    );
  });

  it('should throw BadRequestException when multiple extensions are not available', async () => {
    vi.spyOn(explorer, 'getExtension').mockReturnValue(undefined);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'extension-1',
          enabled: true,
          values: {},
        },
        {
          name: 'extension-2',
          enabled: true,
          values: {},
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'The following extensions are not available in this system: extension-1, extension-2',
    );
  });

  it('should throw BadRequestException when extension configuration has missing required field', async () => {
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          requiredField: {
            type: 'string',
            required: true,
          } as ExtensionStringArgument,
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {}, // Missing required field
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Invalid configuration for extension "test-extension"',
    );
  });

  it('should throw BadRequestException when extension configuration has invalid data type', async () => {
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          numericField: {
            type: 'number',
            title: 'Numeric Field',
            required: true,
          },
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            numericField: 'not-a-number', // Wrong type
          },
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Invalid configuration for extension "test-extension"',
    );
  });

  it('should throw BadRequestException when extension configuration violates constraints', async () => {
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          limitedNumber: {
            type: 'number',
            title: 'Limited Number',
            required: true,
            minimum: 1,
            maximum: 10,
          },
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            limitedNumber: 100, // Exceeds maximum
          },
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Invalid configuration for extension "test-extension"',
    );
  });

  it('should successfully import configuration with valid data', async () => {
    const mockUserGroups = [{ id: 'group1', name: 'Group 1' }];

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 1,
      name: 'Imported Config',
      description: 'Imported Description',
      status: ConfigurationStatus.ENABLED,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as ChatSuggestion[],
      userGroupIds: ['group1'],
      extensions: [],
    };

    vi.spyOn(queryRunner.manager, 'findBy').mockResolvedValue(mockUserGroups);
    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: { key: 'value' },
        } as Partial<ExtensionEntity>,
      ],
    });

    vi.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            key: {
              type: 'string',
              required: true,
            } as ExtensionStringArgument,
          },
          title: 'Test Extension',
          description: 'Test',
          type: 'tool',
        },
        getMiddlewares: () => Promise.resolve([]),
      };
    });

    const importData: PortableConfiguration = {
      name: 'Imported Config',
      description: 'Imported Description',
      enabled: true,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as ChatSuggestion[],
      userGroupIds: ['group1'],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: { key: 'value' },
        },
      ],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.configuration).toBeDefined();
    expect(result.configuration.name).toBe('Imported Config');
    expect(result.configuration.enabled).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(queryRunner.manager.save).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should import disabled configuration correctly', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 2,
      name: 'Disabled Config',
      description: 'Test',
      status: ConfigurationStatus.DISABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Disabled Config',
      description: 'Test',
      enabled: false,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result.configuration.enabled).toBe(false);
    expect(result.warnings).toEqual([]);
    const mockCalls = queryRunner.manager.save.mock.calls as [[typeof ConfigurationEntity, ConfigurationEntity]];
    const savedEntity = mockCalls[0][1];
    expect(savedEntity.status).toBe(ConfigurationStatus.DISABLED);
  });

  it('should leave the externalId to the database (unique per extension)', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 5,
      name: 'Test Config',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    let savedExtensions: ExtensionEntity[] = [];
    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      if (entity === ExtensionEntity) {
        savedExtensions = data as ExtensionEntity[];
        return Promise.resolve(data);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [],
    });

    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-ext',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-ext',
          enabled: true,
          values: {},
        },
        {
          name: 'test-ext',
          enabled: true,
          values: {},
        },
      ],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(savedExtensions).toHaveLength(2);
    // the trigger `set_external_id` generates `<name>_<id>` for NULL values
    expect(savedExtensions.map((x) => x.externalId)).toEqual([undefined, undefined]);
    expect(result.warnings).toEqual([]);
  });

  it('should handle configurable arguments correctly', async () => {
    const temperatureArg: ExtensionObjectArgument = {
      type: 'object',
      title: 'Configurable Args',
      properties: {
        temperature: {
          type: 'number',
          title: 'Temperature',
        },
      },
    };

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 6,
      name: 'Config with args',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    let savedExtensions: ExtensionEntity[] = [];
    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      if (entity === ExtensionEntity) {
        savedExtensions = data as ExtensionEntity[];
        return Promise.resolve(data);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: {},
          configurableArguments: temperatureArg,
        } as Partial<ExtensionEntity>,
      ],
    });

    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'llm',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Config with args',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {},
          configurableArguments: temperatureArg,
        },
      ],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(savedExtensions[0].configurableArguments).toEqual(temperatureArg);
    expect(result.warnings).toEqual([]);
  });

  it('should warn when importing configuration from different version', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 7,
      name: 'Config from different version',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    // Set current VERSION
    process.env.VERSION = '2.0.0';

    const importData: PortableConfiguration = {
      version: '1.0.0', // Different version
      name: 'Config from different version',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result.warnings).toHaveLength(1);
    expect(i18nTranslate).toHaveBeenCalledWith('texts.configuration.warningVersionMismatch', {
      name: 'Config from different version',
      version: '1.0.0',
      currentVersion: '2.0.0',
    });

    // Clean up
    delete process.env.VERSION;
  });

  it('should not warn when importing configuration from same version', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 8,
      name: 'Config from same version',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    // Set current VERSION
    process.env.VERSION = '2.0.0';

    const importData: PortableConfiguration = {
      version: '2.0.0', // Same version
      name: 'Config from same version',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result.warnings).toEqual([]);

    // Clean up
    delete process.env.VERSION;
  });

  it('should not store masked secrets and disable the extension until they are entered again', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 9,
      name: 'Config with masked nested values',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    let savedExtensions: ExtensionEntity[] = [];
    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      if (entity === ExtensionEntity) {
        savedExtensions = data as ExtensionEntity[];
        return Promise.resolve(data);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [],
    });

    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          apiKey: {
            type: 'string',
            title: 'API Key',
            format: 'password',
            required: false,
          },
          nested: {
            type: 'object',
            title: 'Nested Object',
            properties: {
              secretKey: {
                type: 'string',
                format: 'password',
                required: false,
              } as ExtensionStringArgument,
              publicValue: {
                type: 'string',
                required: true,
              } as ExtensionStringArgument,
            },
            required: false,
          },
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Config with masked nested values',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            apiKey: '********************',
            endpoint: 'https://api.example.com',
            nested: {
              secretKey: '********************',
              publicValue: 'public',
            },
          },
        },
        {
          name: 'test-extension',
          enabled: true,
          values: { apiKey: 'not-masked', endpoint: 'https://other.example.com' },
        },
      ],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    // the masks are not stored as secrets
    expect(savedExtensions[0].values).toEqual({ endpoint: 'https://api.example.com', nested: { publicValue: 'public' } });
    expect(savedExtensions[0].enabled).toBe(false);
    expect(savedExtensions[1].values.apiKey).toBe('not-masked');
    expect(savedExtensions[1].enabled).toBe(true);
    // the import data is not changed
    expect(importData.extensions[0].values.apiKey).toBe('********************');
    expect(result.missingSecrets).toEqual([
      { name: 'test-extension', title: 'Test Extension', fields: ['API Key', 'nested.secretKey'] },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('should include exportedAt timestamp in import data', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 10,
      name: 'Config with timestamp',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const exportedAt = new Date().toISOString();

    const importData: PortableConfiguration = {
      version: '1.0.0',
      exportedAt,
      name: 'Config with timestamp',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.configuration.name).toBe('Config with timestamp');
    // Version '1.0.0' differs from default 'unknown', so a warning is expected
    expect(result.warnings).toHaveLength(1);
    expect(i18nTranslate).toHaveBeenCalledWith('texts.configuration.warningVersionMismatch', {
      name: 'Config with timestamp',
      version: '1.0.0',
      currentVersion: 'unknown',
    });
  });

  it('should throw BadRequestException when none of the specified user groups exist', async () => {
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    // No user groups found
    vi.spyOn(queryRunner.manager, 'findBy').mockResolvedValue([]);

    const importData: PortableConfiguration = {
      name: 'Config with invalid groups',
      description: 'Test',
      enabled: true,
      userGroupIds: ['non-existent-group-1', 'non-existent-group-2'],
      extensions: [],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Cannot import configuration: none of the specified user groups exist in this system',
    );
  });

  it('should successfully import configuration when all user groups exist', async () => {
    const mockUserGroups = [
      { id: 'group-1', name: 'Group 1' },
      { id: 'group-2', name: 'Group 2' },
    ];

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 11,
      name: 'Config with valid groups',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: ['group-1', 'group-2'],
      extensions: [],
    };

    vi.spyOn(queryRunner.manager, 'findBy').mockResolvedValue(mockUserGroups);
    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Config with valid groups',
      description: 'Test',
      enabled: true,
      userGroupIds: ['group-1', 'group-2'],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.configuration.name).toBe('Config with valid groups');
    expect(result.warnings).toEqual([]);
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({
        userGroups: mockUserGroups,
      }),
    );
  });

  it('should warn and proceed when some user groups are missing', async () => {
    const mockUserGroups = [{ id: 'group-1', name: 'Group 1' }];

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 12,
      name: 'Config with partial groups',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: ['group-1'],
      extensions: [],
    };

    // Only one of two groups found
    vi.spyOn(queryRunner.manager, 'findBy').mockResolvedValue(mockUserGroups);
    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Config with partial groups',
      description: 'Test',
      enabled: true,
      userGroupIds: ['group-1', 'missing-group'],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.warnings).toHaveLength(1);
    expect(i18nTranslate).toHaveBeenCalledWith('texts.configuration.warningMissingUserGroups', {
      name: 'Config with partial groups',
      missingIds: 'missing-group',
    });
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({
        userGroups: mockUserGroups,
      }),
    );
  });

  it('should import configuration without user groups when none specified', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 13,
      name: 'Config without groups',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      userGroupIds: [],
      extensions: [],
    };

    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    vi.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    });

    const importData: PortableConfiguration = {
      name: 'Config without groups',
      description: 'Test',
      enabled: true,
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.warnings).toEqual([]);
    expect(queryRunner.manager.findBy).not.toHaveBeenCalled();
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({
        userGroups: [],
      }),
    );
  });

  it('should ignore the executor settings of configurations exported by older versions', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 14,
      name: 'Legacy Config',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      userGroupIds: [],
      extensions: [],
    };

    queryRunner.manager.save.mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    vi.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);

    // Exports of older versions contain the removed executor settings.
    const importData = {
      name: 'Legacy Config',
      description: 'Test',
      enabled: true,
      executorEndpoint: 'http://executor.internal',
      executorHeaders: 'Authorization=Bearer secret',
      extensions: [],
    } as PortableConfiguration;

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result.warnings).toEqual([]);
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({ name: 'Legacy Config', description: 'Test' }),
    );
    expect(queryRunner.manager.save).not.toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({ executorEndpoint: 'http://executor.internal' }),
    );
    expect(queryRunner.manager.save).not.toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({ executorHeaders: 'Authorization=Bearer secret' }),
    );
  });
});
