import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindManyOptions, FindOperator, FindOptionsWhere } from 'typeorm';
import { ConversationFileEntity, ConversationFileRepository } from '../../database/entities/conversation-file.js';
import { BucketEntity, BucketRepository, FileEntity, FileRepository } from '../../database/index.js';
import { User } from '../../users/index.js';
import { GetFiles, GetFilesHandler, GetFilesResponse } from './get-files.js';

describe('Get Files', () => {
  let bucketRepository: BucketRepository;
  let fileRepository: FileRepository;
  let conversationFileRepository: ConversationFileRepository;
  let handler: GetFilesHandler;

  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    userGroupIds: ['group1'],
  };

  const mockUserDifferent: User = {
    id: '2',
    name: 'Test User 2',
    email: 'test2@example.com',
    userGroupIds: ['grou21'],
  };

  const findFiles = (statement: FindManyOptions<FileEntity> | undefined, files: FileEntity[]): Promise<FileEntity[]> => {
    const whereStatement = Array.isArray(statement?.where)
      ? statement.where.reduce((prev, curr) => ({ ...prev, ...curr }), {})
      : statement?.where;
    return Promise.resolve(
      Object.entries(whereStatement ?? {}).reduce((filteredFiles, [whereKey, whereValue]) => {
        return filteredFiles.filter((file) =>
          whereValue instanceof FindOperator
            ? (whereValue.value as number[]).includes(file[whereKey as keyof FileEntity] as number)
            : file[whereKey as keyof FileEntity] === whereValue,
        );
      }, files),
    );
  };

  const countFiles = async (statement: FindManyOptions<FileEntity> | undefined, users: FileEntity[]): Promise<number> => {
    const results = await findFiles(statement, users);
    return Promise.resolve(results.length);
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFilesHandler,
        {
          provide: getRepositoryToken(BucketEntity),
          useValue: {
            findOneBy: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(FileEntity),
          useValue: {
            find: vi.fn(),
            count: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(ConversationFileEntity),
          useValue: {
            findBy: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get(GetFilesHandler);
    bucketRepository = module.get<BucketRepository>(getRepositoryToken(BucketEntity));
    fileRepository = module.get<FileRepository>(getRepositoryToken(FileEntity));
    conversationFileRepository = module.get<ConversationFileRepository>(getRepositoryToken(ConversationFileEntity));
  });
  it('should return files for a general bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1 },
      { id: 2, userId: mockUserDifferent.id, bucketId: 1 },
      { id: 3, userId: mockUser.id, bucketId: 2 },
    ] as FileEntity[];

    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));
    vi.spyOn(conversationFileRepository, 'findBy').mockImplementation(() => Promise.resolve([]));
    vi.spyOn(bucketRepository, 'findOneBy').mockImplementation(() => Promise.resolve({ id: 1, type: 'general' } as BucketEntity));
    const command = new GetFiles({ user: mockUser, bucketIdOrType: 1, page: 0, pageSize: 10 });

    const response = await handler.execute(command);

    expect(response).toBeInstanceOf(GetFilesResponse);
    expect(response).toBeDefined();
    expect(response.total).toBe(2);
    expect(response.files).toHaveLength(2);
  });

  it('should return files for conversation bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1, conversations: [{ conversationId: 1, fileId: 1 }] },
      { id: 2, userId: mockUser.id, bucketId: 1, conversations: [{ conversationId: 2, fileId: 2 }] },
      { id: 3, userId: mockUserDifferent.id, bucketId: 1, conversations: [{ conversationId: 3, fileId: 3 }] },
      { id: 4, userId: mockUser.id, bucketId: 2, conversations: [{ conversationId: 1, fileId: 4 }] },
    ] as FileEntity[];

    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));
    vi.spyOn(conversationFileRepository, 'findBy').mockImplementation((query) => {
      const conversationId = (query as FindOptionsWhere<ConversationFileEntity>).conversationId;
      const result = files.filter((x) => x.conversations.find((y) => y.conversationId === conversationId));
      return Promise.resolve(result.flatMap((x) => x.conversations));
    });
    vi.spyOn(bucketRepository, 'findOneBy').mockImplementation(() =>
      Promise.resolve({ id: 1, type: 'conversation' } as BucketEntity),
    );
    const command = new GetFiles({ user: mockUser, bucketIdOrType: 1, page: 0, pageSize: 10 });

    const response = await handler.execute(command);

    expect(response).toBeInstanceOf(GetFilesResponse);
    expect(response).toBeDefined();
    expect(response.total).toBe(2);
    expect(response.files).toHaveLength(2);
    expect(response.files[0].id).toBe(1);
    expect(response.files[1].id).toBe(2);
  });

  it('should return files of user for conversation bucket and conversation id', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1, conversations: [{ conversationId: 1, fileId: 1 }] },
      { id: 2, userId: mockUser.id, bucketId: 1, conversations: [{ conversationId: 2, fileId: 2 }] },
      { id: 3, userId: mockUserDifferent.id, bucketId: 1, conversations: [{ conversationId: 3, fileId: 3 }] },
      { id: 4, userId: mockUser.id, bucketId: 2, conversations: [{ conversationId: 1, fileId: 4 }] },
    ] as FileEntity[];

    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));
    vi.spyOn(bucketRepository, 'findOneBy').mockImplementation(() =>
      Promise.resolve({ id: 1, type: 'conversation' } as BucketEntity),
    );
    vi.spyOn(conversationFileRepository, 'findBy').mockImplementation((query) => {
      const conversationId = (query as FindOptionsWhere<ConversationFileEntity>).conversationId;
      const result = files.filter((x) => x.conversations.find((y) => y.conversationId === conversationId));
      return Promise.resolve(result.flatMap((x) => x.conversations));
    });
    const command = new GetFiles({ user: mockUser, bucketIdOrType: 1, page: 0, pageSize: 10, conversationId: 1 });

    const response = await handler.execute(command);

    expect(response).toBeInstanceOf(GetFilesResponse);
    expect(response).toBeDefined();
    expect(response.total).toBe(2);
    expect(response.files).toHaveLength(2);
    expect(response.files[0].id).toBe(1);
    expect(response.files[1].id).toBe(4);
  });

  it('should return files of user for user bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1 },
      { id: 2, userId: mockUserDifferent.id, bucketId: 1 },
    ] as FileEntity[];

    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));
    vi.spyOn(bucketRepository, 'findOneBy').mockImplementation(() => Promise.resolve({ id: 1, type: 'user' } as BucketEntity));
    const command = new GetFiles({ user: mockUser, bucketIdOrType: 1, page: 0, pageSize: 10 });

    const response = await handler.execute(command);

    expect(response).toBeInstanceOf(GetFilesResponse);
    expect(response).toBeDefined();
    expect(response.total).toBe(1);
    expect(response.files).toHaveLength(1);
    expect(response.files[0].id).toBe(1);
  });

  it('should fail to find a user bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1 },
      { id: 2, userId: mockUserDifferent.id, bucketId: 1 },
    ] as FileEntity[];
    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));
    vi.spyOn(bucketRepository, 'findOneBy').mockImplementation(() => Promise.resolve(null));

    const command = new GetFiles({ user: mockUser, bucketIdOrType: 'user', page: 0, pageSize: 10 });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should fail to find a conversation bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1 },
      { id: 2, userId: mockUserDifferent.id, bucketId: 1 },
    ] as FileEntity[];
    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));

    const command = new GetFiles({ user: mockUser, bucketIdOrType: 'conversation', page: 0, pageSize: 10 });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should fail to find a general bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1 },
      { id: 2, userId: mockUserDifferent.id, bucketId: 1 },
    ] as FileEntity[];
    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));

    const command = new GetFiles({ user: mockUser, bucketIdOrType: 'general', page: 0, pageSize: 10 });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should return files for a user bucket', async () => {
    const files = [
      { id: 1, userId: mockUser.id, bucketId: 1 },
      { id: 2, userId: mockUserDifferent.id, bucketId: 1 },
      { id: 3, userId: mockUser.id, bucketId: 2 },
    ] as FileEntity[];

    vi.spyOn(fileRepository, 'count').mockImplementation((query) => countFiles(query, files));
    vi.spyOn(fileRepository, 'find').mockImplementation((query) => findFiles(query, files));
    vi.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce({ id: 1, type: 'user' } as BucketEntity);

    const command = new GetFiles({ user: mockUser, bucketIdOrType: 'user', page: 0, pageSize: 10 });
    const response = await handler.execute(command);
    expect(response).toBeInstanceOf(GetFilesResponse);
    expect(response.total).toBe(1);
    expect(response.files).toHaveLength(1);
    expect(response.files[0].id).toBe(1);
  });
});
