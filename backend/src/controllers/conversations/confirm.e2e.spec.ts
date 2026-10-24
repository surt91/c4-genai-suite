import { randomUUID } from 'crypto';
import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { MockInstance } from 'vitest';
import { AppModule } from '../../app.module.js';
import { LocalStrategy } from '../../domain/auth/index.js';
import { FormActionType } from '../../domain/chat/index.js';
import { CallbackService } from '../../domain/chat/services/callback-service.js';
import { User } from '../../domain/users/index.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';

describe('Confirm form requests', () => {
  let app: INestApplication<Server>;
  let callbacks: CallbackService;
  let validate: MockInstance;

  let user: User;
  const otherUser: User = { id: randomUUID(), userGroupIds: [], name: 'Other User', email: 'other@example.com' };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    ({ app, user } = await initAppWithDataBaseAndValidUser(module));
    callbacks = app.get(CallbackService);
    validate = vi.spyOn(app.get(LocalStrategy), 'validate');
  });

  afterEach(() => {
    validate.mockResolvedValue(user);
  });

  afterAll(async () => {
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
