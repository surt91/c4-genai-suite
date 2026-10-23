import * as http from 'http';
import { AddressInfo } from 'net';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { Subject } from 'rxjs';
import { SendMessageResponse } from 'src/domain/chat';
import { StreamEvent } from 'src/domain/chat/interfaces';
import { CallbackService } from 'src/domain/chat/services/callback-service';
import { ConversationsController } from './conversations.controller';

describe('ConversationsController SSE', () => {
  let server: http.Server;
  let stream: Subject<StreamEvent>;
  let abort: AbortController;
  let getStreamDelay: number;

  beforeEach(async () => {
    stream = new Subject<StreamEvent>();
    abort = new AbortController();
    getStreamDelay = 0;
    const queryBus = {
      execute: () =>
        new Promise<SendMessageResponse>((resolve) =>
          setTimeout(() => resolve(new SendMessageResponse(stream.asObservable(), abort)), getStreamDelay),
        ),
    } as unknown as QueryBus;
    const controller = new ConversationsController({} as CallbackService, {} as CommandBus, queryBus);

    server = http.createServer((req, res) => {
      // the controller only uses the express helpers `set` and `flushHeaders` before streaming
      const response = Object.assign(res, {
        set: (headers: Record<string, string>) => Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v)),
      }) as unknown as Response;
      const request = Object.assign(req, { user: { id: 'u' } }) as unknown as Request;
      req.resume();
      req.on('end', () => void controller.postMessage(request, response, 1, { query: 'hi' }));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function post() {
    const { port } = server.address() as AddressInfo;
    const req = http.request({ port, method: 'POST', path: '/' });
    req.end('{}');
    return new Promise<{ req: http.ClientRequest; res: http.IncomingMessage }>((resolve) =>
      req.on('response', (res) => resolve({ req, res })),
    );
  }

  const waitFor = async (condition: () => boolean) => {
    for (let i = 0; i < 100 && !condition(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  it('aborts the generation when the client disconnects', async () => {
    const { req, res } = await post();
    stream.next({ type: 'chunk', content: [{ type: 'text', text: 'Hel' }] });
    await new Promise((resolve) => res.once('data', resolve));

    req.destroy();
    await waitFor(() => abort.signal.aborted);

    expect(abort.signal.aborted).toBe(true);
  });

  it('aborts the generation when the client disconnects before the stream was created', async () => {
    getStreamDelay = 200;
    const { req } = await post();

    req.destroy();
    await waitFor(() => abort.signal.aborted);

    expect(abort.signal.aborted).toBe(true);
  });

  it('ends the response after an error event', async () => {
    const { res } = await post();
    let body = '';
    res.on('data', (chunk: Buffer) => (body += chunk.toString()));
    const ended = new Promise((resolve) => res.on('end', resolve));

    stream.error({ type: 'error', message: 'failed' });
    await ended;

    expect(body).toContain('event: error');
    expect(body).toContain('"message":"failed"');
    expect(abort.signal.aborted).toBe(false);
  });
});
