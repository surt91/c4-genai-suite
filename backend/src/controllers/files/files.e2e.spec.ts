import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { ConfigurationEntity, ConfigurationStatus, ConversationEntity, MessageEntity } from '../../domain/database/index.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';

vi.mock('../../domain/files/use-cases/generated/sdk.gen.js', () => {
  return {
    FilesApi: vi.fn().mockImplementation(function () {
      return {
        uploadFile: vi.fn(),
        getFileTypes: vi.fn(() => {
          return { items: [{ file_name_extension: 'txt' }] };
        }),
        deleteFile: vi.fn(),
      };
    }),
  };
});

describe('Files', () => {
  let app: INestApplication<Server>;
  let existingConversationId: number;
  let existingMessageId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const initialized = await initAppWithDataBaseAndValidUser(module);
    app = initialized.app;
    const message = await seedTestData(initialized.dataSource, initialized.user.id);
    existingConversationId = message.conversationId;
    existingMessageId = message.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Document content', () => {
    it('should return document not found when documentId is missing', async () => {
      const response = await request(app.getHttpServer())
        .get(`/conversations/${existingConversationId}/messages/${existingMessageId}/documents/0/chunks`)
        .expect(HttpStatus.NOT_FOUND);
      const body = response.body as { message: string[] };
      expect(body).toBeDefined();
      expect(body.message).toBe('Cannot find a document with uri 0 for this user');
    });

    it('should return message not found when messageId is missing', async () => {
      const documentUri = '1';
      const response = await request(app.getHttpServer())
        .get(`/conversations/${existingConversationId}/messages/0/documents/${documentUri}/chunks`)
        .expect(HttpStatus.NOT_FOUND);
      const body = response.body as { message: string[] };
      expect(body).toBeDefined();
      expect(body.message).toBe('Cannot find a message with id 0 for this user');
    });

    it('should return document not found if document does not exist', async () => {
      const notExistingDocumentId = 2;
      const response = await request(app.getHttpServer())
        .get(`/conversations/${existingConversationId}/messages/${existingMessageId}/documents/${notExistingDocumentId}/chunks`)
        .expect(HttpStatus.NOT_FOUND);
      const body = response.body as { message: string[] };
      expect(body).toBeDefined();
      expect(body.message).toBe(`Cannot find a document with uri 2 for this user`);
    });

    it('should return document content for chunk ids', async () => {
      const documentUri = '1';
      const response = await request(app.getHttpServer())
        .get(`/conversations/${existingConversationId}/messages/${existingMessageId}/documents/${documentUri}/chunks`)
        .expect(200);

      const body = response.body as string[];
      expect(body).toBeDefined();
      expect(body).toHaveLength(2);
      expect(body).toEqual(['content1', 'content2']);
    });
  });

  describe('Bucket and file operations', () => {
    beforeAll(clean);
    afterAll(clean);

    it('should create bucket', async () => {
      const bucket = await createBucket();
      expect(bucket.id).toBeGreaterThan(0);
    });

    it('should not upload invalid file', async () => {
      const bucket = await createBucket();

      const fileContent = 'This is a sample text file for testing purposes.';
      const buffer = Buffer.from(fileContent, 'utf8');
      const fileName = 'testfile.pdf';

      const response = await request(app.getHttpServer())
        .post(`/buckets/${bucket.id}/files`)
        .set('Content-Type', 'multipart/form-data')
        .attach('file', buffer, fileName)
        .expect(400);

      const body = response.body as { message: string; statusCode: number };

      expect(body.message).toBe('File type not supported.');
      expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should upload file', async () => {
      const bucket = await createBucket();

      const body = await uploadFile(bucket.id, 'Test', 'file.txt');
      expect(body.id).toBeGreaterThan(0);
      expect(body.fileName).toBe('file.txt');

      const files = await getFileList(bucket.id);
      expect(files.items.length).toBe(1);
    });

    it('should get file list', async () => {
      const bucket = await createBucket();
      const file1 = await uploadFile(bucket.id, 'Test', 'file1.txt');
      const file2 = await uploadFile(bucket.id, 'Test', 'file2.txt');

      const files = await getFileList(bucket.id);
      expect(files.items.length).toBe(2);
      expect(files.items[0].id).toBe(file1.id);
      expect(files.items[0].fileName).toBe(file1.fileName);
      expect(files.items[1].id).toBe(file2.id);
      expect(files.items[1].fileName).toBe(file2.fileName);
    });

    it('should delete file', async () => {
      const bucket = await createBucket();
      const { id: fileId } = await uploadFile(bucket.id);

      await request(app.getHttpServer()).delete(`/buckets/${bucket.id}/files/${fileId}`).expect(200);

      const files = await getFileList(bucket.id);
      expect(files.items.length).toBe(0);
    });

    async function getFileList(bucketId: number) {
      const response = await request(app.getHttpServer()).get(`/buckets/${bucketId}/files`).expect(200);

      return response.body as { items: { id: number; fileName: string }[] };
    }

    async function uploadFile(
      bucketId: number,
      fileContent = 'This is a sample text file for testing purposes.',
      fileName = 'testfile.txt',
    ) {
      const buffer = Buffer.from(fileContent, 'utf8');

      const response = await request(app.getHttpServer())
        .post(`/buckets/${bucketId}/files`)
        .set('Content-Type', 'multipart/form-data')
        .attach('file', buffer, fileName)
        .expect(201);
      return response.body as { id: number; fileName: string };
    }

    async function createBucket(name = `files-bucket-${Date.now()}`) {
      const newBucket = {
        name,
        endpoint: 'http://reis:3201',
        allowedFileNameExtensions: ['txt'],
        isDefault: false,
        type: 'general',
      };

      const response = await request(app.getHttpServer()).post('/buckets').send(newBucket).expect(201);
      return response.body as { id: number };
    }

    async function clean() {
      const buckets = await getBuckets();
      for (const bucket of buckets.items) {
        await deleteBucket(bucket.id);
      }
    }

    async function getBuckets() {
      const response = await request(app.getHttpServer()).get(`/buckets`).expect(200);
      return response.body as { items: { id: number }[] };
    }

    async function deleteBucket(id: number) {
      await request(app.getHttpServer()).delete(`/buckets/${id}`).expect(200);
    }
  });
});

async function seedTestData(dataSource: DataSource, userId: string) {
  const configuration = await dataSource
    .getRepository(ConfigurationEntity)
    .save({ name: 'Files', status: ConfigurationStatus.ENABLED });
  const conversation = await dataSource.getRepository(ConversationEntity).save({ configurationId: configuration.id, userId });

  const message = new MessageEntity();
  message.conversationId = conversation.id;
  message.configurationId = configuration.id;
  message.data = { content: 'empty' };
  message.type = 'ai';
  // the document uri is not a database id
  message.sources = [
    {
      extensionExternalId: '',
      title: '',
      document: { uri: '1', mimeType: 'text/plain' },
      chunk: { uri: '1', content: 'content1', pages: [], score: 0 },
    },
    {
      extensionExternalId: '',
      title: '',
      document: { uri: '1', mimeType: 'text/plain' },
      chunk: { uri: '1', content: 'content2', pages: [], score: 0 },
    },
  ];
  return dataSource.getRepository(MessageEntity).save(message);
}
