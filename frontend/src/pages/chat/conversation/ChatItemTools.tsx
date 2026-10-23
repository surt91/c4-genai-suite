import { Button, Stack, Text } from '@mantine/core';
import { IconTool } from '@tabler/icons-react';
import { ChatInteractionDto } from 'src/api';
import { ChatCard } from 'src/components/ChatCard';
import { texts } from 'src/texts';
import { useInspectorActions } from '../state/inspector';
import { ToolCallState } from '../state/types';
import classes from './ChatItem/ChatItem.module.css';

/** The tool calls of a stored answer: the used tools and the failed ones (from the stored interactions). */
// eslint-disable-next-line react-refresh/only-export-components
export function storedToolCalls(tools?: string[], interactions?: ChatInteractionDto[]): ToolCallState[] {
  const errors = (interactions ?? []).filter((i) => i.kind === 'tool_error');
  const remainingErrors = [...errors];
  const result: ToolCallState[] = (tools ?? []).map((name, index) => {
    const errorIndex = remainingErrors.findIndex((e) => e.source === name);
    const error = errorIndex >= 0 ? remainingErrors.splice(errorIndex, 1)[0] : undefined;
    return error
      ? { id: error.id, name, status: 'error', error: error.error }
      : { id: `${name}-${index}`, name, status: 'success' };
  });
  return [
    ...result,
    ...remainingErrors.map((e) => ({ id: e.id, name: e.source ?? '', status: 'error' as const, error: e.error })),
  ];
}

interface ChatItemToolsProps {
  conversationId: number;
  messageId: number;
  // The tool calls of the answer.
  tools: ToolCallState[];
}

/** One card per tool call with its status; failed calls show the error, the details open in the inspector. */
export function ChatItemTools({ conversationId, messageId, tools }: ChatItemToolsProps) {
  const { open } = useInspectorActions();

  if (tools.length === 0) {
    return null;
  }

  return (
    <Stack gap={6} className={classes.tools}>
      {tools.map((tool) => (
        <ChatCard
          key={tool.id}
          compact
          icon={<IconTool size={16} />}
          title={tool.name}
          status={tool.status}
          data-testid="tool-card"
          actions={
            tool.status === 'error' ? (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => open({ type: 'tool', conversationId, messageId, toolId: tool.id })}
                aria-label={texts.chat.tools.detailsOf(tool.name)}
              >
                {texts.chat.tools.details}
              </Button>
            ) : undefined
          }
        >
          {tool.status === 'error' && tool.error && (
            <Text size="xs" c="red.8" lineClamp={2} className={classes.toolError}>
              {texts.chat.tools.failed(tool.error)}
            </Text>
          )}
        </ChatCard>
      ))}
    </Stack>
  );
}
