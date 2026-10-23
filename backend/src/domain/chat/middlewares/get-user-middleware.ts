import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUser, GetUserResponse } from '../../users/index.js';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces.js';

@Injectable()
export class GetUserMiddleware implements ChatMiddleware {
  constructor(private readonly queryBus: QueryBus) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    if (context.user) {
      const { user }: GetUserResponse = await this.queryBus.execute(new GetUser(context.user.id));

      if (user) {
        context.user = { ...context.user, ...user };
      }
    }

    await next(context);
  }
}
