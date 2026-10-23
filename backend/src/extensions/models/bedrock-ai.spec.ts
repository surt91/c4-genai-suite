import { BedrockModelExtension } from './bedrock-ai.js';
import { modelExtensionTestSuite } from './model-test.base.js';

vi.mock('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: vi.fn(() => () => 'mocked model'),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(() => () => 'test output'),
}));

const mockConfig = {
  model: 'test-bedrock-model',
  region: 'test-region',
  accessKeyId: 'test-access-key-id',
  secretAccessKey: 'test-secret-access-key',
};

describe('BedrockModelExtension', () => modelExtensionTestSuite(BedrockModelExtension, mockConfig));
