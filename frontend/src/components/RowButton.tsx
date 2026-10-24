import { UnstyledButton } from '@mantine/core';
import { ReactNode } from 'react';
import classes from './RowButton.module.css';

interface RowButtonProps {
  // The content, which is also the accessible name of the button.
  children: ReactNode;

  // Invoked when clicked or activated with the keyboard.
  onClick: () => void;
}

/**
 * The primary cell of a clickable table row as a real button, so that the row can be opened with the keyboard and
 * screen readers. The row itself can still be clicked with the mouse.
 */
export function RowButton({ children, onClick }: RowButtonProps) {
  return (
    <UnstyledButton
      className={classes.button}
      onClick={(event) => {
        // the row has the same click handler
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </UnstyledButton>
  );
}
