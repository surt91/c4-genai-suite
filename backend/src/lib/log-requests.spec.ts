import { Logger } from '@nestjs/common';
import { fetchWithDebugLogging } from './log-requests.js';

describe('fetchWithDebugLogging', () => {
  beforeEach(() => {
    process.env.DEBUG_MODEL_REQUESTS = 'true';
  });

  afterEach(() => {
    delete process.env.DEBUG_MODEL_REQUESTS;
    vi.restoreAllMocks();
  });

  it('does not wait for streamed responses and handles non-JSON bodies', async () => {
    let close: () => void = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: 1\n\n'));
        close = () => controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { headers: { 'content-type': 'text/event-stream' } }));
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    // resolves although the stream is still open
    const response = await fetchWithDebugLogging('test')('https://llm.example/v1?key=secret', {
      body: new Uint8Array([1]),
      headers: { 'Ocp-Apim-Subscription-Key': 'secret', 'Content-Type': 'application/json' },
    });
    expect(response.status).toBe(200);
    expect(log).not.toHaveBeenCalled();

    close();
    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('data: 1');
    expect(logged).not.toContain('secret');
  });
});
