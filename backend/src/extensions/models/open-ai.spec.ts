import { modelExtensionTestSuite } from './model-test.base.js';
import { OpenAIModelExtension } from './open-ai.js';

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    responses: vi.fn(() => () => 'mocked model'),
  })),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  apiKey: 'test-api-key',
  modelName: 'test-model',
};

describe('OpenAIModelExtension', () => modelExtensionTestSuite(OpenAIModelExtension, mockConfig));
