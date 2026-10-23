import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ChatUICallbackResult, FormActionType } from '../interfaces';

export type CallbackResult<T> = { id: string; result: Promise<T> };

/** The user and conversation a pending request belongs to. Only they are allowed to answer it. */
export type CallbackOwner = { userId: string; conversationId: number };

@Injectable()
export class CallbackService {
  private readonly results: Record<string, { created: number; result: Result; owner: CallbackOwner; timeout?: number }> = {};

  private getTime = () => new Date().getTime();

  constructor() {
    setInterval(() => this.cleanup(), 1000);
  }

  /**
   * Answers a pending request on behalf of a user.
   *
   * @returns false if there is no pending request with this ID for the given user and conversation.
   */
  answer(id: string, owner: CallbackOwner, result: ChatUICallbackResult): boolean {
    const stored = Object.prototype.hasOwnProperty.call(this.results, id) ? this.results[id] : undefined;

    if (!stored || stored.owner.userId !== owner.userId || stored.owner.conversationId !== owner.conversationId) {
      return false;
    }

    this.complete(id, result);
    return true;
  }

  /** Completes a pending request without any ownership checks. Only for internal use, e.g. to cancel it. */
  complete(id: string, result: ChatUICallbackResult) {
    const stored = this.results[id];

    if (!stored) {
      return;
    }

    stored.result.complete(result);
    delete this.results[id];
    return;
  }

  cleanup() {
    const time = this.getTime();

    for (const [id, stored] of Object.entries(this.results)) {
      const age = time - stored.created;

      if (age < (stored.timeout ?? TIMEOUT)) {
        continue;
      }

      stored.result.complete({ action: FormActionType.CANCEL });
      delete this.results[id];
    }
  }

  form(owner: CallbackOwner, timeout?: number): CallbackResult<ChatUICallbackResult> {
    return this.request(owner, timeout);
  }

  private request(owner: CallbackOwner, timeout?: number) {
    const requestId = randomUUID();
    const result = new Result();

    this.results[requestId] = { result, created: this.getTime(), owner, timeout };

    return { id: requestId, result: result.promise };
  }
}

const TIMEOUT = 5 * 60 * 1000;

class Result {
  private resolve?: (value: ChatUICallbackResult) => void;

  public promise = new Promise<any>((resolve) => {
    this.resolve = resolve;
  });

  public complete(result: ChatUICallbackResult) {
    this.resolve?.(result);
  }
}
