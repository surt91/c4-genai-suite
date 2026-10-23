import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addMonths, startOfMonth } from 'date-fns';
import { And, LessThan, MoreThanOrEqual } from 'typeorm';
import { I18nService } from '../../../localization/i18n.service.js';
import {
  BUILTIN_USER_GROUP_ADMIN,
  BUILTIN_USER_GROUP_DEFAULT,
  UsageEntity,
  UsageRepository,
  UserGroupEntity,
  UserGroupRepository,
} from '../../database/index.js';
import { ChatContext, ChatError, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces.js';
import { ExceptionMiddleware } from './exception-middleware.js';

/** Usage rows with this counter are token counts (see StoreUsageMiddleware); other counters are e.g. ratings. */
const TOKEN_USAGE_COUNTER = 'token_usage';

@Injectable()
export class CheckUsageMiddleware implements ChatMiddleware {
  // Must run inside the ExceptionMiddleware, otherwise the limit error becomes a generic internal error.
  order = ExceptionMiddleware.ORDER + 1;

  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,

    @InjectRepository(UsageEntity)
    private readonly usages: UsageRepository,

    private readonly i18n: I18nService,
  ) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const user = context.user;

    if (
      Array.isArray(user.userGroupIds) &&
      (user.userGroupIds.includes(BUILTIN_USER_GROUP_ADMIN) || user.userGroupIds.includes(BUILTIN_USER_GROUP_DEFAULT))
    ) {
      await next(context);
      return;
    }

    // For now, use the first group for quota checks (could be extended to check all groups)
    const userGroupId = Array.isArray(user.userGroupIds) && user.userGroupIds.length > 0 ? user.userGroupIds[0] : undefined;
    if (!userGroupId) {
      await next(context);
      return;
    }
    const userGroup = await this.userGroups.findOneBy({ id: userGroupId });
    const monthlyTokens = userGroup?.monthlyTokens ?? 0;
    const monthlyUserTokens = userGroup?.monthlyUserTokens ?? 0;

    if (!userGroup || (monthlyTokens < 0 && monthlyUserTokens < 0)) {
      await next(context);
      return;
    }

    const dateFrom = startOfMonth(new Date());
    const dateTo = addMonths(dateFrom, 1);

    if (monthlyTokens > 0) {
      const groupUsage =
        (await this.usages.sum('count', {
          date: And(MoreThanOrEqual(dateFrom), LessThan(dateTo)),
          userGroup: userGroupId,
          counter: TOKEN_USAGE_COUNTER,
        })) ?? 0;

      if (groupUsage >= monthlyTokens) {
        throw new ChatError(this.i18n.t('texts.chat.errorTokenLimitUserGroup'));
      }
    }

    if (monthlyUserTokens > 0) {
      const groupUsage =
        (await this.usages.sum('count', {
          date: And(MoreThanOrEqual(dateFrom), LessThan(dateTo)),
          userId: user.id,
          counter: TOKEN_USAGE_COUNTER,
        })) ?? 0;

      if (groupUsage >= monthlyUserTokens) {
        throw new ChatError(this.i18n.t('texts.chat.errorTokenLimitUser'));
      }
    }

    await next(context);
  }
}
