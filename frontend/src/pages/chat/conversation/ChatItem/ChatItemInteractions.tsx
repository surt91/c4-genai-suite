import { Anchor, Button, Code, Collapse, Group, Stack, Text } from '@mantine/core';
import { useForm, UseFormReturnType } from '@mantine/form';
import { useInterval } from '@mantine/hooks';
import { IconExternalLink, IconLink, IconLock, IconMessageQuestion } from '@tabler/icons-react';
import { memo, useEffect, useRef, useState } from 'react';
import { ChatInteractionDto, type ExtensionArgumentObjectSpecDto } from 'src/api';
import { Markdown } from 'src/components';
import { ChatCard, ChatCardStatus, ChatCardWarning } from 'src/components/ChatCard';
import { useTheme } from 'src/hooks';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useArgumentObjectSpecResolver } from 'src/pages/admin/extensions/hooks';
import { texts } from 'src/texts';
import { useConfirmAiAction } from '../../state/chat';
import { ChatMessage, InteractionStatus, UIRequestState } from '../../state/types';
import classes from './ChatItem.module.css';

type FormValues = Record<string, unknown>;

/** The remaining time until the date as mm:ss, updated every second. */
function useCountdown(expiresAt: Date | string | undefined, active: boolean) {
  const end = expiresAt ? new Date(expiresAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  const interval = useInterval(() => setNow(Date.now()), 1000);

  useEffect(() => {
    if (active && end) {
      interval.start();
      return interval.stop;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, end]);

  const remaining = Math.max(0, end - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { text: `${minutes}:${seconds.toString().padStart(2, '0')}`, expired: !!end && remaining === 0 };
}

function toCardStatus(status: InteractionStatus): ChatCardStatus {
  return status === 'error' ? 'error' : status;
}

function DynamicForm<T>({ schema, form }: { schema: ExtensionArgumentObjectSpecDto; form: UseFormReturnType<T> }) {
  if (schema.type !== 'object' || Object.keys(schema.properties).length === 0) {
    return null;
  }

  return (
    <div className={classes.userInputFields}>
      {Object.entries(schema.properties).map(([name, spec]) => (
        <Argument key={name} buckets={[]} name={name} argument={spec} form={form} />
      ))}
    </div>
  );
}

function formatData(data?: Record<string, unknown> | object) {
  const entries = Object.entries(data ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return entries.map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(', ');
}

function resultText(status: InteractionStatus) {
  switch (status) {
    case 'accepted':
      return texts.chat.cards.resultAccepted;
    case 'declined':
      return texts.chat.cards.resultDeclined;
    case 'expired':
      return texts.chat.cards.resultExpired;
    case 'opened':
      return texts.chat.cards.resultOpened;
    case 'completed':
      return texts.chat.cards.resultCompleted;
    case 'blocked':
      return texts.chat.cards.resultBlocked;
    default:
      return texts.chat.cards.resultCancelled;
  }
}

/** The compact protocol line of a finished request, also shown after a reload. */
function ResultLine(props: {
  kind: 'form' | 'url';
  status: InteractionStatus;
  source?: string;
  text?: string;
  data?: object;
  domain?: string;
}) {
  const { kind, status, source, text, data, domain } = props;
  const details = kind === 'form' && status === 'accepted' ? formatData(data) : '';

  return (
    <ChatCard
      compact
      icon={kind === 'url' ? <IconLink size={16} /> : <IconMessageQuestion size={16} />}
      title={source ?? (kind === 'url' ? texts.chat.cards.urlTitleUnknown : texts.chat.cards.assistantAsks)}
      meta={domain}
      status={toCardStatus(status)}
      data-testid={`chat-card-${kind}`}
    >
      <Text size="xs" c="gray.7" data-testid="chat-card-result">
        {resultText(status)}
        {details && `: ${details}`}
        {text && kind === 'form' && !details && ` – ${text}`}
      </Text>
    </ChatCard>
  );
}

function useFocusOnMount(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) {
      ref.current?.focus({ preventScroll: true });
      ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

const FormCard = ({ state }: { state: UIRequestState }) => {
  const { request, status } = state;
  const confirm = useConfirmAiAction(request.id);
  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: {},
    validate: useArgumentObjectSpecResolver<FormValues>(request.schema),
  });
  const isWaiting = status === 'waiting';
  const countdown = useCountdown(request.expiresAt, isWaiting);
  const ref = useFocusOnMount(isWaiting);

  if (!isWaiting) {
    return <ResultLine kind="form" status={status} source={request.source} text={request.text} data={state.data} />;
  }

  const disabled = confirm.isPending || countdown.expired;

  return (
    <form onSubmit={form.onSubmit((data) => confirm.mutate({ result: { action: 'accept', data }, status: 'accepted' }))}>
      <ChatCard
        ref={ref}
        highlight
        icon={<IconMessageQuestion size={16} />}
        title={request.source ? texts.chat.cards.asks(request.source) : texts.chat.cards.assistantAsks}
        meta={texts.chat.cards.expiresIn(countdown.text)}
        status="waiting"
        data-testid="chat-card-form"
        actions={
          <>
            <Button
              type="button"
              variant="default"
              disabled={disabled}
              onClick={() => confirm.mutate({ result: { action: 'reject' }, status: 'declined' })}
            >
              {texts.chat.cards.decline}
            </Button>
            <Button type="submit" disabled={disabled} loading={confirm.isPending}>
              {texts.chat.cards.confirm}
            </Button>
          </>
        }
      >
        <Stack gap="sm">
          <Markdown>{request.text}</Markdown>
          {request.schema && <DynamicForm schema={request.schema} form={form} />}
          {confirm.isError && (
            <Text size="xs" c="red">
              {texts.chat.cards.answerFailed}
            </Text>
          )}
        </Stack>
      </ChatCard>
    </form>
  );
};

/**
 * Asks the user to open a page (MCP elicitation in URL mode, later also the re-authentication of MCP OAuth). The domain
 * is shown prominently, the page is only opened after the explicit consent in a new tab (without opener and referrer).
 */
const UrlCard = ({ state }: { state: UIRequestState }) => {
  const { request, status } = state;
  const { theme } = useTheme();
  const confirm = useConfirmAiAction(request.id);
  const [showUrl, setShowUrl] = useState(false);
  const isActive = status === 'waiting' || status === 'opened';
  const countdown = useCountdown(request.expiresAt, isActive);
  const ref = useFocusOnMount(status === 'waiting');

  if (!isActive || !request.url) {
    return <ResultLine kind="url" status={status} source={request.source} domain={request.domain} />;
  }

  const disabled = confirm.isPending || countdown.expired;
  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';

  const open = () => {
    // only after the explicit consent, in a normal browser context without access to this page
    window.open(request.url, '_blank', 'noopener,noreferrer');
    confirm.mutate({ result: { action: 'accept' }, status: 'opened' });
  };

  return (
    <ChatCard
      ref={ref}
      highlight={status === 'waiting'}
      icon={<IconLink size={16} />}
      title={request.source ? texts.chat.cards.urlTitle(request.source) : texts.chat.cards.urlTitleUnknown}
      meta={texts.chat.cards.expiresIn(countdown.text)}
      status={status === 'waiting' ? 'waiting' : 'opened'}
      data-testid="chat-card-url"
      actions={
        status === 'waiting' ? (
          <>
            <Button
              variant="default"
              disabled={disabled}
              onClick={() => confirm.mutate({ result: { action: 'reject' }, status: 'declined' })}
            >
              {texts.chat.cards.decline}
            </Button>
            <Button rightSection={<IconExternalLink size={16} />} disabled={disabled} onClick={open}>
              {texts.chat.cards.openInNewTab}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="default"
              disabled={disabled}
              onClick={() => confirm.mutate({ result: { action: 'cancel' }, status: 'cancelled' })}
            >
              {texts.chat.cards.cancel}
            </Button>
            <Button disabled={disabled} onClick={() => confirm.mutate({ result: { action: 'accept' }, status: 'completed' })}>
              {texts.chat.cards.done}
            </Button>
          </>
        )
      }
    >
      <Stack gap="xs">
        <Markdown>{request.text}</Markdown>
        <Group gap="xs" wrap="nowrap" align="center">
          <Text size="xs" c="gray.7">
            {texts.chat.cards.target}
          </Text>
          <Text size="md" fw={700} className={classes.domain} data-testid="chat-card-domain">
            {request.domain}
          </Text>
          {isHttps && <IconLock size={14} aria-label="https" />}
        </Group>
        <div>
          <Anchor component="button" type="button" size="xs" onClick={() => setShowUrl((x) => !x)} aria-expanded={showUrl}>
            {showUrl ? texts.chat.cards.hideUrl : texts.chat.cards.showUrl}
          </Anchor>
          <Collapse expanded={showUrl}>
            <Code block className={classes.fullUrl}>
              {request.url}
            </Code>
          </Collapse>
        </div>
        {request.domainAllowed ? (
          <Text size="xs" c="gray.7">
            {texts.chat.cards.allowedHint}
          </Text>
        ) : (
          <ChatCardWarning>{texts.chat.cards.notAllowedWarning(theme.name || texts.common.appName)}</ChatCardWarning>
        )}
        {status === 'opened' && (
          <Text size="sm" aria-live="polite">
            {texts.chat.cards.waitingForCompletion(request.domain ?? '')}
          </Text>
        )}
        {confirm.isError && (
          <Text size="xs" c="red">
            {texts.chat.cards.answerFailed}
          </Text>
        )}
      </Stack>
    </ChatCard>
  );
};

function RequestCard({ state }: { state: UIRequestState }) {
  return state.request.kind === 'url' ? <UrlCard state={state} /> : <FormCard state={state} />;
}

function StoredInteraction({ interaction }: { interaction: ChatInteractionDto }) {
  if (interaction.kind === 'tool_error') {
    return null;
  }
  return (
    <ResultLine
      kind={interaction.kind}
      status={interaction.status}
      source={interaction.source}
      text={interaction.text}
      data={interaction.data}
      domain={interaction.domain}
    />
  );
}

/** The requests of the AI in an answer: forms and confirmations, URLs to open and their results. */
export const ChatItemInteractions = memo(({ message }: { message: ChatMessage }) => {
  const requests = message.requests ?? [];
  const stored = (message.interactions ?? []).filter((i) => !requests.some((r) => r.request.id === i.id));

  if (requests.length === 0 && stored.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs" className={classes.interactions} data-testid="chat-interactions">
      {stored.map((interaction) => (
        <StoredInteraction key={interaction.id} interaction={interaction} />
      ))}
      {requests.map((state) => (
        <RequestCard key={state.request.id} state={state} />
      ))}
    </Stack>
  );
});
