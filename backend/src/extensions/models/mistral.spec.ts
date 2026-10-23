import { MistralModelExtension } from './mistral.js';
import { modelExtensionTestSuite } from './model-test.base.js';

vi.mock('@ai-sdk/mistral', () => ({
  createMistral: vi.fn(() => () => 'mocked model'),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  apiKey: 'test-api-key',
  modelName: 'test-model',
};

describe('MistralModelExtension', () => modelExtensionTestSuite(MistralModelExtension, mockConfig));
