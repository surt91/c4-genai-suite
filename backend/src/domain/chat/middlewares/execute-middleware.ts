import { Injectable, Logger } from '@nestjs/common';
import { generateText, stepCountIs, streamText, tool, ToolSet } from 'ai';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import { ChatContext, ChatError, ChatMiddleware, LanguageModelContext, NamedStructuredTool } from '../interfaces';

// this is the general structure of how AI SDK wraps errors
type GenericAIError = { error: unknown };

@Injectable()
export class ExecuteMiddleware implements ChatMiddleware {
  public static ORDER = 500;
  logger = new Logger(ExecuteMiddleware.name);

  constructor(
    private readonly i18n: I18nService,
    private readonly metricsService: MetricsService,
  ) {}

  order?: number = ExecuteMiddleware.ORDER;

  async invoke(context: ChatContext) {
    const historyMessages = await context.history?.getMessages();
    if (!historyMessages?.length) {
      this.metricsService.chats.inc({ user: context.user.id });
    }

    try {
      await this.execute(context);
      this.metricsService.prompts.inc({ user: context.user.id, status: 'successful' });
    } catch (err) {
      this.metricsService.prompts.inc({ user: context.user.id, status: 'failed' });
      throw err;
    }
  }

  private buildToolSet(tools: NamedStructuredTool[]): ToolSet {
    return tools.reduce((prev, curr) => {
      prev[curr.name] = tool({
        description: curr.description,
        inputSchema: curr.schema,
        execute: async (input) => curr.execute(input),
      });
      return prev;
    }, {} as ToolSet);
  }

  async handleAiSdkChainExecution(llm: LanguageModelContext, context: ChatContext) {
    if (llm.disableStreaming) {
      return this.handleAiSdkNonStreamingExecution(llm, context);
    }
    return this.handleAiSdkStreamingExecution(llm, context);
  }

  private async handleAiSdkStreamingExecution(llm: LanguageModelContext, context: ChatContext) {
    const { input, systemMessages, abort, result, history, tools } = context;

    const messages = await history?.getMessages();
    const allTools = this.buildToolSet(tools);

    const { fullStream } = streamText({
      model: llm.model,
      tools: allTools,
      toolChoice: 'auto',
      prompt: [
        ...systemMessages.map((x) => ({ role: 'system' as const, content: x })),
        ...(messages?.filter((x) => !!x) ?? []),
        { role: 'user' as const, content: input },
      ],
      ...llm.options,
      abortSignal: abort.signal,
      stopWhen: stepCountIs(1000),
      experimental_telemetry: {
        isEnabled: context.telemetry ?? false,
        metadata: {
          conversationId: context.conversationId,
          assistantId: context.configuration.id,
          assistantName: context.configuration.name,
          modelName: llm.modelName,
          providerName: llm.providerName,
        },
      },
    });

    let error: GenericAIError | null = null;
    const text: string[] = [];
    for await (const event of untilAborted(fullStream, abort.signal)) {
      if (event.type === 'finish-step') {
        // Count the usage per step (instead of the total at the end), so the finished steps (e.g. tool calls) are
        // also counted when the answer is stopped. Otherwise stopping each answer just before its end would bypass the
        // token limits. The usage of the interrupted step is not reported by the providers.
        addTokenUsage(context, llm, event.usage.totalTokens);
      }
      if (event.type === 'tool-call') {
        const toolName = tools.find((x) => x.name === event.toolName)?.displayName ?? event.toolName;
        result.next({ type: 'tool_start', tool: { name: toolName, id: event.toolCallId } });
      }
      if (event.type === 'tool-result') {
        const toolName = tools.find((x) => x.name === event.toolName)?.displayName ?? event.toolName;
        result.next({ type: 'tool_end', tool: { name: toolName, id: event.toolCallId } });
      }
      if (event.type === 'tool-error') {
        this.logger.error({ event });
        const toolName = tools.find((x) => x.name === event.toolName)?.displayName ?? event.toolName;
        result.next({ type: 'tool_error', tool: { name: toolName, id: event.toolCallId }, error: toolErrorMessage(event.error) });
      }
      if (event.type === 'reasoning-delta' && !llm.suppressReasoning) {
        result.next({ type: 'reasoning', content: event.text });
      }
      if (event.type === 'reasoning-end' && !llm.suppressReasoning) {
        result.next({ type: 'reasoning_end' });
      }
      if (event.type === 'text-delta') {
        text.push(event.text);
        result.next({ type: 'chunk', content: [{ type: 'text', text: event.text }] });
      }
      if (event.type === 'error' && !abort.signal.aborted) {
        this.logger.error({ event });
        error = event.error as GenericAIError;
      }
      if (event.type === 'finish') {
        if (event.finishReason === 'content-filter') {
          error = { error: { code: 'content_filter' } };
        }
      }
    }

    // When the generation has been stopped (by the user or because the client disconnected), the partial answer is kept.
    const stopped = abort.signal.aborted;
    await history?.addAIMessage(text.join(''), { stopped });

    if (error && !stopped) {
      // unwrap and throw the causing error to be handled by the ExceptionMiddleware
      throw error.error;
    }
  }

