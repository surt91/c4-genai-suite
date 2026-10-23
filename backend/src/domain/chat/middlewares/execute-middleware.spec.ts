import { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { MockLanguageModelV3 } from 'ai/test';
import { ReplaySubject } from 'rxjs';
import * as z from 'zod';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import { ChatContext, MessagesHistory, NamedDynamicStructuredTool, StreamEvent } from '../interfaces';
import { ExecuteMiddleware, untilAborted } from './execute-middleware';

const usage = (total: number) => ({
  inputTokens: { total: total / 2, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: total / 2, text: undefined, reasoning: undefined },
});

/** A stream that emits the given parts and then stays open (like a slow LLM) until the request is aborted. */
function openStream(parts: LanguageModelV3StreamPart[], signal?: AbortSignal) {
  return new ReadableStream<LanguageModelV3StreamPart>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(part);
      }
      signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
    },
  });
}

function closedStream(parts: LanguageModelV3StreamPart[]) {
  return new ReadableStream<LanguageModelV3StreamPart>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(part));
      controller.close();
    },
  });
}

function createContext(model: MockLanguageModelV3, tools: NamedDynamicStructuredTool<any, any, any>[] = []) {
  const abort = new AbortController();
  const result = new ReplaySubject<StreamEvent>();
  const history = {
    getMessages: jest.fn().mockResolvedValue([]),
    addAIMessage: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MessagesHistory>;

  const context = {
    abort,
    result,
    history,
    input: 'Hello',
    systemMessages: [],
    tools,
    user: { id: 'user1' },
    configuration: { id: 1, name: 'Assistant' },
    llm: 'mock',
    llms: { mock: { model, options: {}, modelName: 'mock-model', providerName: 'mock-provider' } },
  } as unknown as ChatContext;

  return { context, abort, result, history };
}

describe(ExecuteMiddleware.name, () => {
  const i18n = { t: (key: string) => key } as unknown as I18nService;
  const metrics = { chats: { inc: jest.fn() }, prompts: { inc: jest.fn() } } as unknown as MetricsService;
  const middleware = new ExecuteMiddleware(i18n, metrics);

  it('stores the complete answer', async () => {
    const model = new MockLanguageModelV3({
      doStream: () =>
        Promise.resolve({
          stream: closedStream([
            { type: 'text-start', id: '1' },
            { type: 'text-delta', id: '1', delta: 'Hello ' },
            { type: 'text-delta', id: '1', delta: 'world' },
            { type: 'text-end', id: '1' },
            { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(30) },
          ]),
        }),
    });
    const { context, history } = createContext(model);

    await middleware.invoke(context);

    expect(history.addAIMessage).toHaveBeenCalledWith('Hello world', { stopped: false });
    expect(context.tokenUsage).toEqual({ tokenCount: 30, model: 'mock-model', llm: 'mock-provider' });
  });

  it('stops the LLM request and stores the partial answer as stopped when aborted', async () => {
    let llmSignal: AbortSignal | undefined;
    let call = 0;
    const model = new MockLanguageModelV3({
      doStream: ({ abortSignal }) => {
        llmSignal = abortSignal;
        call++;
        if (call === 1) {
          // the first step calls a tool and completes, so its usage is known
          return Promise.resolve({
            stream: closedStream([
              { type: 'tool-call', toolCallId: 'call1', toolName: 'lookup', input: '{}' },
              { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: usage(10) },
            ]),
          });
        }
        // the second step streams some text and then hangs
        return Promise.resolve({
          stream: openStream(
            [
              { type: 'text-start', id: '1' },
              { type: 'text-delta', id: '1', delta: 'Hello ' },
              { type: 'text-delta', id: '1', delta: 'wor' },
            ],
            abortSignal,
          ),
        });
      },
    });
    const tool = new NamedDynamicStructuredTool({
      name: 'lookup',
      displayName: 'Lookup',
      description: 'Looks something up',
      schema: z.object({}),
      func: () => Promise.resolve('result'),
    });
    const { context, abort, result, history } = createContext(model, [tool]);

    result.subscribe((event) => {
      if (event.type === 'chunk' && event.content[0].type === 'text' && event.content[0].text === 'wor') {
        abort.abort('cancelled');
      }
    });

    await middleware.invoke(context);

    expect(llmSignal?.aborted).toBe(true);
    expect(history.addAIMessage).toHaveBeenCalledWith('Hello wor', { stopped: true });
    // the usage of the completed first step is counted
    expect(context.tokenUsage?.tokenCount).toBe(10);
  });

  it('stops immediately even if a tool does not react to the abort', async () => {
    const model = new MockLanguageModelV3({
      doStream: () =>
        Promise.resolve({
          stream: closedStream([
            { type: 'tool-call', toolCallId: 'call1', toolName: 'hang', input: '{}' },
            { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: usage(10) },
          ]),
        }),
    });
    const tool = new NamedDynamicStructuredTool({
      name: 'hang',
      displayName: 'Hang',
      description: 'Never returns',
      schema: z.object({}),
      func: () => new Promise<string>(() => {}),
    });
    const { context, abort, result, history } = createContext(model, [tool]);

    result.subscribe((event) => {
      if (event.type === 'tool_start') {
        setTimeout(() => abort.abort('cancelled'), 10);
      }
    });

    await middleware.invoke(context);

    // without stopping immediately the test would time out
    expect(history.addAIMessage).toHaveBeenCalledWith('', { stopped: true });
  });

  it('does not store a message in non-streaming mode when aborted', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: ({ abortSignal }) =>
        new Promise((_, reject) => {
          abortSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    });
    const { context, abort, history } = createContext(model);
    context.llms.mock.disableStreaming = true;

    const promise = middleware.invoke(context);
    setTimeout(() => abort.abort('cancelled'), 10);

    await expect(promise).resolves.toBeUndefined();
    expect(history.addAIMessage).not.toHaveBeenCalled();
  });
});

describe(untilAborted.name, () => {
  it('yields all values if not aborted', async () => {
    async function* values() {
      yield await Promise.resolve(1);
      yield await Promise.resolve(2);
    }

    const result: number[] = [];
    for await (const value of untilAborted(values(), new AbortController().signal)) {
      result.push(value);
    }

    expect(result).toEqual([1, 2]);
  });

  it('rethrows errors if not aborted', async () => {
    // eslint-disable-next-line require-yield
    async function* values(): AsyncGenerator<number> {
      await Promise.resolve();
      throw new Error('failed');
    }

    const iterate = async () => {
      for await (const _ of untilAborted(values(), new AbortController().signal)) {
        // nothing to do
      }
    };

    await expect(iterate()).rejects.toThrow('failed');
  });
});
