import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';
import { ConfigurationsController } from './configurations.controller.js';
import { BucketAvailabilityDto } from './dtos/index.js';

describe('Configurations', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let controller: ConfigurationsController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(ConfigurationsController);

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should return bucket availability for user bucket', async () => {
    const response = await request(app.getHttpServer()).get('/configurations/1/checkBucketAvailability/user').expect(200);

    const body = response.body as BucketAvailabilityDto;
    expect(body.extensions.length).toBe(0);
  });
});
