import { ReplaySubject } from 'rxjs';
import { ConversationRepository, MessageRepository } from 'src/domain/database';
import { ConversationFileRepository } from '../../database/entities/conversation-file';
import { ChatContext, StreamEvent } from '../interfaces';
import { GetHistoryMiddleware } from './get-history-middleware';

describe(GetHistoryMiddleware.name, () => {
  it('only edits messages of the own conversation', async () => {
    const messages = {
      findOneBy: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      getMessageThread: jest.fn().mockResolvedValue([]),
      save: jest.fn((x: object) => Promise.resolve({ id: 100, conversationId: 1, ...x })),
    };
    const conversations = {
      findOneByOrFail: jest.fn().mockResolvedValue({ id: 1 }),
      save: jest.fn().mockResolvedValue({}),
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
