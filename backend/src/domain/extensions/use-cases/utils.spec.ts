import { ConfigurationModel } from '../interfaces.js';
import { buildConfigurationSnapshot } from './utils.js';

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
