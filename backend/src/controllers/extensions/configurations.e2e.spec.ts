import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module.js';
import { ConfigurationEntity, ConfigurationStatus } from '../../domain/database/index.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';
import { ConfigurationsController } from './configurations.controller.js';
import { BucketAvailabilityDto } from './dtos/index.js';

describe('Configurations', () => {
  let app: INestApplication<Server>;
  let controller: ConfigurationsController;
  let configurationId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(ConfigurationsController);

    const initialized = await initAppWithDataBaseAndValidUser(module);
    app = initialized.app;
    const configuration = await initialized.dataSource
      .getRepository(ConfigurationEntity)
      .save({ name: 'Configurations', status: ConfigurationStatus.ENABLED });
    configurationId = configuration.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should return bucket availability for user bucket', async () => {
    const response = await request(app.getHttpServer())
      .get(`/configurations/${configurationId}/checkBucketAvailability/user`)
      .expect(200);

    const body = response.body as BucketAvailabilityDto;
    expect(body.extensions.length).toBe(0);
  });
});
