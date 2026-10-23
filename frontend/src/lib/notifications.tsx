import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { texts } from 'src/texts';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  // The label of the button, e.g. "Undo".
  label: string;
  onClick: () => void;
}

export interface NotifyOptions {
  type?: NotificationType;
  // An optional action shown in the notification. Clicking it closes the notification.
  action?: NotificationAction;
  // Invoked when the notification is closed without clicking the action (by the user or the timeout).
  onClose?: () => void;
  // How long the notification is shown in ms, false to keep it open.
  autoClose?: number | false;
}

const STYLES: Record<NotificationType, { color: string; icon: ReactNode }> = {
  info: { color: 'blue', icon: <IconInfoCircle size={18} /> },
  success: { color: 'green', icon: <IconCheck size={18} /> },
  warning: { color: 'yellow', icon: <IconAlertTriangle size={18} /> },
  error: { color: 'red', icon: <IconX size={18} /> },
};

let counter = 0;

/**
 * Shows a short-lived notification (Mantine notifications). Errors stay longer, because they usually need to be read.
 *
 * @returns the ID of the notification, e.g. to hide it.
 */
export function notify(message: ReactNode, options: NotifyOptions = {}) {
  const { type = 'info', action, onClose, autoClose } = options;
  const id = `notification-${++counter}`;
  let actionClicked = false;

  const message_ = action ? (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Text size="sm">{message}</Text>
      <Button
        size="compact-sm"
        variant="light"
        onClick={() => {
          actionClicked = true;
          notifications.hide(id);
          action.onClick();
        }}
      >
        {action.label}
      </Button>
    </Group>
  ) : (
    message
  );

  notifications.show({
    id,
    message: message_,
    color: STYLES[type].color,
    icon: STYLES[type].icon,
    autoClose: autoClose ?? (type === 'error' ? 8000 : 4000),
    withBorder: true,
    closeButtonProps: { 'aria-label': texts.accessibility.closeNotification },
    onClose: () => {
      if (!actionClicked) {
        onClose?.();
      }
    },
  });

  return id;
}

export function hideNotification(id: string) {
  notifications.hide(id);
}

type ToastFn = ((message: ReactNode, options?: { type?: NotificationType }) => string) & {
  info: (message: ReactNode) => string;
  success: (message: ReactNode) => string;
  warn: (message: ReactNode) => string;
  error: (message: ReactNode) => string;
};

/** Shorthands for simple notifications without actions. */
export const toast: ToastFn = Object.assign(
  (message: ReactNode, options?: { type?: NotificationType }) => notify(message, options),
  {
    info: (message: ReactNode) => notify(message, { type: 'info' }),
    success: (message: ReactNode) => notify(message, { type: 'success' }),
    warn: (message: ReactNode) => notify(message, { type: 'warning' }),
    error: (message: ReactNode) => notify(message, { type: 'error' }),
  },
);
