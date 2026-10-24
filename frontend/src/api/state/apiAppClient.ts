import {
  AuditLogsApi,
  AuthApi,
  ConversationApi,
  EvalApi,
  ExtensionsApi,
  FilesApi,
  SendMessageDto,
  SettingsApi,
  TranscriptionApi,
  UsagesApi,
  UsersApi,
} from 'src/api/generated';
import { createClient } from 'src/api/generated/client';
import { useTransientNavigate } from 'src/hooks';
import { i18next } from 'src/texts/i18n';
import { StreamEventDto } from '../types';
import { configureClient, dropNullProperties } from './client';
import { fetchEventStream } from './sse';
import { useAppClientStore } from './zustand/appClientStore';

export function useApi() {
  const navigate = useTransientNavigate();
  return useAppClientStore((state) => state.getAppClient(navigate));
}

export class AppClient {
  public readonly auditLogs: AuditLogsApi;
  public readonly auth: AuthApi;
  public readonly conversations: ConversationApi;
  public readonly eval: EvalApi;
  public readonly extensions: ExtensionsApi;
  public readonly files: FilesApi;
  public readonly settings: SettingsApi;
  public readonly stream: StreamApi;
  public readonly transcription: TranscriptionApi;
  public readonly usages: UsagesApi;
  public readonly users: UsersApi;

  /**
   * @param url The URL of the server (empty for the same origin).
   * @param onUnauthorized Called on 401 responses (except for the answer stream).
   */
  constructor(
    public readonly url: string,
    onUnauthorized: () => void = () => {},
  ) {
    const client = dropNullProperties(configureClient(createClient({ baseUrl: url }), onUnauthorized));

    this.stream = new StreamApi(url);
    this.auditLogs = new AuditLogsApi({ client });
    this.auth = new AuthApi({ client });
    this.conversations = new ConversationApi({ client });
    this.eval = new EvalApi({ client });
    this.extensions = new ExtensionsApi({ client });
    this.files = new FilesApi({ client });
    this.settings = new SettingsApi({ client });
    this.transcription = new TranscriptionApi({ client });
    this.usages = new UsagesApi({ client });
    this.users = new UsersApi({ client });
  }
}

export interface StreamObserver<T> {
  next: (value: T) => void;
  error: (error: unknown) => void;
  complete: () => void;
}

export interface StreamSubscription {
  /** Stops delivering events to the observer. The request itself keeps running, so the server finishes the answer. */
  unsubscribe: () => void;
  /** Stops delivering events and aborts the request, so the server stops generating the answer. */
  abort: () => void;
}

class StreamApi {
  constructor(private readonly url: string) {}

  streamPrompt(
    conversationId: number,
    message: SendMessageDto,
    messageId: number | undefined,
    observer: StreamObserver<StreamEventDto>,
  ): StreamSubscription {
    let active = true;
    const abortController = new AbortController();

    const basePath = `${this.url}/api/conversations/${conversationId}`;
    const path = messageId ? `${basePath}/messages/${messageId}/sse` : `${basePath}/messages/sse`;
    const method = messageId ? 'PUT' : 'POST';

    fetchEventStream(path, {
      method: method,
      body: JSON.stringify(message),
      credentials: 'include',
      signal: abortController.signal,
      headers: {
        'Accept-Language': i18next.language,
        'Content-Type': 'application/json',
      },
      onMessage(msg) {
        const data = JSON.parse(msg.data) as StreamEventDto;
        if (active) {
          observer.next(data);
        }
      },
    }).then(
      () => {
        if (active) {
          active = false;
          observer.complete();
        }
      },
      (err) => {
        if (active) {
          active = false;
          observer.error(err);
        }
      },
    );

    return {
      unsubscribe: () => {
        active = false;
      },
      abort: () => {
        active = false;
        abortController.abort();
      },
    };
  }
}
