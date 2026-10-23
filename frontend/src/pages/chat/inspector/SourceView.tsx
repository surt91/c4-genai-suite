import { ActionIcon, Anchor, Button, Group, Loader, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import { Alert } from 'src/components';
import { PdfViewer } from 'src/components/PdfViewer';
import { useDocumentContent } from 'src/hooks/api/files';
import { texts } from 'src/texts';
import { InspectorSourceEntry, useInspectorActions } from '../state/inspector';
import classes from './Inspector.module.css';
import { citedPages, sourceName } from './titles';

/** The cited passages of a document, i.e. the chunks the answer is based on. */
export function SourcePassages({ entry }: { entry: InspectorSourceEntry }) {
  const source = entry.sources[entry.index];
  const { data, isPending, isError, refetch } = useDocumentContent(
    entry.conversationId,
    entry.messageId,
    source?.document?.uri ?? '',
  );

  if (!source?.document?.uri) {
    return source?.chunk.content ? (
      <blockquote className={classes.passage}>{source.chunk.content}</blockquote>
    ) : (
      <Text size="sm" c="dimmed">
        {texts.chat.inspector.noPassages}
      </Text>
    );
  }

  if (isError) {
    return (
      <Alert text={texts.common.errorLoading}>
        <Button color="red" size="compact-xs" variant="light" mt="sm" onClick={() => refetch()}>
          {texts.common.tryAgain}
        </Button>
      </Alert>
    );
  }

  if (isPending) {
    return <Loader mx="auto" my={64} />;
  }

  if (data.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {texts.chat.inspector.noPassages}
      </Text>
    );
  }

  return (
    <Stack gap="sm" data-testid="inspector-passages">
      {data.map((chunk, index) => (
        <blockquote key={index} className={classes.passage}>
          {chunk}
        </blockquote>
      ))}
    </Stack>
  );
}

export function SourceView({ entry }: { entry: InspectorSourceEntry }) {
  const { replaceTop } = useInspectorActions();
  const [tab, setTab] = useState<'text' | 'document'>('text');
  const [page, setPage] = useState<number>();
  const source = entry.sources[entry.index];

  if (!source) {
    return null;
  }

  const total = entry.sources.length;
  const pages = citedPages(source.metadata?.['pages']);
  const canShowDocument = !!source.document?.downloadAvailable && !!source.document.uri;
  const showDocument = canShowDocument && tab === 'document';

  const goTo = (index: number) => {
    setTab('text');
    setPage(undefined);
    replaceTop({ ...entry, index });
  };

  return (
    <div className={classes.section} data-testid="inspector-source">
      {total > 1 && (
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={entry.index === 0}
            onClick={() => goTo(entry.index - 1)}
            aria-label={texts.chat.inspector.previousSource}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text size="xs" c="dimmed" aria-live="polite">
            {texts.chat.inspector.sourcePosition(entry.index + 1, total)}
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={entry.index === total - 1}
            onClick={() => goTo(entry.index + 1)}
            aria-label={texts.chat.inspector.nextSource}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      )}

      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Stack gap={0} miw={0}>
          <Text size="sm" fw={600} truncate>
            {sourceName(source)}
          </Text>
          {pages.length > 0 && (
            <Text size="xs" c="dimmed">
              {texts.chat.inspector.pages(String(source.metadata?.['pages']))}
            </Text>
          )}
        </Stack>
        {source.document?.link && (
          <Tooltip label={texts.accessibility.openExternalLink(sourceName(source))}>
            <ActionIcon
              component="a"
              href={source.document.link}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="gray"
              aria-label={texts.accessibility.openExternalLink(sourceName(source))}
            >
              <IconExternalLink size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {canShowDocument && (
        <SegmentedControl
          size="xs"
          value={tab}
          onChange={(value) => setTab(value)}
          data={[
            { value: 'text', label: texts.chat.inspector.text },
            { value: 'document', label: texts.chat.inspector.document },
          ]}
          data-testid="inspector-source-tabs"
        />
      )}

      {showDocument ? (
        <>
          {pages.length > 1 && (
            <Group gap={4}>
              {pages.map((p) => (
                <Anchor key={p} component="button" type="button" size="xs" onClick={() => setPage(p)}>
                  {texts.chat.inspector.goToPage(p)}
                </Anchor>
              ))}
            </Group>
          )}
          <PdfViewer
            document={{ conversationId: entry.conversationId, messageId: entry.messageId, documentUri: source.document!.uri }}
            page={page ?? pages[0]}
          />
        </>
      ) : (
        <>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {texts.chat.inspector.citedPassages}
          </Text>
          <SourcePassages entry={entry} />
        </>
      )}
    </div>
  );
}
