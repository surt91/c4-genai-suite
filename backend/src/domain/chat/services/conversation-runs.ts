import { Injectable } from '@nestjs/common';

type Run = { abort: AbortController; done: Promise<void> };

// How long to wait at most for a stopped run to finish (e.g. to persist the partial answer).
const WAIT_TIMEOUT_MS = 10_000;

/**
 * Tracks the running chat pipelines per conversation, so that a new message (or reading the history) right after
 * stopping a generation sees the persisted partial answer instead of racing with it.
 *
 * The registry is in memory, i.e. it only coordinates requests handled by the same backend instance.
 */
@Injectable()
export class ConversationRunsService {
  private readonly runs = new Map<number, Run>();

  /**
   * Registers a run. A new run of the same conversation stops the previous one, because a conversation can only have
   * one answer in progress (the UI only sends a new message after the previous answer was completed or stopped).
   * Resolves when the previous run has finished, so the new run can build on the persisted history.
   */
  async start(conversationId: number, abort: AbortController, done: Promise<void>): Promise<void> {
    const previous = this.runs.get(conversationId);

    const run = { abort, done: done.catch(() => {}) };
    this.runs.set(conversationId, run);
    void run.done.then(() => {
      if (this.runs.get(conversationId) === run) {
        this.runs.delete(conversationId);
      }
    });

    if (previous) {
      previous.abort.abort('superseded');
      await withTimeout(previous.done);
    }
  }

  /** Waits for a run of the conversation that has been stopped but is still finishing. */
  async waitForStopped(conversationId: number): Promise<void> {
    const run = this.runs.get(conversationId);
    if (run?.abort.signal.aborted) {
      await withTimeout(run.done);
    }
  }
}

function withTimeout(promise: Promise<void>) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, WAIT_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
