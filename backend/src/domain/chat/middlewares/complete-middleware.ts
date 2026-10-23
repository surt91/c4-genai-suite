import { Injectable } from '@nestjs/common';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces.js';

@Injectable()
export class CompleteMiddleware implements ChatMiddleware {
  order = Number.MIN_VALUE;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    try {
      await next(context);
    } finally {
      context.result.next({
        type: 'completed',
        metadata: {
          tokenCount: context.tokenUsage?.tokenCount ?? 0,
        },
      });
    }
  }
}
