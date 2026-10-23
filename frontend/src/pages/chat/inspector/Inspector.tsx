import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { KeyboardEvent, useEffect, useRef } from 'react';
import { texts } from 'src/texts';
import { InspectorEntry, useInspectorActions, useInspectorCanGoBack, useInspectorTop } from '../state/inspector';
import { HelpView } from './HelpView';
import classes from './Inspector.module.css';
import { SourceView } from './SourceView';
import { ToolView } from './ToolView';
import { sourceTitle, useToolTitle } from './titles';

function useTitle(entry: InspectorEntry | undefined) {
  const toolTitle = useToolTitle(entry?.type === 'tool' ? entry : undefined);
  switch (entry?.type) {
    case 'source':
      return sourceTitle(entry);
    case 'tool':
      return toolTitle;
    case 'help':
      return texts.chat.inspector.help;
    default:
      return texts.chat.inspector.label;
  }
}

/**
 * The one side panel of the chat. It is closed by default and opens on demand with a detail view (a source, the details
 * of a tool call or the help). The views are a stack: opening another kind of view puts it on top, "back" returns to
 * the previous one.
 */
export function Inspector() {
  const top = useInspectorTop();
  const canGoBack = useInspectorCanGoBack();
  const { back, close } = useInspectorActions();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const title = useTitle(top);

  // Move the focus to the title when a view is opened, so that screen readers announce it.
  const topType = top?.type;
  useEffect(() => {
    if (topType) {
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [topType]);

  if (!top) {
    return null;
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      close();
    }
  };

  return (
    <aside className={classes.root} aria-label={texts.chat.inspector.label} data-testid="inspector" onKeyDown={onKeyDown}>
      <Group className={classes.header} gap="xs" wrap="nowrap">
        {canGoBack && (
          <Tooltip label={texts.chat.inspector.back}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={back}
              aria-label={texts.chat.inspector.back}
              data-testid="inspector-back"
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
          </Tooltip>
        )}
        <Title order={2} className={classes.title} ref={titleRef} tabIndex={-1} data-testid="inspector-title">
          {title}
        </Title>
        <Tooltip label={`${texts.chat.inspector.close} (Esc)`}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={close}
            aria-label={texts.chat.inspector.close}
            data-testid="inspector-close"
          >
            <IconX size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <div className={classes.body}>
        {top.type === 'source' && <SourceView entry={top} />}
        {top.type === 'tool' && <ToolView entry={top} />}
        {top.type === 'help' && <HelpView />}
      </div>
    </aside>
  );
}
