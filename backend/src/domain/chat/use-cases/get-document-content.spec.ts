import { NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageEntity, MessageRepository } from '../../database/index.js';
import { User } from '../../users/index.js';
import { Source } from '../index.js';
import { GetDocumentContent, GetDocumentContentHandler, GetDocumentContentResponse } from './get-document-content.js';

describe('Get Document Content', () => {
  let messageRepository: MessageRepository;
  let handler: GetDocumentContentHandler;

  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    userGroupIds: ['group1'],
  };

  beforeAll(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDocumentContentHandler,
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: {
            findOne: vi.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {} as QueryBus,
        },
      ],
    }).compile();

    handler = module.get(GetDocumentContentHandler);
    messageRepository = module.get<MessageRepository>(getRepositoryToken(MessageEntity));
  });

  it('should return document content for valid user, message and document', async () => {
    const conversationId = 1;
    const messageId = 1;
    const documentUri = 's5q://foo.bar';
    const mockMessage = {
      id: messageId,
      sources: [
        { document: { uri: documentUri }, chunk: { content: 'chunk1' } },
        { document: { uri: documentUri }, chunk: { content: 'chunk2' } },
      ] as Source[],
      conversation: {
        userId: mockUser.id,
      },
    } as MessageEntity;

    vi.spyOn(messageRepository, 'findOne').mockResolvedValueOnce(mockMessage);

    const command = new GetDocumentContent(mockUser, conversationId, messageId, documentUri);
    const result = await handler.execute(command);
    expect(result).toEqual(new GetDocumentContentResponse(['chunk1', 'chunk2']));
  });

  it('should throw not found exception if message not found', async () => {
    const conversationId = 1;
    const messageId = 1;
    const documentUri = 's5q://foo.bar';
    vi.spyOn(messageRepository, 'findOne').mockResolvedValueOnce(null);
    const command = new GetDocumentContent(mockUser, conversationId, messageId, documentUri);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw not found exception if user is not allowed', async () => {
    const conversationId = 1;
    const messageId = 1;
    const documentUri = 's5q://foo.bar';
    const mockMessage = {
      id: messageId,
      sources: [
        { document: { uri: documentUri }, chunk: { content: 'chunk1' } },
        { document: { uri: documentUri }, chunk: { content: 'chunk2' } },
      ] as Source[],
    } as MessageEntity;

    vi.spyOn(messageRepository, 'findOne').mockResolvedValueOnce(mockMessage);

    const command = new GetDocumentContent(mockUser, conversationId, messageId, documentUri);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
