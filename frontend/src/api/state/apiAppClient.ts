import {
  AuditLogsApi,
  AuthApi,
  Configuration,
  ConversationApi,
  ExtensionsApi,
  FilesApi,
  Middleware,
  SendMessageDto,
  SettingsApi,
  StreamEventDto,
  TranscriptionApi,
  UsagesApi,
  UsersApi,
} from 'src/api/generated';
import { useTransientNavigate } from 'src/hooks';
import { i18next } from 'src/texts/i18n';
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
  public readonly extensions: ExtensionsApi;
  public readonly files: FilesApi;
  public readonly settings: SettingsApi;
  public readonly stream: StreamApi;
  public readonly transcription: TranscriptionApi;
  public readonly usages: UsagesApi;
  public readonly users: UsersApi;

  public get url() {
    return this.configuration.basePath;
  }

  constructor(
    readonly configuration: Configuration,
    middleware: Middleware,
  ) {
    this.stream = new StreamApi(configuration);

    this.auditLogs = new AuditLogsApi(configuration).withMiddleware(middleware);

    this.auth = new AuthApi(configuration).withMiddleware(middleware);

    this.conversations = new ConversationApi(configuration).withMiddleware(middleware);

    this.extensions = new ExtensionsApi(configuration).withMiddleware(middleware);

    this.files = new FilesApi(configuration).withMiddleware(middleware);

    this.settings = new SettingsApi(configuration).withMiddleware(middleware);

    this.transcription = new TranscriptionApi(configuration).withMiddleware(middleware);

    this.usages = new UsagesApi(configuration).withMiddleware(middleware);

    this.users = new UsersApi(configuration).withMiddleware(middleware);
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
  constructor(private readonly configuration: Configuration) {}

  streamPrompt(
    conversationId: number,
    message: SendMessageDto,
    messageId: number | undefined,
    observer: StreamObserver<StreamEventDto>,
  ): StreamSubscription {
    let active = true;
    const abortController = new AbortController();

    const basePath = `${this.configuration.basePath}/api/conversations/${conversationId}`;
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
