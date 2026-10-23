import { Injectable, Logger, Optional } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/use-cases/create-audit-log.js';
import { ExtensionArgument } from '../../extensions/index.js';
import {
  ChatContext,
  ChatInteraction,
  ChatInteractionStatus,
  ChatMiddleware,
  ChatNextDelegate,
  ChatUI,
  ChatUICallbackResult,
  ChatUIOpenUrlRequest,
  ChatUIOpenUrlResult,
  ChatUIRequestOptions,
  ChatUIUrlCompletion,
  FormActionType,
  GetContext,
} from '../interfaces.js';
import { CallbackService } from '../services/callback-service.js';

// Logins at other services take longer than answering a form.
export const URL_TIMEOUT = Number(process.env.CHAT_URL_TIMEOUT_MS) || 10 * 60 * 1000;

@Injectable()
export class UIMiddleware implements ChatMiddleware {
  order = -1000;

  constructor(
    private readonly callbacks: CallbackService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const ui = new ChatUIImpl(context, this.callbacks, this.auditLog);
    context.ui = ui;
    try {
      return await next(context);
    } finally {
      // Nobody can answer the open requests anymore when the answer is complete.
      ui.finish();
    }
  }
}

export type ValidatedUrl = { url: URL; domain: string; allowed: boolean } | { error: string };

/**
 * Validates an URL to be opened by the user: only https (http only for localhost outside of production), no
 * credentials, and the domain must be in the allowlist (if there is one). Subdomains of allowed domains are allowed.
 */
export function validateUrl(
  raw: string,
  allowedDomains?: string[],
  production = process.env.NODE_ENV === 'production',
): ValidatedUrl {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: 'invalid' };
  }

  // URL normalizes international domain names to punycode (xn--), so that look-alike domains are visible.
  const domain = url.hostname.toLowerCase();
  const isLocalhost = domain === 'localhost' || domain === '127.0.0.1' || domain === '[::1]';

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost && !production)) {
    return { error: 'protocol' };
  }

  if (url.username || url.password) {
    return { error: 'credentials' };
  }

  const domains = (allowedDomains ?? []).map((d) => d.trim().toLowerCase().replace(/^\*\./, '')).filter((d) => !!d);
  if (domains.length === 0) {
    return { url, domain, allowed: false };
  }

  if (!domains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { error: 'domain' };
  }

  return { url, domain, allowed: true };
}

/** The URL without query and fragment, which may contain tokens. */
export function withoutQuery(url: URL) {
  return `${url.origin}${url.pathname}`;
}

/** Removes the values of secret fields (e.g. passwords) from the answers of a form before they are stored. */
export function withoutSecrets(schema: ExtensionArgument, data?: Record<string, any>) {
  if (!data) {
    return undefined;
  }
  if (schema.type !== 'object') {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => {
      const property = schema.properties?.[key];
      return !(property?.type === 'string' && property.format === 'password');
    }),
  );
}

function statusOf(result: ChatUICallbackResult): ChatInteractionStatus {
  if (result.expired) {
    return 'expired';
  }
  switch (result.action) {
    case FormActionType.ACCEPT:
      return 'accepted';
    case FormActionType.REJECT:
      return 'declined';
    default:
      return 'cancelled';
  }
}

class ChatUIImpl implements ChatUI {
  private readonly logger = new Logger('ChatUI');
  // The opened URL requests by the elicitation ID of the server.
  private readonly openedUrls = new Map<string, string>();
  private readonly pending = new Set<string>();

  constructor(
    private readonly context: ChatContext,
    private readonly callbacks: CallbackService,
    private readonly auditLog?: AuditLogService,
  ) {}

  private get owner() {
    return { userId: this.context.user.id, conversationId: this.context.conversationId };
  }

  private now() {
    return new Date().toISOString();
  }

  private setInteraction(interaction: ChatInteraction) {
    this.context.history?.setInteraction(interaction);
  }

  private update(interaction: ChatInteraction, status: ChatInteractionStatus, data?: Record<string, any>) {
    Object.assign(interaction, { status, updatedAt: this.now() }, data ? { data } : {});
    this.setInteraction({ ...interaction });
    this.context.result.next({ type: 'ui_update', update: { id: interaction.id, status, ...(data ? { data } : {}) } });
  }

  /** Waits for the answer of a request, which is cancelled when the generation is stopped. */
  private async wait(id: string, result: Promise<ChatUICallbackResult>) {
    const { signal } = this.context.abort;
    // When the generation is stopped, nobody can answer the form anymore.
    const onAbort = () => this.callbacks.complete(id, { action: FormActionType.CANCEL });
    signal.addEventListener('abort', onAbort, { once: true });
    this.pending.add(id);

    try {
      return await result;
    } finally {
      this.pending.delete(id);
      signal.removeEventListener('abort', onAbort);
    }
  }

