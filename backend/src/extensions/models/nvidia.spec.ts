import { modelExtensionTestSuite } from './model-test.base.js';
import { NvidiaModelExtension } from './nvidia.js';

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn(() => () => 'mocked model'),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  apiKey: 'test-api-key',
  baseUrl: 'test-base-url',
  modelName: 'test-model',
};

describe('NvidiaModelExtension', () => modelExtensionTestSuite(NvidiaModelExtension, mockConfig));
