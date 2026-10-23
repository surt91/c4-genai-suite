import { ReplaySubject } from 'rxjs';
import { ConversationFileRepository } from '../../database/entities/conversation-file.js';
import { ConversationRepository, MessageRepository } from '../../database/index.js';
import { ChatContext, StreamEvent } from '../interfaces.js';
import { GetHistoryMiddleware } from './get-history-middleware.js';

describe(GetHistoryMiddleware.name, () => {
  it('only edits messages of the own conversation', async () => {
    const messages = {
      findOneBy: vi.fn().mockResolvedValue(null),
      findOne: vi.fn().mockResolvedValue(null),
      getMessageThread: vi.fn().mockResolvedValue([]),
      save: vi.fn((x: object) => Promise.resolve({ id: 100, conversationId: 1, ...x })),
    };
    const conversations = {
      findOneByOrFail: vi.fn().mockResolvedValue({ id: 1 }),
      save: vi.fn().mockResolvedValue({}),
    };
    const sut = new GetHistoryMiddleware(
      messages as unknown as MessageRepository,
      conversations as unknown as ConversationRepository,
      {} as ConversationFileRepository,
    );
    const context = {
      abort: new AbortController(),
      conversationId: 1,
      configuration: { id: 2 },
      input: 'edited',
      editMessageId: 42,
      result: new ReplaySubject<StreamEvent>(),
    } as unknown as ChatContext;

    await sut.invoke(
      context,
      () => context,
      () => Promise.resolve(true),
    );

    expect(messages.findOneBy).toHaveBeenCalledWith({ id: 42, conversationId: 1 });
  });
});
