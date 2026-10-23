import { afterEach, describe, expect, it, vi } from 'vitest';
import { Configuration } from 'src/api/generated';
import { AppClient } from './apiAppClient';

describe('StreamApi.streamPrompt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const client = new AppClient(new Configuration({ basePath: 'http://server' }), {});

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
});
