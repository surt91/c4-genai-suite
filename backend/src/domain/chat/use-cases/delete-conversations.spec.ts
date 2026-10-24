import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import type { Mock } from 'vitest';
import { ConversationFileEntity } from '../../database/entities/conversation-file.js';
import { BlobCategory, BlobEntity, ConversationEntity, FileEntity } from '../../database/index.js';
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
  // the conversation, whose messages contain the URL of the image (see purgeGeneratedImages)
  const getRawOne = vi.fn();
  const queryBuilder = {
    withDeleted: () => queryBuilder,
    innerJoin: () => queryBuilder,
    select: () => queryBuilder,
    where: vi.fn(() => queryBuilder),
    andWhere: vi.fn(() => queryBuilder),
    orderBy: () => queryBuilder,
    limit: () => queryBuilder,
    getRawOne,
  };
  const blobs = {
    find: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    manager: { createQueryBuilder: () => queryBuilder },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    (buildClient as Mock).mockReturnValue({ deleteFile });
    blobs.find.mockResolvedValue([]);
    getRawOne.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteConversationsHandler,
        { provide: getRepositoryToken(ConversationEntity), useValue: conversations },
        { provide: getRepositoryToken(ConversationFileEntity), useValue: conversationFiles },
        { provide: getRepositoryToken(FileEntity), useValue: files },
        { provide: getRepositoryToken(BlobEntity), useValue: blobs },
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

  it('should delete the generated images of the conversations', async () => {
    conversations.find.mockResolvedValue([{ id: 10 }]);
    conversationFiles.find.mockResolvedValue([]);
    blobs.find.mockResolvedValue([
      { id: 'a', userId: '1' },
      { id: 'b', userId: '1' },
    ]);

    await handler.execute({ user: { id: '1' } as User });

    expect(blobs.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { conversationId: 10, category: BlobCategory.LLM_IMAGE } }),
    );
    // only the messages of other conversations of the same user count
    expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), { conversationId: 10 });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(String), { userId: '1' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(String), { url: '%/blobs/a%' });
    expect(blobs.delete).toHaveBeenCalledWith({ id: In(['a', 'b']) });
    expect(blobs.update).not.toHaveBeenCalled();
    expect(conversations.delete).toHaveBeenCalledWith({ id: 10 });
  });

  it('should hand over a generated image to a duplicate, which shows it', async () => {
    conversations.find.mockResolvedValue([{ id: 10 }]);
    conversationFiles.find.mockResolvedValue([]);
    blobs.find.mockResolvedValue([{ id: 'a', userId: '1' }]);
    getRawOne.mockResolvedValue({ conversationId: 11 });

    await handler.execute({ user: { id: '1' } as User });

    expect(blobs.update).toHaveBeenCalledWith({ id: 'a' }, { conversationId: 11 });
    expect(blobs.delete).not.toHaveBeenCalled();
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
    expect(blobs.delete).not.toHaveBeenCalled();
    expect(conversations.delete).not.toHaveBeenCalled();
  });

  it('should not delete conversations without userId', async () => {
    await handler.execute({ user: {} as User });
    expect(conversations.find).not.toHaveBeenCalled();
    expect(conversations.delete).not.toHaveBeenCalled();
  });
});
