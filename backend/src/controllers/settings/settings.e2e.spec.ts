import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { initAppWithDataBaseAndValidUser, logo } from '../../utils/testUtils.js';
import { SettingsDto } from './dtos/index.js';
import { SettingsController } from './settings.controller.js';

describe('Settings', () => {
  let controller: SettingsController;
  let app: INestApplication<Server>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(SettingsController);

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

  it('should add logo to settings', async () => {
    await request(app.getHttpServer())
      .post('/settings/logo')
      .attach('file', Buffer.from(logo), 'logo.svg')
      .expect(HttpStatus.CREATED);

    const response = await request(app.getHttpServer()).get('/settings/logo').expect(HttpStatus.OK);
    const buffer: Buffer = response.body as Buffer;

    expect(buffer.toString()).toBe(logo);
  });

  it('should add background logo to settings', async () => {
    await request(app.getHttpServer())
      .post('/settings/backgroundLogo')
      .attach('file', Buffer.from(logo), 'backgroundLogo.svg')
      .expect(HttpStatus.CREATED);

    const response = await request(app.getHttpServer()).get('/settings/backgroundLogo').expect(HttpStatus.OK);
    const buffer: Buffer = response.body as Buffer;

    expect(buffer.toString()).toBe(logo);
  });

  //TODO: only allow whitelisted properties
  it.skip('should not set non-whitelisted properties in settings', async () => {
    await request(app.getHttpServer())
      .post('/settings/')
      .attach('file', Buffer.from(logo), 'logo.svg')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should save settings', async () => {
    const siteLinks = [{ link: 'https://example.org', text: 'Impress' }];

    await request(app.getHttpServer())
      .post('/settings')
      .send({ siteLinks }) // Send JSON body here
      .expect(HttpStatus.CREATED);

    const result = await request(app.getHttpServer()).get('/settings').expect(HttpStatus.OK);
    const settings = result.body as SettingsDto;

    expect(settings.siteLinks).toEqual(siteLinks);
  });
});