  async form(text: string, schema: ExtensionArgument, options?: ChatUIRequestOptions) {
    const { signal } = this.context.abort;
    if (signal.aborted) {
      return { action: FormActionType.CANCEL };
    }

    const { id, result } = this.callbacks.form(this.owner);
    const expiresAt = new Date(Date.now() + this.callbacks.timeoutOf()).toISOString();
    const interaction: ChatInteraction = {
      id,
      kind: 'form',
      status: 'waiting',
      source: options?.source,
      text,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    this.context.result.next({
      type: 'ui',
      request: { id, kind: 'form', text, schema, source: options?.source, expiresAt },
    });

    const answer = await this.wait(id, result);
    this.update(
      interaction,
      statusOf(answer),
      answer.action === FormActionType.ACCEPT ? withoutSecrets(schema, answer.data) : undefined,
    );

    const { expired: _, ...response } = answer;
    return response;
  }

  async openUrl(request: ChatUIOpenUrlRequest): Promise<ChatUIOpenUrlResult> {
    const { text, source, elicitationId, allowedDomains } = request;
    const cancelled: ChatUIOpenUrlResult = { action: FormActionType.CANCEL, completion: Promise.resolve('cancelled') };

    if (this.context.abort.signal.aborted) {
      return cancelled;
    }

    const validated = validateUrl(request.url, allowedDomains);
    const { id, result } = this.callbacks.form(this.owner, URL_TIMEOUT);

    if ('error' in validated) {
      // Show that the request has been blocked, but never the URL itself.
      this.callbacks.complete(id, { action: FormActionType.CANCEL });
      this.logger.warn(`Blocked URL request of '${source}' (${validated.error}).`);
      const blocked: ChatInteraction = {
        id,
        kind: 'url',
        status: 'blocked',
        source,
        text,
        error: validated.error,
        createdAt: this.now(),
        updatedAt: this.now(),
      };
      this.setInteraction(blocked);
      this.context.result.next({
        type: 'ui',
        request: { id, kind: 'url', text, source, expiresAt: this.now() },
      });
      this.context.result.next({ type: 'ui_update', update: { id, status: 'blocked' } });
      return cancelled;
    }

    const { url, domain, allowed } = validated;
    const interaction: ChatInteraction = {
      id,
      kind: 'url',
      status: 'waiting',
      source,
      text,
      url: withoutQuery(url),
      domain,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    void this.audit(interaction, 'create');

    this.context.result.next({
      type: 'ui',
      request: {
        id,
        kind: 'url',
        text,
        source,
        url: url.toString(),
        domain,
        domainAllowed: allowed,
        expiresAt: new Date(Date.now() + URL_TIMEOUT).toISOString(),
      },
    });

    const answer = await this.wait(id, result);
    if (answer.action !== FormActionType.ACCEPT) {
      this.update(interaction, statusOf(answer));
      void this.audit(interaction, 'update');
      return { action: answer.action, completion: Promise.resolve(answer.expired ? 'expired' : 'cancelled') };
    }

    // The user has opened the page. Now wait until the server reports the completion, the user confirms it or cancels.
    this.update(interaction, 'opened');
    void this.audit(interaction, 'update');
    if (elicitationId) {
      this.openedUrls.set(elicitationId, id);
    }

    const completion = (async (): Promise<ChatUIUrlCompletion> => {
      const next = this.callbacks.form(this.owner, URL_TIMEOUT, id);
      const done = await this.wait(id, next.result);
      if (elicitationId) {
        this.openedUrls.delete(elicitationId);
      }

      const status: ChatUIUrlCompletion = done.expired
        ? 'expired'
        : done.action === FormActionType.ACCEPT
          ? 'completed'
          : this.finished
            ? 'opened'
            : 'cancelled';
      this.update(interaction, status);
      void this.audit(interaction, 'update');
      return status;
    })();

    return { action: FormActionType.ACCEPT, completion };
  }

  completeUrl(elicitationId: string) {
    const id = this.openedUrls.get(elicitationId);
    if (id) {
      this.callbacks.complete(id, { action: FormActionType.ACCEPT });
    }
  }

  private finished = false;

  /** Cancels all open requests, e.g. when the answer is complete. */
  finish() {
    this.finished = true;
    for (const id of [...this.pending]) {
      this.callbacks.complete(id, { action: FormActionType.CANCEL });
    }
  }

  private async audit(interaction: ChatInteraction, action: 'create' | 'update') {
    try {
      await this.auditLog?.createAuditLog({
        entityType: 'urlElicitation',
        entityId: interaction.id,
        action,
        userId: this.context.user.id,
        userName: this.context.user.name,
        // without the query, which can contain tokens
        snapshot: {
          conversationId: this.context.conversationId,
          source: interaction.source,
          url: interaction.url,
          domain: interaction.domain,
          status: interaction.status,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write the audit log of an URL request.', err);
    }
  }
}
