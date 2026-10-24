/**
 * Minimal Server-Sent Events client on top of `fetch` and `ReadableStream`.
 *
 * Unlike the browser's `EventSource` it supports arbitrary methods, bodies and headers. It does not reconnect:
 * the returned promise resolves when the server closes the stream (or the request is aborted via `signal`) and
 * rejects on network errors, error responses (`ResponseError`), non-SSE responses or errors thrown by `onMessage`.
 */

import { readErrorBody, ResponseError } from './errors';

export interface SseMessage {
  id: string;
  event: string;
  data: string;
  retry?: number;
}

export interface SseRequestInit extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  onMessage: (message: SseMessage) => void;
}

const EVENT_STREAM_CONTENT_TYPE = 'text/event-stream';

export async function fetchEventStream(url: string, { onMessage, headers, signal, ...init }: SseRequestInit): Promise<void> {
  if (signal?.aborted) {
    return;
  }

  let reader: ReadableStreamDefaultReader<string> | undefined;
  try {
    const response = await fetch(url, { ...init, signal, headers: { Accept: EVENT_STREAM_CONTENT_TYPE, ...headers } });

    if (!response.ok) {
      throw new ResponseError(response, await readErrorBody(response));
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith(EVENT_STREAM_CONTENT_TYPE)) {
      throw new Error(`Expected content-type to be ${EVENT_STREAM_CONTENT_TYPE}, Actual: ${contentType}`);
    }
    if (!response.body) {
      throw new Error('Response has no body');
    }

    const parser = createSseParser(onMessage);
    // TextDecoderStream keeps multi-byte UTF-8 sequences intact across chunk boundaries.
    reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parser.feed(value);
    }
  } catch (err) {
    if (signal?.aborted) {
      return;
    }
    void reader?.cancel().catch(() => {});
    throw err;
  }
}

/**
 * Incremental parser for the `text/event-stream` format (https://html.spec.whatwg.org/multipage/server-sent-events.html).
 * Lines may be split across chunks; `\n`, `\r\n` and `\r` are all accepted as line endings.
 * An event without a trailing blank line at the end of the stream is discarded, as the specification demands.
 */
export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = '';
  let skipLeadingLf = false;
  let lastEventId = '';
  let event = '';
  let data: string[] = [];
  let retry: number | undefined;

  const dispatch = () => {
    if (data.length > 0) {
      const message: SseMessage = { id: lastEventId, event: event || 'message', data: data.join('\n') };
      if (retry !== undefined) {
        message.retry = retry;
      }
      onMessage(message);
    }
    event = '';
    data = [];
    retry = undefined;
  };

  const processLine = (line: string) => {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) {
      return;
    }

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    switch (field) {
      case 'data':
        data.push(value);
        break;
      case 'event':
        event = value;
        break;
      case 'id':
        if (!value.includes('\0')) {
          lastEventId = value;
        }
        break;
      case 'retry':
        if (/^\d+$/.test(value)) {
          retry = parseInt(value, 10);
        }
        break;
    }
  };

  return {
    feed(chunk: string) {
      if (skipLeadingLf && chunk.startsWith('\n')) {
        chunk = chunk.slice(1);
      }
      skipLeadingLf = false;
      buffer += chunk;

      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        if (char !== '\n' && char !== '\r') {
          continue;
        }

        processLine(buffer.slice(start, i));
        if (char === '\r') {
          if (i + 1 === buffer.length) {
            // A CR at the end of a chunk may be the first half of a CRLF.
            skipLeadingLf = true;
          } else if (buffer[i + 1] === '\n') {
            i++;
          }
        }
        start = i + 1;
      }
      buffer = buffer.slice(start);
    },
  };
}
