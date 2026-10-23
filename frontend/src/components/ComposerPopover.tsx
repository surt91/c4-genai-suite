import { Drawer, Popover } from '@mantine/core';
import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react';
import { useIsPhone } from 'src/hooks/useIsCompact';
import classes from './ComposerPopover.module.css';

interface ComposerPopoverProps extends PropsWithChildren {
  opened: boolean;
  onClose: () => void;
  // The button that opens the popover. It must handle the click itself.
  target: ReactNode;
  title: string;
  width?: number;
  // Focus the title instead of the first input when opened (e.g. to not open a select right away).
  focusTitle?: boolean;
  'data-testid'?: string;
}

// Dropdowns of inputs inside the popover (selects, date pickers) are rendered in portals, clicks there are inside.
const NESTED_DROPDOWNS = '.mantine-Popover-dropdown, .mantine-Combobox-dropdown, .mantine-Modal-root, [role="listbox"]';

/**
 * A popover above the composer for short selections (e.g. personal files, chat settings). On phones it is a bottom
 * sheet. Esc and a click outside close it.
 */
export function ComposerPopover(props: ComposerPopoverProps) {
  const { opened, onClose, target, title, width = 400, focusTitle, children } = props;
  const isPhone = useIsPhone();
  const targetRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!opened || isPhone) {
      return undefined;
    }

    const onPointerDown = (event: PointerEvent) => {
      const element = event.target as Element | null;
      if (
        !element ||
        dropdownRef.current?.contains(element) ||
        targetRef.current?.contains(element) ||
        element.closest?.(NESTED_DROPDOWNS)
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [opened, isPhone, onClose]);

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
      onDismiss={onClose}
      closeOnClickOutside={false}
      position="top-start"
      width={width}
      shadow="md"
      radius="md"
      trapFocus
      returnFocus
      withinPortal
      // the target is a wrapper, the buttons inside describe the popup themselves
      withRoles={false}
    >
      <Popover.Target>
        <div ref={targetRef} className={classes.target}>
          {target}
        </div>
      </Popover.Target>
      <Popover.Dropdown
        ref={dropdownRef}
        aria-label={title}
        role="dialog"
        data-testid={props['data-testid']}
        className={classes.dropdown}
      >
        <div className={classes.title} tabIndex={focusTitle ? -1 : undefined} data-autofocus={focusTitle || undefined}>
          {title}
        </div>
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}
