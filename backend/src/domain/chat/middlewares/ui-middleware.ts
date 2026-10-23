import { Injectable } from '@nestjs/common';
import { ExtensionArgument } from '../../extensions';
import { ChatContext, ChatMiddleware, ChatNextDelegate, ChatUI, FormActionType, GetContext } from '../interfaces';
import { CallbackService } from '../services/callback-service';

@Injectable()
export class UIMiddleware implements ChatMiddleware {
  order = -1000;

  constructor(private readonly callbacks: CallbackService) {}

  invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    context.ui = new ChatUIImpl(context, this.callbacks);
    return next(context);
  }
}

class ChatUIImpl implements ChatUI {
  constructor(
    private readonly context: ChatContext,
    private readonly callbacks: CallbackService,
  ) {}

  async form(text: string, schema: ExtensionArgument) {
    const { signal } = this.context.abort;
    if (signal.aborted) {
      return { action: FormActionType.CANCEL };
    }

    const { id, result } = this.callbacks.form({ userId: this.context.user.id, conversationId: this.context.conversationId });

    // When the generation is stopped, nobody can answer the form anymore.
    const onAbort = () => this.callbacks.complete(id, { action: FormActionType.CANCEL });
    signal.addEventListener('abort', onAbort, { once: true });

    this.context.result.next({
      type: 'ui',
      request: { id, text, schema },
    });

    try {
      return await result;
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }
}
