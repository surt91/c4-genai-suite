import { useInspectorStore } from './zustand/inspectorStore';

export type { InspectorEntry, InspectorHelpEntry, InspectorSourceEntry, InspectorToolEntry } from './zustand/inspectorStore';

/** The actions of the inspector (stable references). */
export const useInspectorActions = () => {
  const open = useInspectorStore((s) => s.open);
  const replaceTop = useInspectorStore((s) => s.replaceTop);
  const back = useInspectorStore((s) => s.back);
  const close = useInspectorStore((s) => s.close);
  const toggleHidden = useInspectorStore((s) => s.toggleHidden);
  return { open, replaceTop, back, close, toggleHidden };
};

/** The shown view of the inspector. */
export const useInspectorTop = () => useInspectorStore((s) => s.stack[s.stack.length - 1]);

/** Whether the inspector is open and visible. */
export const useIsInspectorOpen = () => useInspectorStore((s) => s.stack.length > 0 && !s.hidden);

/** Whether the inspector has views (it might be hidden). */
export const useInspectorHasViews = () => useInspectorStore((s) => s.stack.length > 0);

export const useInspectorCanGoBack = () => useInspectorStore((s) => s.stack.length > 1);

/** Whether the help is shown in the inspector. */
export const useIsHelpOpen = () => useInspectorStore((s) => s.stack[s.stack.length - 1]?.type === 'help' && !s.hidden);

/** The type of the shown view, read outside of rendering (e.g. in callbacks). */
export const getInspectorTopType = () => {
  const { stack } = useInspectorStore.getState();
  return stack[stack.length - 1]?.type;
};

/** Closes the inspector, e.g. with Esc in the message input. Returns false if it was not open. */
export const closeInspectorIfOpen = () => {
  const { stack, hidden, close } = useInspectorStore.getState();
  if (stack.length === 0 || hidden) {
    return false;
  }
  close();
  return true;
};
