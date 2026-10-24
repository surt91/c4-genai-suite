import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../domain/database/index.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';
import { TranscriptionController } from './transcription.controller.js';

// Mock the Azure provider
vi.mock('../../domain/transcription/providers/azure-provider.js', () => {
  return {
    AzureTranscriptionProvider: vi.fn().mockImplementation(function () {
      return {
        transcribe: vi.fn().mockResolvedValue('This is a mocked transcription result'),
      };
    }),
  };
});

describe('Transcription', () => {
  let app: INestApplication<Server>;
  let controller: TranscriptionController;
  let extensionId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(TranscriptionController);

    const initialized = await initAppWithDataBaseAndValidUser(module);
    app = initialized.app;
    extensionId = await createTranscribeExtension(initialized.dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should transcribe audio file successfully', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    const response = await request(app.getHttpServer())
      .post(`/transcription?extensionId=${extensionId}`)
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.CREATED);

    expect(response.body).toHaveProperty('text');
    expect((response.body as { text: string }).text).toBe('This is a mocked transcription result');
  });

  it('should return 400 when no audio file is provided', async () => {
    await request(app.getHttpServer())
      .post(`/transcription?extensionId=${extensionId}`)
      .set('Content-Type', 'multipart/form-data')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 400 when extensionId is missing', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    await request(app.getHttpServer())
      .post('/transcription')
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 400 when extensionId is invalid', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    await request(app.getHttpServer())
      .post('/transcription?extensionId=invalid')
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 404 when extension does not exist', async () => {
    const nonExistentExtensionId = 99999;
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    await request(app.getHttpServer())
      .post(`/transcription?extensionId=${nonExistentExtensionId}`)
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.NOT_FOUND);
  });
});

async function createTranscribeExtension(dataSource: DataSource): Promise<number> {
  const configuration = await dataSource
    .getRepository(ConfigurationEntity)
    .save({ name: 'Test Configuration', status: ConfigurationStatus.ENABLED });

  const extensionRepo = dataSource.getRepository(ExtensionEntity);
  const extension = extensionRepo.create({
    name: 'transcribe-azure',
    enabled: true,
    configuration,
    values: {
      apiKey: 'test-api-key',
      instanceName: 'test-instance',
      deploymentName: 'whisper',
      apiVersion: '2024-06-01',
    },
  });

  const saved = await extensionRepo.save(extension);
  return saved.id;
}
