import { UsageRepository, UserGroupRepository } from 'src/domain/database';
import { I18nService } from '../../../localization/i18n.service';
import { ChatContext, ChatError } from '../interfaces';
import { CheckUsageMiddleware } from './check-usage-middleware';
import { ExceptionMiddleware } from './exception-middleware';

describe(CheckUsageMiddleware.name, () => {
  const i18n = { t: (key: string) => key } as unknown as I18nService;
  const context = { user: { id: 'u', userGroupIds: ['limited'] } } as unknown as ChatContext;

  function create(sum: number, group: { monthlyTokens?: number; monthlyUserTokens?: number }) {
    const usages = { sum: jest.fn().mockResolvedValue(sum) };
    const userGroups = { findOneBy: jest.fn().mockResolvedValue({ id: 'limited', ...group }) };
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
    const next = jest.fn();

    await expect(sut.invoke(context, () => context, next)).rejects.toEqual(new ChatError('texts.chat.errorTokenLimitUser'));
    expect(next).not.toHaveBeenCalled();
  });

  it('only sums token usages, not ratings', async () => {
    const { sut, usages } = create(0, { monthlyTokens: 100, monthlyUserTokens: 100 });
    const next = jest.fn().mockResolvedValue(true);

    await sut.invoke(context, () => context, next);

    expect(next).toHaveBeenCalled();
    expect(usages.sum).toHaveBeenCalledTimes(2);
    for (const [, where] of usages.sum.mock.calls) {
      expect(where).toMatchObject({ counter: 'token_usage' });
    }
  });
});
