import { Tooltip, TooltipProps } from '@mantine/core';
import { ReactNode } from 'react';
import classes from './DisabledAwareTooltip.module.css';

interface DisabledAwareTooltipProps extends Omit<TooltipProps, 'children'> {
  children: ReactNode;
}

/**
 * Mantine `Tooltip` for elements that can be disabled. Disabled buttons do not fire mouse events reliably, so the
 * tooltip is attached to a wrapping `span` that receives the pointer events of its disabled child.
 */
export function DisabledAwareTooltip({ children, ...props }: DisabledAwareTooltipProps) {
  return (
    <Tooltip {...props}>
      <span className={classes.wrapper}>{children}</span>
    </Tooltip>
  );
}
