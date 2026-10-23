import { Badge, Group, Loader, Paper, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconBan,
  IconCheck,
  IconClockExclamation,
  IconExternalLink,
  IconHandStop,
  IconHourglassHigh,
  IconShieldX,
  IconX,
} from '@tabler/icons-react';
import { clsx } from 'clsx';
import { forwardRef, PropsWithChildren, ReactNode } from 'react';
import { texts } from 'src/texts';
import classes from './ChatCard.module.css';

/** The status vocabulary of everything the AI or a tool does in the conversation, with fixed colors and icons. */
export type ChatCardStatus =
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'waiting'
  | 'expired'
  | 'declined'
  | 'accepted'
  | 'opened'
  | 'completed'
  | 'blocked';

const STATUS: Record<ChatCardStatus, { color: string; icon: ReactNode }> = {
  running: { color: 'gray', icon: <Loader size={10} color="gray" /> },
  success: { color: 'green', icon: <IconCheck size={12} /> },
  completed: { color: 'green', icon: <IconCheck size={12} /> },
  accepted: { color: 'green', icon: <IconCheck size={12} /> },
  error: { color: 'red', icon: <IconX size={12} /> },
  cancelled: { color: 'gray', icon: <IconBan size={12} /> },
  declined: { color: 'gray', icon: <IconHandStop size={12} /> },
  waiting: { color: 'yellow', icon: <IconHourglassHigh size={12} /> },
  expired: { color: 'gray', icon: <IconClockExclamation size={12} /> },
  opened: { color: 'blue', icon: <IconExternalLink size={12} /> },
  blocked: { color: 'red', icon: <IconShieldX size={12} /> },
};

function statusText(status: ChatCardStatus) {
  return texts.chat.status[status];
}

export function StatusBadge({ status, label }: { status: ChatCardStatus; label?: string }) {
  const { color, icon } = STATUS[status];

  return (
    <Badge
      variant="light"
      color={color}
      size="sm"
      radius="sm"
      tt="none"
      leftSection={icon}
      className={classes.badge}
      data-testid="chat-card-status"
      data-status={status}
    >
      {label ?? statusText(status)}
    </Badge>
  );
}

interface ChatCardProps extends PropsWithChildren {
  // The icon in front of the title.
  icon?: ReactNode;
  // The title, e.g. the name of a tool or who is asking.
  title: ReactNode;
  // Optional meta information next to the title (e.g. a countdown).
  meta?: ReactNode;
  status?: ChatCardStatus;
  // The actions, rendered right-aligned at the bottom: [secondary] [primary].
  actions?: ReactNode;
  // Renders the card as a single, compact line (e.g. the result of a form).
  compact?: boolean;
  className?: string;
  'data-testid'?: string;
  // Highlights the card, e.g. because it waits for the user.
  highlight?: boolean;
}

/**
 * The common card for everything inline in the conversation: tool calls, forms, confirmations, errors and hints.
 * Same paddings and typography everywhere: title `sm`/600, text `sm`, meta `xs dimmed`.
 */
export const ChatCard = forwardRef<HTMLDivElement, ChatCardProps>((props, ref) => {
  const { icon, title, meta, status, actions, children, compact, className, highlight } = props;

  return (
    <Paper
      ref={ref}
      withBorder
      radius="md"
      className={clsx(classes.root, compact && classes.compact, highlight && classes.highlight, className)}
      data-testid={props['data-testid']}
      data-status={status}
      tabIndex={-1}
    >
      <Group gap="xs" wrap="nowrap" className={classes.header}>
        {icon && <span className={classes.icon}>{icon}</span>}
        <Text size="sm" fw={600} className={classes.title} component="div">
          {title}
        </Text>
        {meta && (
          <Text size="xs" c="dimmed" component="div">
            {meta}
          </Text>
        )}
        {status && <StatusBadge status={status} />}
      </Group>
      {children && <div className={classes.body}>{children}</div>}
      {actions && (
        <Group justify="flex-end" gap="xs" className={classes.actions}>
          {actions}
        </Group>
      )}
    </Paper>
  );
});

/** A warning inside a card (e.g. a hint about a third party site). */
export function ChatCardWarning({ children }: PropsWithChildren) {
  return (
    <Group gap={6} wrap="nowrap" align="flex-start" className={classes.warning}>
      <IconAlertTriangle size={16} className={classes.warningIcon} aria-hidden />
      <Text size="xs">{children}</Text>
    </Group>
  );
}
