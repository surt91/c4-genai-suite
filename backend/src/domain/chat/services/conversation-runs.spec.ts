import { ConversationRunsService } from './conversation-runs';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe(ConversationRunsService.name, () => {
  it('stops the previous run of the same conversation and waits until it is finished', async () => {
    const runs = new ConversationRunsService();
    const first = { abort: new AbortController(), done: deferred() };
    await runs.start(1, first.abort, first.done.promise);

    let started = false;
    const second = runs.start(1, new AbortController(), new Promise(() => {})).then(() => (started = true));
    await Promise.resolve();

    expect(first.abort.signal.aborted).toBe(true);
    expect(started).toBe(false);

    first.done.resolve();
    await second;
    expect(started).toBe(true);
  });

  it('does not stop runs of other conversations', async () => {
    const runs = new ConversationRunsService();
    const first = new AbortController();
    await runs.start(1, first, new Promise(() => {}));
    await runs.start(2, new AbortController(), new Promise(() => {}));

    expect(first.signal.aborted).toBe(false);
  });

  it('waits for stopped runs only', async () => {
    const runs = new ConversationRunsService();
    const abort = new AbortController();
    const done = deferred();
    await runs.start(1, abort, done.promise);

    // a running (not stopped) answer does not block reading the history
    await runs.waitForStopped(1);

    abort.abort();
    let waited = false;
    const wait = runs.waitForStopped(1).then(() => (waited = true));
    await Promise.resolve();
    expect(waited).toBe(false);

    done.resolve();
    await wait;
    expect(waited).toBe(true);
  });

  it('forgets finished runs', async () => {
    const runs = new ConversationRunsService();
    const abort = new AbortController();
    const done = deferred();
    await runs.start(1, abort, done.promise);
    done.resolve();
    await done.promise;
    await Promise.resolve();

    // a new run does not abort the finished one
    await runs.start(1, new AbortController(), new Promise(() => {}));
    expect(abort.signal.aborted).toBe(false);
  });
});
