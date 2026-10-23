import { IconCheck, IconChevronDown, IconChevronUp, IconRefresh } from '@tabler/icons-react';
import { memo, useState } from 'react';
import { Markdown } from 'src/components';
import { texts } from 'src/texts';
import classes from './ChatItemDetails.module.css';

interface ReasoningLoadingIndicatorProps {
  message: string;
  inProgress?: boolean;
}

export const ReasoningLoadingIndicator = memo(({ message, inProgress }: ReasoningLoadingIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={classes.reasoning}>
      <div className={classes.reasoningRow}>
        <div className={classes.reasoningIcon}>
          {inProgress && <IconRefresh size={20} className={classes.spinning} />}
          {!inProgress && <IconCheck size={20} className={classes.done} />}
        </div>

        <div className={classes.reasoningBody}>
          <div className={classes.reasoningHeader}>
            <p className={classes.reasoningTitle}>{texts.chat.reasoning}</p>
            <button
              onClick={toggleExpanded}
              className={classes.reasoningToggle}
              aria-label={isExpanded ? texts.common.collapse : texts.common.expand}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <IconChevronUp size={16} className={classes.chevron} />
              ) : (
                <IconChevronDown size={16} className={classes.chevron} />
              )}
            </button>
          </div>

          <div className={classes.reasoningContent} data-expanded={isExpanded || undefined}>
            <Markdown animateText={true} className={classes.reasoningMarkdown}>
              {message}
            </Markdown>
          </div>
        </div>
      </div>
    </div>
  );
});