  private async handleAiSdkNonStreamingExecution(llm: LanguageModelContext, context: ChatContext) {
    const { input, systemMessages, abort, result, history, tools } = context;

    const messages = await history?.getMessages();
    const allTools = this.buildToolSet(tools);

    let response: Awaited<ReturnType<typeof generateText>>;
    try {
      response = await generateText({
        model: llm.model,
        tools: allTools,
        toolChoice: 'auto',
        prompt: [
          ...systemMessages.map((x) => ({ role: 'system' as const, content: x })),
          ...(messages?.filter((x) => !!x) ?? []),
          { role: 'user' as const, content: input },
        ],
        ...llm.options,
        abortSignal: abort.signal,
        stopWhen: stepCountIs(1000),
        experimental_telemetry: {
          isEnabled: context.telemetry ?? false,
          metadata: {
            conversationId: context.conversationId,
            assistantId: context.configuration.id,
            assistantName: context.configuration.name,
            modelName: llm.modelName,
            providerName: llm.providerName,
          },
        },
      });
    } catch (err) {
      if (abort.signal.aborted) {
        // Nothing has been generated yet, the empty answer is stored by the history middleware.
        return;
      }
      throw err;
    }

    addTokenUsage(context, llm, response.totalUsage?.totalTokens);

    if (response.finishReason === 'content-filter') {
      throw { code: 'content_filter' } as unknown;
    }

    // Emit tool events for each step
    for (const step of response.steps) {
      for (const toolCall of step.toolCalls) {
        const toolName = tools.find((x) => x.name === toolCall.toolName)?.displayName ?? toolCall.toolName;
        const tool = { name: toolName, id: toolCall.toolCallId };
        result.next({ type: 'tool_start', tool });
        const failed = step.content.find((part) => part.type === 'tool-error' && part.toolCallId === toolCall.toolCallId);
        if (failed && failed.type === 'tool-error') {
          result.next({ type: 'tool_error', tool, error: toolErrorMessage(failed.error) });
        } else {
          result.next({ type: 'tool_end', tool });
        }
      }
    }

    // Emit reasoning if present
    if (response.reasoningText && !llm.suppressReasoning) {
      result.next({ type: 'reasoning', content: response.reasoningText });
      result.next({ type: 'reasoning_end' });
    }

    // Emit the complete text as a single chunk
    if (response.text) {
      result.next({ type: 'chunk', content: [{ type: 'text', text: response.text }] });
    }

    await history?.addAIMessage(response.text ?? '');
  }

  async execute(context: ChatContext) {
    const { llm: chosenLlm, llms } = context;

    const llm = llms[chosenLlm ?? ''];

    if (!llm) {
      throw new ChatError(this.i18n.t('texts.chat.errorMissingLLM'));
    }

    return this.handleAiSdkChainExecution(llm, context);
  }
}

/** The message of the error of a tool call, shown to the user. */
export function toolErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  const text = message || 'Unknown error';
  return text.length > 1000 ? `${text.slice(0, 1000)}…` : text;
}

function addTokenUsage(context: ChatContext, llm: LanguageModelContext, totalTokens: number | undefined) {
  context.tokenUsage ??= { tokenCount: 0, model: llm.modelName, llm: llm.providerName };
  context.tokenUsage.tokenCount += totalTokens ?? 0;
}

/**
 * Iterates the stream until it ends or the signal is aborted. Unlike the stream itself, it stops immediately on abort,
 * even when the stream is waiting for something that does not support aborting (e.g. a tool).
 */
export async function* untilAborted<T>(stream: AsyncIterable<T>, signal: AbortSignal): AsyncGenerator<T> {
  const iterator = stream[Symbol.asyncIterator]();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<{ done: true; value: undefined }>((resolve) => {
    onAbort = () => resolve({ done: true, value: undefined });
    signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    while (!signal.aborted) {
      const next = await Promise.race([iterator.next(), aborted]);
      if (next.done || signal.aborted) {
        break;
      }
      yield next.value;
    }
  } catch (err) {
    // Errors caused by the abort (e.g. an AbortError of the LLM request) are expected.
    if (!signal.aborted) {
      throw err;
    }
  } finally {
    signal.removeEventListener('abort', onAbort!);
    if (signal.aborted) {
      // Cancel the underlying stream without waiting for it.
      iterator.return?.().catch(() => {});
    }
  }
}
