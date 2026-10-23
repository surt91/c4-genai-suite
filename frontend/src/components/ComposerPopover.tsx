import { Drawer, Popover } from '@mantine/core';
import { PropsWithChildren, ReactNode } from 'react';
import { useIsPhone } from 'src/hooks/useIsCompact';
import classes from './ComposerPopover.module.css';

interface ComposerPopoverProps extends PropsWithChildren {
  opened: boolean;
  onClose: () => void;
  // The button that opens the popover. It must handle the click itself.
  target: ReactNode;
  title: string;
  width?: number;
  'data-testid'?: string;
}

/**
 * A popover above the composer for short selections (e.g. personal files, chat settings). On phones it is a bottom
 * sheet. Esc and a click outside close it.
 */
export function ComposerPopover(props: ComposerPopoverProps) {
  const { opened, onClose, target, title, width = 400, children } = props;
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <>
        {target}
        <Drawer
          opened={opened}
          onClose={onClose}
          position="bottom"
          size="auto"
          title={<b>{title}</b>}
          classNames={{ content: classes.sheet }}
          data-testid={props['data-testid']}
        >
          {children}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      opened={opened}
      onChange={(value) => !value && onClose()}
      onDismiss={onClose}
      position="top-start"
      width={width}
      shadow="md"
      radius="md"
      trapFocus
      returnFocus
      withinPortal
    >
      <Popover.Target>{target}</Popover.Target>
      <Popover.Dropdown aria-label={title} role="dialog" data-testid={props['data-testid']} className={classes.dropdown}>
        <div className={classes.title}>{title}</div>
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}
