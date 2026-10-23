import { modelExtensionTestSuite } from './model-test.base.js';
import { OllamaModelExtension } from './ollama.js';

vi.mock('ollama-ai-provider-v2', () => ({
  createOllama: vi.fn(() => () => 'mocked model'),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  endpoint: 'test-endpoint',
  modelName: 'test-model',
};

describe('OllamaModelExtension', () => modelExtensionTestSuite(OllamaModelExtension, mockConfig));
