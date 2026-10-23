import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetExtensionsResponse } from '../../domain/extensions/index.js';
import { ApiResponsesController } from './api.responses.controller.js';

describe(ApiResponsesController.name, () => {
  it('selects the model only from LLM extensions', () => {
    const sut = new ApiResponsesController({} as QueryBus, {} as CommandBus) as unknown as {
      getLlm(extensions: GetExtensionsResponse['extensions'], model?: string): string | undefined;
    };
    const extensions = [
      { spec: { type: 'tool', name: 'gpt-image-1' }, values: { model: 'gpt-4o' } },
      { spec: { type: 'llm', name: 'open-ai' }, values: { modelName: 'gpt-4o' } },
    ] as unknown as GetExtensionsResponse['extensions'];

    expect(sut.getLlm(extensions, 'gpt-4o')).toBe('open-ai');
  });
});
