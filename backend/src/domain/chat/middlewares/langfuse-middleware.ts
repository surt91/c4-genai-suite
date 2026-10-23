import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getLangfuseConfig } from '../../../metrics/langfuse.js';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../index.js';
import { ExecuteMiddleware } from './execute-middleware.js';

@Injectable()
export class LangfuseMiddleware implements ChatMiddleware {
  order = ExecuteMiddleware.ORDER - 1;

  constructor(private configService: ConfigService) {}

  async invoke(context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> {
    if (getLangfuseConfig(this.configService)) {
      context.telemetry = true;
    }

    return next(context);
  }
}
