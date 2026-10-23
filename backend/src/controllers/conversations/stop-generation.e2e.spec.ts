import * as http from 'http';
import { AddressInfo, Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { UserEntity } from '../../domain/database/index.js';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils.js';
import { ConversationDto, MessagesDto } from './dtos/index.js';

/**
 * A minimal OpenAI compatible LLM that streams one word every 50ms ("slow") or answers immediately.
 * It records whether a streaming request was closed by the client before it was complete.
 */
function startSlowLlm() {
  const requests: { aborted: boolean; finished: boolean }[] = [];

  const chunk = (delta: object, finishReason: string | null = null) =>
    `data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', created: 0, model: 'mock', choices: [{ index: 0, delta, finish_reason: finishReason }] })}\n\n`;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (data: Buffer) => (body += data.toString()));
    req.on('end', () => {
      const parsed = JSON.parse(body) as { messages: { role: string; content: string }[]; stream?: boolean };
      if (!parsed.stream) {
        // the conversation title
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'x',
            object: 'chat.completion',
            created: 0,
            model: 'mock',
            choices: [{ index: 0, message: { role: 'assistant', content: 'Title' }, finish_reason: 'stop' }],
          }),
        );
        return;
      }

      const lastUserMessage = parsed.messages.filter((x) => x.role === 'user').pop()?.content ?? '';
      const words = lastUserMessage.includes('slow') ? Array.from({ length: 200 }, (_, i) => `word${i}`) : ['Done'];
      const state = { aborted: false, finished: false };
      requests.push(state);

      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.on('close', () => (state.aborted = !state.finished));
      res.write(chunk({ role: 'assistant' }));

      let i = 0;
      const next = () => {
        if (res.destroyed) {
          return;
        }
        if (i < words.length) {
          res.write(chunk({ content: `${words[i++]} ` }));
          setTimeout(next, 50);
        } else {
          state.finished = true;
          res.write(chunk({}, 'stop'));
          res.end('data: [DONE]\n\n');
        }
      };
      next();
    });
  });

  return new Promise<{ url: string; requests: typeof requests; close: () => void }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}/v1`, requests, close: () => server.close() });
    });
  });
}

describe('Stop generation', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let llm: Awaited<ReturnType<typeof startSlowLlm>>;
  let conversationId: number;

  beforeAll(async () => {
    llm = await startSlowLlm();

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await app.listen(0, '127.0.0.1');

    // the user of initAppWithDataBaseAndValidUser
    await dataSource.getRepository(UserEntity).save({ id: '1', name: 'test-user', email: 'test@example.com' });

    const server = app.getHttpServer();
    const configuration = (
      await request(server).post('/configurations').send({ name: 'Stop generation', description: '', enabled: true }).expect(201)
    ).body as { id: number };
    await request(server)
      .post(`/configurations/${configuration.id}/extensions`)
      .send({
        name: 'open-ai-compatible-model',
        enabled: true,
        values: { apiKey: 'key', baseUrl: llm.url, modelName: 'mock' },
      })
      .expect(201);
    const conversation = (await request(server).post('/conversations').send({ configurationId: configuration.id }).expect(201))
      .body as ConversationDto;
    conversationId = conversation.id;
  });

  afterAll(async () => {
    llm.close();
    await dataSource.destroy();
    await app.close();
  });

  /** Sends a message and closes the connection (like the stop button) after the given number of chunks. */
  function sendAndStop(query: string, chunksBeforeStop: number) {
    const { port } = app.getHttpServer().address() as AddressInfo;

    return new Promise<string[]>((resolve, reject) => {
      const chunks: string[] = [];
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          method: 'POST',
          path: `/conversations/${conversationId}/messages/sse`,
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          res.setEncoding('utf8');
          res.on('data', (data: string) => {
            for (const match of data.matchAll(/"type":"chunk","content":\[\{"type":"text","text":"([^"]*)"/g)) {
              chunks.push(match[1]);
            }
            if (chunks.length >= chunksBeforeStop) {
              req.destroy();
              resolve(chunks);
            }
          });
          res.on('end', () => resolve(chunks));
        },
      );
      req.on('error', (err) => (req.destroyed ? undefined : reject(err)));
      req.end(JSON.stringify({ query }));
    });
  }

  async function getMessages() {
    const response = await request(app.getHttpServer()).get(`/conversations/${conversationId}/messages`).expect(200);
    return (response.body as MessagesDto).items;
  }

  it('stops the LLM request and persists the partial answer as stopped', async () => {
    const chunks = await sendAndStop('Please answer slow', 3);

    // reading the history waits until the stopped answer has been persisted
    const messages = await getMessages();
    const answer = messages[messages.length - 1];

    expect(answer.type).toBe('ai');
    expect(answer.stopped).toBe(true);
    const text = answer.content[0].type === 'text' ? answer.content[0].text : '';
    expect(text.startsWith(chunks.join(''))).toBe(true);
    expect(text.split(' ').length).toBeLessThan(50);
    expect(messages[messages.length - 2]).toMatchObject({ type: 'human', stopped: false });

    // the request to the LLM has been closed
    await waitFor(() => llm.requests[0]?.aborted === true);
  });

  it('answers a new message right after stopping', async () => {
    await sendAndStop('Please answer slow again', 2);

    const response = await request(app.getHttpServer())
      .post(`/conversations/${conversationId}/messages/sse`)
      .send({ query: 'Answer fast' })
      .expect(201);
    expect(response.text).toContain('"type":"completed"');

    const messages = await getMessages();
    expect(messages.map((x) => [x.type, x.stopped])).toEqual([
      ['human', false],
      ['ai', true],
      ['human', false],
      ['ai', true],
      ['human', false],
      ['ai', false],
    ]);
    expect(messages[5].content).toEqual([{ type: 'text', text: 'Done ' }]);
  });
});

async function waitFor(condition: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met in time.');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
