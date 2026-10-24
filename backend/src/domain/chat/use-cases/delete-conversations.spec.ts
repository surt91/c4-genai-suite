import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Mock } from 'vitest';
import { ConversationFileEntity } from '../../database/entities/conversation-file.js';
import { ConversationEntity, FileEntity } from '../../database/index.js';
import { buildClient } from '../../files/use-cases/utils.js';
import { User } from '../../users/index.js';
import { DeleteConversationsHandler } from './delete-conversations.js';

vi.mock('../../files/use-cases/utils.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildClient: vi.fn(),
}));

describe('DeleteConversationsHandler', () => {
  let handler: DeleteConversationsHandler;
  const conversations = { find: vi.fn(), delete: vi.fn() };
  const conversationFiles = { find: vi.fn() };
  const files = { find: vi.fn(), delete: vi.fn() };
  const deleteFile = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    (buildClient as Mock).mockReturnValue({ deleteFile });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteConversationsHandler,
        { provide: getRepositoryToken(ConversationEntity), useValue: conversations },
        { provide: getRepositoryToken(ConversationFileEntity), useValue: conversationFiles },
        { provide: getRepositoryToken(FileEntity), useValue: files },
      ],
    }).compile();

    handler = module.get(DeleteConversationsHandler);
  });

  it('should delete the conversations of the user with their conversation files', async () => {
    const bucket = { id: 3, type: 'conversation', indexName: 'index' };
    conversations.find.mockResolvedValue([{ id: 10 }]);
    conversationFiles.find.mockImplementation(({ where }: { where: { conversationId: unknown } }) =>
      typeof where.conversationId === 'number'
        ? [
            { fileId: 1, file: { id: 1, bucketId: 3, bucket } },
            { fileId: 2, file: { id: 2, bucketId: 4, bucket: { id: 4, type: 'user' } } },
          ]
        : [],
    );
    files.find.mockResolvedValue([{ id: 1, bucket }]);

    await handler.execute({ user: { id: '1' } as User });

    expect(conversations.find).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: '1' }, withDeleted: true }));
    expect(deleteFile).toHaveBeenCalledWith({ file_id: '1', indexName: 'index' });
    expect(files.delete).toHaveBeenCalledWith({ id: 1 });
    expect(files.delete).toHaveBeenCalledTimes(1);
    expect(conversations.delete).toHaveBeenCalledWith({ id: 10 });
  });

  it('should keep the conversation when REI-S fails', async () => {
    const bucket = { id: 3, type: 'conversation', indexName: 'index' };
    conversations.find.mockResolvedValue([{ id: 10 }]);
    conversationFiles.find.mockImplementation(({ where }: { where: { conversationId: unknown } }) =>
      typeof where.conversationId === 'number' ? [{ fileId: 1, file: { id: 1, bucketId: 3, bucket } }] : [],
    );
    files.find.mockResolvedValue([{ id: 1, bucket }]);
    deleteFile.mockRejectedValue(new TypeError('fetch failed'));

    await expect(handler.execute({ user: { id: '1' } as User })).rejects.toThrow('RAG server');

    expect(files.delete).not.toHaveBeenCalled();
    expect(conversations.delete).not.toHaveBeenCalled();
  });

  it('should not delete conversations without userId', async () => {
    await handler.execute({ user: {} as User });
    expect(conversations.find).not.toHaveBeenCalled();
    expect(conversations.delete).not.toHaveBeenCalled();
  });
});
