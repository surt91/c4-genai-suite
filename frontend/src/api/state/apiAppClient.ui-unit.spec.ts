import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppClient } from './apiAppClient';
import { ResponseError } from './errors';

describe('StreamApi.streamPrompt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const client = new AppClient('http://server');

  function mockSse(body: string) {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } })));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  function observer() {
    return { next: vi.fn(), error: vi.fn(), complete: vi.fn() };
  }

  it('posts new messages and emits parsed events before completing', async () => {
    const fetchMock = mockSse('id: 1\nevent: message\ndata: {"type":"chunk"}\n\nid: 2\ndata: {"type":"completed"}\n\n');
    const handlers = observer();

    client.stream.streamPrompt(1, { query: 'hi' }, undefined, handlers);
    await vi.waitFor(() => expect(handlers.complete).toHaveBeenCalledOnce());

    expect(handlers.next.mock.calls).toEqual([[{ type: 'chunk' }], [{ type: 'completed' }]]);
    expect(handlers.error).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://server/api/conversations/1/messages/sse',
      expect.objectContaining({ method: 'POST', credentials: 'include', body: '{"query":"hi"}' }),
    );
  });

  it('puts edited messages', async () => {
    const fetchMock = mockSse('');
    const handlers = observer();

    client.stream.streamPrompt(1, { query: 'hi' }, 5, handlers);
    await vi.waitFor(() => expect(handlers.complete).toHaveBeenCalledOnce());

    expect(fetchMock).toHaveBeenCalledWith(
      'http://server/api/conversations/1/messages/5/sse',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('reports errors once and does not complete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Failed to fetch'))),
    );
    const handlers = observer();

    client.stream.streamPrompt(1, { query: 'hi' }, undefined, handlers);
    await vi.waitFor(() => expect(handlers.error).toHaveBeenCalledOnce());

    expect(handlers.error).toHaveBeenCalledWith(new Error('Failed to fetch'));
    expect(handlers.complete).not.toHaveBeenCalled();
  });

  it('stops emitting after unsubscribe', async () => {
    const fetchMock = mockSse('data: {"type":"chunk"}\n\n');
    const handlers = observer();

    client.stream.streamPrompt(1, { query: 'hi' }, undefined, handlers).unsubscribe();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.next).not.toHaveBeenCalled();
    expect(handlers.complete).not.toHaveBeenCalled();
  });

  it('aborts the request on abort', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        // a stream that stays open until the request is aborted
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"type":"chunk"}\n\n'));
            signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
          },
        });
        return Promise.resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));
      }),
    );
    const handlers = observer();

    const subscription = client.stream.streamPrompt(1, { query: 'hi' }, undefined, handlers);
    await vi.waitFor(() => expect(handlers.next).toHaveBeenCalledOnce());
    subscription.abort();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(signal?.aborted).toBe(true);
    expect(handlers.error).not.toHaveBeenCalled();
    expect(handlers.complete).not.toHaveBeenCalled();
  });
});

describe('AppClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(response: Response | Error) {
    const fetchMock = vi.fn((_: Request) => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('sends cookies and the language, passes the parameters and converts dates', async () => {
    const fetchMock = mockFetch(
      json({ items: [{ id: 1, fileName: 'a.txt', uploadedAt: '2024-01-02T03:04:05.000Z' }], total: 1 }),
    );
    const client = new AppClient('http://server');

    const result = await client.files.getUserFiles({ page: 2, conversationId: 3 });

    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe('http://server/api/user-files?page=2&conversationId=3');
    expect(request.credentials).toBe('include');
    expect(request.headers.get('Accept-Language')).toBeTruthy();
    expect(result.items[0].uploadedAt).toEqual(new Date('2024-01-02T03:04:05.000Z'));
  });

  it('removes properties with null values, but keeps nulls in arrays', async () => {
    mockFetch(json({ id: 1, name: 'a', chatFooter: null, values: { a: null, b: [null, 1] } }));
    const client = new AppClient('http://server');

    const result = await client.extensions.getConfiguration({ id: 1 });

    expect(result).toEqual({ id: 1, name: 'a', values: { b: [null, 1] } });
  });

  it('throws a ResponseError with the message of the server on error responses', async () => {
    mockFetch(json({ statusCode: 400, message: ['name should not be empty', 'name must be a string'] }, 400));
    const client = new AppClient('http://server');

    const error = await client.users.getUserGroups().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResponseError);
    expect(error).toMatchObject({ status: 400, serverMessage: 'name should not be empty, name must be a string' });
  });

  it('calls onUnauthorized on 401 responses', async () => {
    mockFetch(json({ statusCode: 401, message: 'Unauthorized' }, 401));
    const onUnauthorized = vi.fn();
    const client = new AppClient('http://server', onUnauthorized);

    await expect(client.auth.getProfile()).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('rethrows network errors', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    const client = new AppClient('http://server');

    await expect(client.auth.getProfile()).rejects.toEqual(new TypeError('Failed to fetch'));
  });
});
