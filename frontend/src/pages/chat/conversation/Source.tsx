import { Anchor } from '@mantine/core';
import React, { useState } from 'react';

import { SourceDto } from 'src/api';
import { Icon } from 'src/components';
import { texts } from 'src/texts';
import { useStateOfSelectedSource } from '../state/chat';
import classes from './ChatItemDetails.module.css';

const Source: React.FC<{
  source: SourceDto;
  selectDocument: (documentUri: string) => void;
}> = ({ source, selectDocument }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadataEntries = Object.entries(source.metadata ?? {}).filter(([, value]) => isValid(value));

  const hasMetadata = metadataEntries.length > 0;
  const toggle = () => setIsExpanded((e) => !e);
  const sourceChunksAvailable = !!source.document?.uri;

  const { setSelectedSource } = useStateOfSelectedSource();

  return (
    <li className={classes.source} onClick={toggle}>
      <div className={classes.sourceRow}>
        <div className={classes.sourceTitle}>
          {hasMetadata && (
            <span className={classes.expander} data-expanded={isExpanded || undefined}>
              ▶
            </span>
          )}
          {sourceChunksAvailable ? (
            <Anchor
              size="sm"
              onClick={(e) => {
                selectDocument(source.document?.uri ?? '');
                setSelectedSource(source);
                e.stopPropagation();
              }}
            >
              {source.metadata?.title ? source.metadata?.title : source.title}
            </Anchor>
          ) : (
            <span>{source.metadata?.title ? source.metadata?.title : source.title}</span>
          )}
        </div>
        {source.document?.link && (
          <a
            href={source.document.link}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.externalLink}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className={classes.externalIcon} icon="external-link" size={16} />
          </a>
        )}
      </div>
      {hasMetadata && isExpanded && (
        <div className={classes.metadata}>
          <strong>{texts.chat.sources.metadata.metadata}:</strong>
          <div className={classes.metadataGrid}>
            {metadataEntries.map(([key, value]) => {
              return (
                <React.Fragment key={key}>
                  <div className={classes.metadataKey}>{translateKey(key)}:</div>
                  <div className={classes.metadataValue}>{value}</div>
                </React.Fragment>
              );
            })}
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
