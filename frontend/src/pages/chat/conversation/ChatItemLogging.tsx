import { clsx } from 'clsx';
import { memo, useState } from 'react';
import { Icon, Markdown } from 'src/components';
import { texts } from 'src/texts';
import classes from './ChatItemDetails.module.css';

export interface ChatItemLoggingProps {
  logging: string[];
}

export const ChatItemLogging = memo((props: ChatItemLoggingProps) => {
  const { logging } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCollapse = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      {logging?.length > 0 && (
        <div className={clsx(classes.box, classes.grayBox)}>
          <div className={classes.loggingHeader}>
            <p className={classes.loggingTitle}>{texts.chat.chunksInformation}</p>
            <button
              type="button"
              className={classes.loggingToggle}
              onClick={toggleCollapse}
              aria-label={texts.accessibility.toggleChunksInformation}
              aria-expanded={isExpanded}
            >
              <Icon icon={isExpanded ? 'collapse-up' : 'collapse-down'} size={16} />
            </button>
          </div>
          {isExpanded && (
            <div className={classes.loggingContent}>
              {logging.map((l, i) => (
                <Markdown key={i}>{l}</Markdown>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
