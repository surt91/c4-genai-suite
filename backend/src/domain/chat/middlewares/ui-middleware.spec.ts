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
    const context = { abort: new AbortController(), result: new ReplaySubject<StreamEvent>() } as unknown as ChatContext;
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
    callbacks.complete(request!.type === 'ui' ? request!.request.id : '', { action: FormActionType.ACCEPT, data: { a: 1 } });

    await expect(result).resolves.toEqual({ action: FormActionType.ACCEPT, data: { a: 1 } });
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
