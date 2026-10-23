import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { LocalStrategy } from '../../domain/auth';
import { FormActionType } from '../../domain/chat';
import { CallbackService } from '../../domain/chat/services/callback-service';
import { User } from '../../domain/users';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';

describe('Confirm form requests', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let callbacks: CallbackService;
  let validate: jest.SpyInstance;

  const user: User = { id: '1', userGroupIds: ['1'], name: 'Test User', email: 'stuff@stuff.com' };
  const otherUser: User = { id: '2', userGroupIds: ['1'], name: 'Other User', email: 'other@stuff.com' };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    callbacks = app.get(CallbackService);
    validate = jest.spyOn(app.get(LocalStrategy), 'validate');
  });

  afterEach(() => {
    validate.mockResolvedValue(user);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  function confirm(conversationId: number, requestId: string, as: User) {
    validate.mockResolvedValue(as);
    return request(app.getHttpServer())
      .delete(`/conversations/${conversationId}/confirm/${requestId}`)
      .send({ action: 'accept' });
  }

  async function isPending(result: Promise<unknown>) {
    const marker = {};
    return (await Promise.race([result, new Promise((resolve) => setTimeout(() => resolve(marker), 50))])) === marker;
  }

  it('answers a pending request of the own conversation', async () => {
    const { id, result } = callbacks.form({ userId: user.id, conversationId: 10 });

    await confirm(10, id, user).expect(200);

    await expect(result).resolves.toEqual({ action: FormActionType.ACCEPT });
  });

  it('rejects answers of another user with 404', async () => {
    const { id, result } = callbacks.form({ userId: user.id, conversationId: 11 });

    await confirm(11, id, otherUser).expect(404);
    expect(await isPending(result)).toBe(true);

    callbacks.complete(id, { action: FormActionType.CANCEL });
  });

  it('rejects answers for another conversation with 404', async () => {
    const { id, result } = callbacks.form({ userId: user.id, conversationId: 12 });

    await confirm(13, id, user).expect(404);
    expect(await isPending(result)).toBe(true);

    callbacks.complete(id, { action: FormActionType.CANCEL });
  });

  it('rejects answers for unknown requests with 404', async () => {
    await confirm(14, 'unknown', user).expect(404);
  });
});
