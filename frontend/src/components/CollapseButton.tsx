import { Tooltip } from '@mantine/core';
import { clsx } from 'clsx';
import { ButtonHTMLAttributes } from 'react';
import { isMobile } from 'src/pages/utils';
import classes from './CollapseButton.module.css';

interface CollapseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // The side of the button.
  side?: 'left' | 'right';

  // Indicates if the button is toggled.
  isToggled?: boolean;

  // The tooltip.
  tooltip?: string;
}

export function CollapseButton(props: CollapseButtonProps) {
  const { className, isToggled, side, tooltip, ...other } = props;

  return (
    <Tooltip label={tooltip} position={side === 'left' ? 'right' : 'left'} disabled={!tooltip}>
      <button
        className={clsx(className, classes.root)}
        data-side={side === 'left' ? 'left' : 'right'}
        data-toggled={isToggled || undefined}
        data-mobile={isMobile() || undefined}
        {...other}
        aria-label={tooltip}
      >
        <div className={classes.bars}>
          <div className={clsx(classes.bar, classes.top)}></div>
          <div className={clsx(classes.bar, classes.bottom)}></div>
        </div>
      </button>
    </Tooltip>
  );
}
