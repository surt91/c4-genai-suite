import { I18nService } from '../../../localization/i18n.service.js';
import { UsageRepository, UserGroupRepository } from '../../database/index.js';
import { ChatContext, ChatError } from '../interfaces.js';
import { CheckUsageMiddleware } from './check-usage-middleware.js';
import { ExceptionMiddleware } from './exception-middleware.js';

describe(CheckUsageMiddleware.name, () => {
  const i18n = { t: (key: string) => key } as unknown as I18nService;
  const context = { user: { id: 'u', userGroupIds: ['limited'] } } as unknown as ChatContext;

  function create(sum: number, group: { monthlyTokens?: number; monthlyUserTokens?: number }) {
    const usages = { sum: vi.fn().mockResolvedValue(sum) };
    const userGroups = { findOneBy: vi.fn().mockResolvedValue({ id: 'limited', ...group }) };
    const sut = new CheckUsageMiddleware(
      userGroups as unknown as UserGroupRepository,
      usages as unknown as UsageRepository,
      i18n,
    );
    return { sut, usages };
  }

  it('runs inside the exception middleware, so that the limit error reaches the user', () => {
    const { sut } = create(0, {});
    expect(sut.order).toBeGreaterThan(ExceptionMiddleware.ORDER);
  });

  it('rejects with a chat error when the user limit is reached', async () => {
    const { sut } = create(100, { monthlyUserTokens: 100 });
    const next = vi.fn();

    await expect(sut.invoke(context, () => context, next)).rejects.toEqual(new ChatError('texts.chat.errorTokenLimitUser'));
    expect(next).not.toHaveBeenCalled();
  });

  it('only sums token usages, not ratings', async () => {
    const { sut, usages } = create(0, { monthlyTokens: 100, monthlyUserTokens: 100 });
    const next = vi.fn().mockResolvedValue(true);

    await sut.invoke(context, () => context, next);

    expect(next).toHaveBeenCalled();
    expect(usages.sum).toHaveBeenCalledTimes(2);
    for (const [, where] of usages.sum.mock.calls) {
      expect(where).toMatchObject({ counter: 'token_usage' });
    }
  });
});
