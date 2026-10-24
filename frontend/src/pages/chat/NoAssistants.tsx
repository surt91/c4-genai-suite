import { Anchor, Button, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconExternalLink, IconMessageChatbot, IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';

const QUICKSTART_URL = 'https://github.com/surt91/gaible#quickstart';

/**
 * Shown in the chat area when there is no assistant the user can chat with (e.g. on a fresh installation):
 * admins get the way to create one, everybody else a hint to contact an administrator.
 */
export function NoAssistants() {
  const { isAdmin } = useProfile();

  return (
    <Stack align="center" justify="center" gap="md" h="100%" p="xl" maw={560} mx="auto" ta="center" data-testid="no-assistants">
      <ThemeIcon variant="light" size={56} radius="xl" aria-hidden>
        <IconMessageChatbot size={32} />
      </ThemeIcon>
      <Title order={2} size="h3">
        {texts.chat.noAssistants.title}
      </Title>
      {isAdmin ? (
        <>
          <Text c="dimmed">{texts.chat.noAssistants.adminText}</Text>
          <Button component={Link} to="/admin/assistants" leftSection={<IconPlus size={16} />}>
            {texts.chat.noAssistants.createAssistant}
          </Button>
          <Anchor href={QUICKSTART_URL} target="_blank" rel="noopener noreferrer" size="sm">
            {texts.chat.noAssistants.quickstart} <IconExternalLink size={12} aria-hidden />
          </Anchor>
        </>
      ) : (
        <Text c="dimmed">{texts.chat.noAssistants.userText}</Text>
      )}
    </Stack>
  );
}
