import { ConfigurationModel, ConfiguredExtension } from '../interfaces.js';
import { buildConfigurationSnapshot, maskKeyValues, removeMaskedValues } from './utils.js';

function makeConfiguration(overrides: Partial<ConfigurationModel> = {}): ConfigurationModel {
  return {
    id: 42,
    name: 'Test Configuration',
    description: 'A test configuration',
    enabled: true,
    agentName: 'Test Agent',
    chatFooter: 'Footer text',
    chatSuggestions: [],
    userGroupIds: ['group-1'],
    ...overrides,
  };
}

describe('buildConfigurationSnapshot', () => {
  describe('field inclusion', () => {
    it('includes all configuration fields in the snapshot', () => {
      const configuration = makeConfiguration();
      const snapshot = buildConfigurationSnapshot(configuration);

      expect(snapshot).toMatchObject({
        id: configuration.id,
        name: configuration.name,
        description: configuration.description,
        enabled: configuration.enabled,
        agentName: configuration.agentName,
        chatFooter: configuration.chatFooter,
        chatSuggestions: configuration.chatSuggestions,
        userGroupIds: configuration.userGroupIds,
      });
    });

    it('does not include extensions in the snapshot', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ extensions: [] }));

      expect(snapshot).not.toHaveProperty('extensions');
    });
  });
});

describe('maskKeyValues', () => {
  const extension = (values: Record<string, unknown>) =>
    ({
      values,
      spec: {
        arguments: { apiKey: { type: 'string', format: 'password' }, endpoint: { type: 'string' } },
      },
    }) as unknown as ConfiguredExtension;

  it('masks the secrets that are set', () => {
    const configured = extension({ apiKey: 'secret', endpoint: 'https://example.com' });
    maskKeyValues(configured);
    expect(configured.values).toEqual({ apiKey: '********************', endpoint: 'https://example.com' });
  });

  it('does not mask missing secrets, so that they are shown as missing', () => {
    const configured = extension({ endpoint: 'https://example.com' });
    maskKeyValues(configured);
    expect(configured.values).toEqual({ endpoint: 'https://example.com' });
  });
});

describe('removeMaskedValues', () => {
  it('removes the masked values and returns their paths', () => {
    const values = { apiKey: '********************', other: 'x', nested: { secret: '********************', list: ['a'] } };
    expect(removeMaskedValues(values)).toEqual([['apiKey'], ['nested', 'secret']]);
    expect(values).toEqual({ other: 'x', nested: { list: ['a'] } });
  });
});
