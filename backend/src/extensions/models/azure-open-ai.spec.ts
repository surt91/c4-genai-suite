import { AzureOpenAIModelExtension } from './azure-open-ai.js';
import { modelExtensionTestSuite } from './model-test.base.js';

vi.mock('@ai-sdk/azure', () => ({
  createAzure: vi.fn(() => ({
    responses: vi.fn(() => () => 'mocked model'),
  })),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  modelName: 'test-model',
  apiKey: 'test-api-key',
  deploymentName: 'test-deployment',
  instanceName: 'test-instance',
};

describe('OpenAIModelExtension', () => modelExtensionTestSuite(AzureOpenAIModelExtension, mockConfig));
