import { GoogleGenAIModelExtension } from './google-genai.js';
import { modelExtensionTestSuite } from './model-test.base.js';

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => () => 'mocked model'),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  modelName: 'test-model',
  apiKey: 'test-api-key',
};

describe('GoogleGenAIModelExtension', () => modelExtensionTestSuite(GoogleGenAIModelExtension, mockConfig));
