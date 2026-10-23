import { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { MockLanguageModelV3 } from 'ai/test';
import { ReplaySubject } from 'rxjs';
import { z } from 'zod';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import { ChatContext, NamedDynamicStructuredTool, StreamEvent } from '../interfaces';
import { ExecuteMiddleware } from './execute-middleware';

const usage = (total: number) => ({
  inputTokens: { total, noCache: total, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
});

describe(ExecuteMiddleware.name, () => {
  it('counts the tokens of the finished steps when the answer is aborted', async () => {
    const abort = new AbortController();
    let call = 0;
    const model = new MockLanguageModelV3({
      doStream: ({ abortSignal }) => {
        call++;
        const parts: LanguageModelV3StreamPart[] =
          call === 1
            ? [
                { type: 'tool-call', toolCallId: '1', toolName: 'lookup', input: '{}' },
                { type: 'finish', usage: usage(10), finishReason: { unified: 'tool-calls', raw: undefined } },
              ]
            : [
                { type: 'text-start', id: 't' },
                { type: 'text-delta', id: 't', delta: 'Hel' },
              ];
        const stream = new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            parts.forEach((part) => controller.enqueue(part));
            // The second step never finishes on its own; the user stops it.
            if (call === 1) {
              controller.close();
            } else {
              // like fetch, the provider stream fails when the request is aborted
              abortSignal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
              setTimeout(() => abort.abort(), 10);
            }
          },
        });
        return Promise.resolve({ stream });
      },
    });

    const context = {
      abort,
      configuration: { id: 1, name: 'Assistant' },
      input: 'hi',
      llm: 'llm',
      llms: { llm: { model, options: {}, modelName: 'mock-model', providerName: 'mock' } },
      result: new ReplaySubject<StreamEvent>(),
      systemMessages: [],
      tools: [
        new NamedDynamicStructuredTool({
          name: 'lookup',
          displayName: 'Lookup',
          description: 'Lookup',
          schema: z.object({}),
          func: () => Promise.resolve('result'),
        }),
      ],
      user: { id: 'u' },
    } as unknown as ChatContext;
    const metrics = { chats: { inc: jest.fn() }, prompts: { inc: jest.fn() } } as unknown as MetricsService;

    await new ExecuteMiddleware({ t: (key: string) => key } as unknown as I18nService, metrics)
      .invoke(context)
      .catch(() => undefined);

    expect(context.tokenUsage).toEqual({ tokenCount: 10, model: 'mock-model', llm: 'mock' });
  });
});
