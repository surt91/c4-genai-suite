import { ReplaySubject } from 'rxjs';
import { ChatContext, FormActionType, StreamEvent } from '../interfaces';
import { CallbackService } from '../services/callback-service';
import { UIMiddleware } from './ui-middleware';

describe(UIMiddleware.name, () => {
  let callbacks: CallbackService;

  beforeEach(() => {
    jest.useFakeTimers();
    callbacks = new CallbackService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function createContext() {
    const context = {
      abort: new AbortController(),
      result: new ReplaySubject<StreamEvent>(),
      user: { id: 'user1' },
      conversationId: 7,
    } as unknown as ChatContext;
    await new UIMiddleware(callbacks).invoke(
      context,
      () => context,
      () => Promise.resolve(),
    );
    return context;
  }

  const schema = { type: 'object' as const, title: 'Confirm', properties: {} };

  it('resolves the form with the answer of the user', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));

    const result = context.ui.form('Are you sure?', schema);

    const request = events.find((x) => x.type === 'ui');
    expect(request).toBeDefined();
    const answered = callbacks.answer(
      request!.type === 'ui' ? request!.request.id : '',
      { userId: 'user1', conversationId: 7 },
      { action: FormActionType.ACCEPT, data: { a: 1 } },
    );

    expect(answered).toBe(true);
    await expect(result).resolves.toEqual({ action: FormActionType.ACCEPT, data: { a: 1 } });
  });

  it('does not accept answers from other users or conversations', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));

    const result = context.ui.form('Are you sure?', schema);
    let resolved = false;
    void result.then(() => (resolved = true));

    const request = events.find((x) => x.type === 'ui');
    const id = request!.type === 'ui' ? request!.request.id : '';

    expect(callbacks.answer(id, { userId: 'user2', conversationId: 7 }, { action: FormActionType.ACCEPT })).toBe(false);
    expect(callbacks.answer(id, { userId: 'user1', conversationId: 8 }, { action: FormActionType.ACCEPT })).toBe(false);
    expect(callbacks.answer('unknown', { userId: 'user1', conversationId: 7 }, { action: FormActionType.ACCEPT })).toBe(false);
    await Promise.resolve();
    expect(resolved).toBe(false);

    // the owner can still answer it
    expect(callbacks.answer(id, { userId: 'user1', conversationId: 7 }, { action: FormActionType.REJECT })).toBe(true);
    await expect(result).resolves.toEqual({ action: FormActionType.REJECT });

    // and only once
    expect(callbacks.answer(id, { userId: 'user1', conversationId: 7 }, { action: FormActionType.ACCEPT })).toBe(false);
  });

  it('cancels a pending form after the timeout', async () => {
    const context = await createContext();

    const result = context.ui.form('Are you sure?', schema);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

    await expect(result).resolves.toEqual({ action: FormActionType.CANCEL });
  });

  it('cancels a pending form when the generation is stopped', async () => {
    const context = await createContext();

    const result = context.ui.form('Are you sure?', schema);
    context.abort.abort('cancelled');

    await expect(result).resolves.toEqual({ action: FormActionType.CANCEL });
  });

  it('does not show a form after the generation has been stopped', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));
    context.abort.abort('cancelled');

    await expect(context.ui.form('Are you sure?', schema)).resolves.toEqual({ action: FormActionType.CANCEL });
    expect(events).toEqual([]);
  });
});
