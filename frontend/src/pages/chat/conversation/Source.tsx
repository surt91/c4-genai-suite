import { ActionIcon, Anchor, Loader, Tooltip } from '@mantine/core';
import { IconExternalLink, IconInfoCircle, IconQuote } from '@tabler/icons-react';
import React, { useState } from 'react';

import { SourceDto } from 'src/api';
import { useDocumentContent } from 'src/hooks/api/files';
import { texts } from 'src/texts';
import { sourceName } from '../inspector/titles';
import classes from './ChatItemDetails.module.css';

interface SourceProps {
  index: number;
  source: SourceDto;
  conversationId: number;
  messageId: number;
  // Opens the source in the inspector.
  onOpen: () => void;
}

/** The cited passage of a source, shown inline for a quick look without opening the inspector. */
function Quote({ source, conversationId, messageId }: Omit<SourceProps, 'onOpen' | 'index'>) {
  const uri = source.chunk.content ? '' : (source.document?.uri ?? '');
  const { data, isPending } = useDocumentContent(conversationId, messageId, uri);
  const text = source.chunk.content || data?.[0];

  if (uri && isPending) {
    return (
      <div className={classes.quote} aria-busy>
        <Loader size={12} /> {texts.chat.sourcesQuote.loading}
      </div>
    );
  }

  if (!text) {
    return null;
  }

  return (
    <blockquote className={classes.quote} data-testid="source-quote">
      {text}
    </blockquote>
  );
}

const Source: React.FC<SourceProps> = ({ index, source, conversationId, messageId, onOpen }) => {
  const [showQuote, setShowQuote] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const metadataEntries = Object.entries(source.metadata ?? {}).filter(([key, value]) => key !== 'pages' && isValid(value));
  const name = sourceName(source);
  const pages = source.metadata?.['pages'] as string | undefined;
  const canOpen = !!source.document?.uri || !!source.chunk.content;
  const canQuote = !!source.document?.uri || !!source.chunk.content;

  return (
    <li className={classes.source}>
      <div className={classes.sourceRow}>
        <span className={classes.sourceIndex}>{index + 1}</span>
        {canOpen ? (
          <Anchor
            component="button"
            type="button"
            size="sm"
            className={classes.sourceTitle}
            onClick={onOpen}
            title={texts.chat.sourcesQuote.open(name)}
            data-testid="source-open"
          >
            {name}
          </Anchor>
        ) : (
          <span className={classes.sourceTitle}>{name}</span>
        )}
        {pages && <span className={classes.sourceMeta}>· {texts.chat.inspector.pages(pages)}</span>}
        <span className={classes.sourceActions}>
          {canQuote && (
            <Tooltip label={showQuote ? texts.chat.sourcesQuote.hide : texts.chat.sourcesQuote.show}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setShowQuote((x) => !x)}
                aria-label={showQuote ? texts.chat.sourcesQuote.hide : texts.chat.sourcesQuote.show}
                aria-expanded={showQuote}
                data-testid="source-quote-toggle"
              >
                <IconQuote size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {metadataEntries.length > 0 && (
            <Tooltip label={texts.accessibility.toggleMetadata(name)}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setShowMetadata((x) => !x)}
                aria-label={texts.accessibility.toggleMetadata(name)}
                aria-expanded={showMetadata}
              >
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {source.document?.link && (
            <Tooltip label={texts.accessibility.openExternalLink(name)}>
              <ActionIcon
                component="a"
                href={source.document.link}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={texts.accessibility.openExternalLink(name)}
              >
                <IconExternalLink size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </span>
      </div>
      {showQuote && <Quote source={source} conversationId={conversationId} messageId={messageId} />}
      {showMetadata && (
        <div className={classes.metadata}>
          <strong>{texts.chat.sources.metadata.metadata}:</strong>
          <div className={classes.metadataGrid}>
            {metadataEntries.map(([key, value]) => (
              <React.Fragment key={key}>
                <div className={classes.metadataKey}>{translateKey(key)}:</div>
                <div className={classes.metadataValue}>{String(value)}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </li>
  );
};

function isValid(value: unknown) {
  return value !== undefined && value !== null && value !== '';
}

function translateKey(key: string) {
  const mappedKey = texts.chat.sources.metadata[key as keyof typeof texts.chat.sources.metadata] || key;
  return mappedKey.replaceAll('_', ' ');
}

export default Source;
