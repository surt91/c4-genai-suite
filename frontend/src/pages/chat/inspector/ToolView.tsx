import { Group, Stack, Text } from '@mantine/core';
import { Markdown } from 'src/components';
import { StatusBadge } from 'src/components/ChatCard';
import { texts } from 'src/texts';
import { useStateOfMessage } from '../state/chat';
import { InspectorToolEntry } from '../state/inspector';
import classes from './Inspector.module.css';

/** The details of a tool call: its status, the error and the debug output of the answer. */
export function ToolView({ entry }: { entry: InspectorToolEntry }) {
  const message = useStateOfMessage(entry.conversationId, entry.messageId);
  const tool = message?.toolCalls?.find((t) => t.id === entry.toolId);

  if (!tool) {
    return (
      <Text size="sm" c="dimmed">
        {texts.chat.inspector.toolNoDetails}
      </Text>
    );
  }

  const debug = message?.debug ?? [];

  return (
    <Stack gap="md" data-testid="inspector-tool">
      <Group gap="xs">
        <Text size="sm" fw={600}>
          {tool.name}
        </Text>
        <StatusBadge status={tool.status} />
      </Group>
      {tool.error && (
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {texts.chat.inspector.toolError}
          </Text>
          <pre className={classes.pre}>{tool.error}</pre>
        </Stack>
      )}
      {debug.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {texts.chat.inspector.toolOutput}
          </Text>
          {debug.map((d, i) => (
            <Markdown key={i}>{d}</Markdown>
          ))}
        </Stack>
      )}
      {!tool.error && debug.length === 0 && (
        <Text size="sm" c="dimmed">
          {texts.chat.inspector.toolNoDetails}
        </Text>
      )}
    </Stack>
  );
}
