import { createContext, useContext } from 'react';

export interface DialogRequest {
  title: string;
  text: string;
  performText?: string;
  cancelText?: string;
  // Whether the action is destructive (red primary button), true by default.
  destructive?: boolean;
  onPerform: () => void;
  onCancel?: () => void;
}

export interface DialogContext {
  showDialog(request: DialogRequest): void;
}

export const DialogContext = createContext<DialogContext>(null!);

export function useDialog() {
  return useContext(DialogContext);
}
