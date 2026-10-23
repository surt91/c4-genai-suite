import { memo } from 'react';
import { Markdown } from 'src/components';
import classes from './ChatItemDetails.module.css';

interface ChatItemDebugProps {
  // The debug records.
  debug: string[];
}

export const ChatItemDebug = memo((props: ChatItemDebugProps) => {
  const { debug } = props;

  return (
    <>
      {debug.length > 0 && (
        <div className={classes.box} data-testid="chat-item-debug">
          {debug.map((d, i) => (
            <Markdown key={i}>{d}</Markdown>
          ))}
        </div>
      )}
    </>
  );
});
