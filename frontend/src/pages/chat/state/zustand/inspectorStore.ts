import { create } from 'zustand';
import { SourceDto } from 'src/api';

/** The sources of an answer, `index` is the shown one. */
export type InspectorSourceEntry = {
  type: 'source';
  conversationId: number;
  messageId: number;
  sources: SourceDto[];
  index: number;
};

/** The details of a tool call of an answer. */
export type InspectorToolEntry = {
  type: 'tool';
  conversationId: number;
  messageId: number;
  toolId: string;
};

type InspectorHelpEntry = { type: 'help' };

export type InspectorEntry = InspectorSourceEntry | InspectorToolEntry | InspectorHelpEntry;

type InspectorState = {
  // The stack of detail views, the last one is shown. The inspector is closed when the stack is empty.
  stack: InspectorEntry[];
  // The element that opened the inspector, it gets the focus back when the inspector is closed.
  trigger?: HTMLElement | null;
  // Whether the inspector is hidden temporarily (the views are kept and can be shown again).
  hidden: boolean;
};

type InspectorActions = {
  // Shows a detail view. When the same kind of view is shown already, it is replaced, otherwise it is put on the stack.
  open: (entry: InspectorEntry) => void;
  // Updates the shown view (e.g. to show another source of the same answer).
  replaceTop: (entry: InspectorEntry) => void;
  // Goes back to the previous view, closes the inspector if there is none.
  back: () => void;
  close: () => void;
  // Hides or shows the inspector without closing its views.
  toggleHidden: () => void;
};

function isSameView(a: InspectorEntry | undefined, b: InspectorEntry) {
  if (!a || a.type !== b.type) {
    return false;
  }
  if (a.type === 'source' && b.type === 'source') {
    return a.messageId === b.messageId;
  }
  if (a.type === 'tool' && b.type === 'tool') {
    return a.messageId === b.messageId && a.toolId === b.toolId;
  }
  return true;
}

export const useInspectorStore = create<InspectorState & InspectorActions>()((set, get) => ({
  stack: [],
  trigger: undefined,
  hidden: false,

  open: (entry) => {
    const { stack } = get();
    const top = stack[stack.length - 1];
    const trigger = stack.length === 0 ? (document.activeElement as HTMLElement | null) : get().trigger;

    if (isSameView(top, entry)) {
      set({ stack: [...stack.slice(0, -1), entry], trigger, hidden: false });
    } else {
      // keep only one help entry: it does not depend on anything in the conversation
      set({
        stack: [...stack.filter((x) => !(x.type === 'help' && entry.type === 'help')), entry],
        trigger,
        hidden: false,
      });
    }
  },

  replaceTop: (entry) => {
    const { stack } = get();
    if (stack.length > 0) {
      set({ stack: [...stack.slice(0, -1), entry] });
    }
  },

  back: () => {
    const { stack } = get();
    if (stack.length <= 1) {
      get().close();
    } else {
      set({ stack: stack.slice(0, -1) });
    }
  },

  close: () => {
    const { trigger } = get();
    set({ stack: [], trigger: undefined, hidden: false });
    if (trigger && trigger.isConnected) {
      trigger.focus();
    }
  },

  toggleHidden: () => {
    if (get().stack.length > 0) {
      set({ hidden: !get().hidden });
    }
  },
}));
