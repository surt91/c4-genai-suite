import { CommandBus } from '@nestjs/cqrs';
import { AIMessage, ChatContext, HumanMessage } from '../interfaces';
import { ExecutorMiddleware } from './executor-middleware';
import { ChatApi } from './generated';

describe(ExecutorMiddleware.name, () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends the history with the message types of the executor spec', async () => {
    const answer = jest.spyOn(ChatApi.prototype, 'answer').mockResolvedValue({ result: { content: 'done', type: 'ai' } });
    const abort = new AbortController();
    const context = {
      abort,
      configuration: { executorEndpoint: 'http://executor.internal' },
      context: {},
      input: 'next question',
      systemMessages: ['be nice'],
      user: { id: 'u', name: 'User', email: 'u@example.com' },
      history: {
        getMessages: () => Promise.resolve([new HumanMessage('question'), new AIMessage('answer')]),
        addUserMessage: jest.fn(),
        addAIMessage: jest.fn(),
      },
      result: { next: jest.fn() },
    } as unknown as ChatContext;

    await new ExecutorMiddleware({} as CommandBus).invoke(
      context,
      () => context,
      () => Promise.resolve(true),
    );

    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'next question',
        history: [
          { content: 'be nice', type: 'system' },
          { content: 'question', type: 'user' },
          { content: 'answer', type: 'ai' },
        ],
      }),
      { signal: abort.signal },
    );
  });
});
