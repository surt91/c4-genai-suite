import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { getLangfuseConfig } from 'src/metrics/langfuse';
import { ExecuteMiddleware } from './execute-middleware';

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
