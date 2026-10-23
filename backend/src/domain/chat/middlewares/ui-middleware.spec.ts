import { ReplaySubject } from 'rxjs';
import { ChatContext, ChatInteraction, FormActionType, StreamEvent } from '../interfaces';
import { CallbackService } from '../services/callback-service';
import { UIMiddleware, validateUrl, withoutSecrets } from './ui-middleware';

describe(UIMiddleware.name, () => {
  let callbacks: CallbackService;

  beforeEach(() => {
    jest.useFakeTimers();
    callbacks = new CallbackService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  let interactions: Map<string, ChatInteraction>;

  async function createContext() {
    interactions = new Map();
    const context = {
      abort: new AbortController(),
      result: new ReplaySubject<StreamEvent>(),
      user: { id: 'user1' },
      conversationId: 7,
      history: { setInteraction: (x: ChatInteraction) => interactions.set(x.id, x) },
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

  it('reports and stores the result of a form without secrets', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));
    const secretSchema = {
      type: 'object' as const,
      title: 'Login',
      properties: {
        user: { type: 'string' as const, title: 'User' },
        password: { type: 'string' as const, title: 'Password', format: 'password' as const },
      },
    };

    const result = context.ui.form('Log in?', secretSchema, { source: 'Calendar' });
    const request = events.find((x) => x.type === 'ui');
    const id = request?.type === 'ui' ? request.request.id : '';
    expect(request).toMatchObject({ request: { kind: 'form', source: 'Calendar' } });

    callbacks.answer(
      id,
      { userId: 'user1', conversationId: 7 },
      { action: FormActionType.ACCEPT, data: { user: 'a', password: 'b' } },
    );
    await expect(result).resolves.toEqual({ action: FormActionType.ACCEPT, data: { user: 'a', password: 'b' } });

    expect(events).toContainEqual({ type: 'ui_update', update: { id, status: 'accepted', data: { user: 'a' } } });
    expect(interactions.get(id)).toMatchObject({ kind: 'form', status: 'accepted', source: 'Calendar', data: { user: 'a' } });
  });

  it('marks a form as expired after the timeout', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));

    const result = context.ui.form('Are you sure?', schema);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    await result;

    expect(events.find((x) => x.type === 'ui_update')).toMatchObject({ update: { status: 'expired' } });
  });

  it('opens an URL only after the consent and waits for the completion', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));

    const opened = context.ui.openUrl({
      text: 'Please log in',
      url: 'https://login.example.com/authorize?token=secret',
      elicitationId: 'e1',
      source: 'Calendar',
    });

    const request = events.find((x) => x.type === 'ui');
    expect(request).toMatchObject({
      request: { kind: 'url', domain: 'login.example.com', domainAllowed: false, source: 'Calendar' },
    });
    const id = request?.type === 'ui' ? request.request.id : '';

    callbacks.answer(id, { userId: 'user1', conversationId: 7 }, { action: FormActionType.ACCEPT });
    const { action, completion } = await opened;
    expect(action).toBe(FormActionType.ACCEPT);
    expect(interactions.get(id)).toMatchObject({ status: 'opened', url: 'https://login.example.com/authorize' });

    context.ui.completeUrl('e1');
    await expect(completion).resolves.toBe('completed');
    expect(events.filter((x) => x.type === 'ui_update').map((x) => (x.type === 'ui_update' ? x.update.status : ''))).toEqual([
      'opened',
      'completed',
    ]);
    // the query (which can contain tokens) is never stored
    expect(JSON.stringify([...interactions.values()])).not.toContain('secret');
  });

  it('blocks URLs of other domains than the allowed ones', async () => {
    const context = await createContext();
    const events: StreamEvent[] = [];
    context.result.subscribe((event) => events.push(event));

    const { action } = await context.ui.openUrl({
      text: 'Open',
      url: 'https://evil.example.org',
      allowedDomains: ['example.com'],
    });

    expect(action).toBe(FormActionType.CANCEL);
    expect(events.find((x) => x.type === 'ui')).not.toHaveProperty('request.url');
    expect(events.find((x) => x.type === 'ui_update')).toMatchObject({ update: { status: 'blocked' } });
  });

  it('validates URLs', () => {
    expect(validateUrl('https://a.example.com/x', ['example.com'])).toMatchObject({ domain: 'a.example.com', allowed: true });
    expect(validateUrl('https://example.com.evil.org', ['example.com'])).toEqual({ error: 'domain' });
    expect(validateUrl('http://example.com')).toEqual({ error: 'protocol' });
    expect(validateUrl('javascript:alert(1)')).toEqual({ error: 'protocol' });
    expect(validateUrl('http://localhost:4300/login', undefined, false)).toMatchObject({ domain: 'localhost' });
    expect(validateUrl('http://localhost:4300/login', undefined, true)).toEqual({ error: 'protocol' });
    expect(validateUrl('https://user:pw@example.com')).toEqual({ error: 'credentials' });
    expect(validateUrl('https://bücher.example/')).toMatchObject({ domain: 'xn--bcher-kva.example' });
    expect(validateUrl('not an url')).toEqual({ error: 'invalid' });
  });

  it('removes secrets from form answers', () => {
    const secretSchema = {
      type: 'object' as const,
      title: '',
      properties: {
        a: { type: 'string' as const, title: 'a', format: 'password' as const },
        b: { type: 'number' as const, title: 'b' },
      },
    };
    expect(withoutSecrets(secretSchema, { a: 'x', b: 1 })).toEqual({ b: 1 });
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
