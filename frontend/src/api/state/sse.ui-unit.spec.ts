import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSseParser, fetchEventStream, SseMessage, SseResponseError } from './sse';

function parse(...chunks: string[]) {
  const messages: SseMessage[] = [];
  const parser = createSseParser((message) => messages.push(message));
  chunks.forEach((chunk) => parser.feed(chunk));
  return messages;
}

describe('createSseParser', () => {
  it('parses id, event and data fields', () => {
    expect(parse('id: 1\nevent: message\ndata: {"a":1}\n\n')).toEqual([{ id: '1', event: 'message', data: '{"a":1}' }]);
  });

  it('defaults the event type to "message" and keeps the last event id', () => {
    expect(parse('id: 7\ndata: a\n\ndata: b\n\n')).toEqual([
      { id: '7', event: 'message', data: 'a' },
      { id: '7', event: 'message', data: 'b' },
    ]);
  });

  it('joins multi-line data with newlines', () => {
    expect(parse('data: line 1\ndata: line 2\ndata:\n\n')).toEqual([{ id: '', event: 'message', data: 'line 1\nline 2\n' }]);
  });

  it('removes only one leading space and ignores comments and unknown fields', () => {
    expect(parse(': keep-alive\nfoo: bar\ndata:  two spaces\ndata:none\n\n')).toEqual([
      { id: '', event: 'message', data: ' two spaces\nnone' },
    ]);
  });

  it('accepts CRLF and CR line endings', () => {
    expect(parse('event: error\r\ndata: x\r\n\r\ndata: y\r\rdata: z\n\n')).toEqual([
      { id: '', event: 'error', data: 'x' },
      { id: '', event: 'message', data: 'y' },
      { id: '', event: 'message', data: 'z' },
    ]);
  });

  it('handles lines and CRLF split across chunks', () => {
    expect(parse('da', 'ta: hel', 'lo\r', '\nid: 2\r', '\n\r', '\n')).toEqual([{ id: '2', event: 'message', data: 'hello' }]);
  });

  it('feeding the input character by character gives the same result', () => {
    const input = 'id: 1\r\nevent: message\r\ndata: {"text":"ä😀"}\r\n\r\nid: 2\nevent: error\ndata: {}\n\n';
    expect(parse(...input.split(''))).toEqual(parse(input));
    expect(parse(input)).toHaveLength(2);
  });

  it('does not dispatch events without data or an unterminated event', () => {
    expect(parse('event: ping\n\nid: 3\n\ndata: unterminated\n')).toEqual([]);
  });

  it('parses retry and ignores invalid values', () => {
    expect(parse('retry: 1000\ndata: a\n\nretry: x\ndata: b\n\n')).toEqual([
      { id: '', event: 'message', data: 'a', retry: 1000 },
      { id: '', event: 'message', data: 'b' },
    ]);
  });
});

describe('fetchEventStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function streamOf(chunks: Uint8Array[]) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    });
  }

  function mockFetch(body: ReadableStream<Uint8Array> | string, contentType = 'text/event-stream; charset=utf-8', status = 200) {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          resolve(new Response(body, { status, headers: { 'content-type': contentType } }));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('sends the request options and decodes UTF-8 split across chunks', async () => {
    const bytes = new TextEncoder().encode('data: {"text":"grüße 😀"}\n\n');
    // split inside the multi-byte sequences of "ü" and the emoji
    const splitAt = [18, 20, 24, 25];
    const chunks = [0, ...splitAt].map((start, i) => bytes.slice(start, splitAt[i] ?? bytes.length));
    const fetchMock = mockFetch(streamOf(chunks));

    const onMessage = vi.fn();
    await fetchEventStream('/sse', {
      method: 'POST',
      body: '{}',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      onMessage,
    });

    expect(onMessage).toHaveBeenCalledExactlyOnceWith({ id: '', event: 'message', data: '{"text":"grüße 😀"}' });
    expect(fetchMock).toHaveBeenCalledWith('/sse', {
      method: 'POST',
      body: '{}',
      credentials: 'include',
      signal: undefined,
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    });
  });

  it('rejects responses that are not an event stream', async () => {
    mockFetch('{"message":"Unauthorized"}', 'application/json');

    await expect(fetchEventStream('/sse', { onMessage: vi.fn() })).rejects.toThrow(
      'Expected content-type to be text/event-stream, Actual: application/json',
    );
  });

  it('rejects error responses with the status and the message of the server', async () => {
    mockFetch('{"statusCode":400,"message":["query should not be empty","files must be an array"]}', 'application/json', 400);

    const error = await fetchEventStream('/sse', { onMessage: vi.fn() }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SseResponseError);
    expect(error).toMatchObject({ status: 400, serverMessage: 'query should not be empty, files must be an array' });
  });

  it('rejects error responses without a JSON body', async () => {
    mockFetch('Bad Gateway', 'text/plain', 502);

    await expect(fetchEventStream('/sse', { onMessage: vi.fn() })).rejects.toMatchObject({
      status: 502,
      serverMessage: undefined,
    });
  });

  it('rejects with the error thrown by onMessage', async () => {
    mockFetch(streamOf([new TextEncoder().encode('data: not json\n\n')]));

    await expect(
      fetchEventStream('/sse', {
        onMessage: (message) => JSON.parse(message.data) as unknown,
      }),
    ).rejects.toThrow(SyntaxError);
  });

  it('resolves without further messages when aborted', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    mockFetch(body);
    const abortController = new AbortController();
    const onMessage = vi.fn();

    const result = fetchEventStream('/sse', { onMessage, signal: abortController.signal });
    controller.enqueue(new TextEncoder().encode('data: 1\n\n'));
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledOnce());

    abortController.abort();
    controller.error(new DOMException('aborted', 'AbortError'));

    await expect(result).resolves.toBeUndefined();
    expect(onMessage).toHaveBeenCalledOnce();
  });

  it('does not fetch when already aborted', async () => {
    const fetchMock = mockFetch(streamOf([]));
    const abortController = new AbortController();
    abortController.abort();

    await fetchEventStream('/sse', { onMessage: vi.fn(), signal: abortController.signal });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
