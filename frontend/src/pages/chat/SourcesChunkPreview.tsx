import { ActionIcon, Blockquote, Button, Card, Group, Loader, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'src/components';
import { useDocumentContent } from 'src/hooks/api/files';
import { texts } from 'src/texts';
import classes from './SourcesChunkPreview.module.css';

export type SourcesChunkPreviewProps = {
  document: DocumentSource;
  onClose: () => void;
};

export type DocumentSource = {
  conversationId: number;
  messageId: number;
  documentUri: string;
};

export const SourcesChunkPreview = ({ onClose, document }: SourcesChunkPreviewProps) => {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useDocumentContent(
    document.conversationId,
    document.messageId,
    document.documentUri,
  );

  const container = (children: ReactNode) => (
    <Card withBorder mt="sm" mr="xs" ml="6">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500}>{t('chat.sources.content')}</Text>
          <ActionIcon onClick={onClose} variant="subtle" color="gray" aria-label={texts.accessibility.closeDialog}>
            <IconX aria-hidden="true" />
          </ActionIcon>
        </Group>
      </Card.Section>
      {children}
    </Card>
  );

  if (isError)
    return container(
      <Alert text={t('common.errorLoading')} className={classes.alert}>
        <Button color="red" size="compact-xs" variant="light" mt="sm" onClick={() => refetch()}>
          {t('common.tryAgain')}
        </Button>
      </Alert>,
    );

  if (isPending) return container(<Loader mx="auto" my={128} />);

  return container(
    data.map((chunk, index) => (
      <Blockquote key={index} mt="lg" p="md" className={classes.chunk}>
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {chunk}
        </Text>
      </Blockquote>
    )),
  );
};
