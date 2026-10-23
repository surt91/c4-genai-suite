import { Loader } from '@mantine/core';
import { Markdown } from 'src/components';
import classes from './ChatItemDetails.module.css';

interface ChatItemToolsProps {
  // The tool that are currently running.
  tools: Record<string, 'Started' | 'Completed'>;
}

export function ChatItemTools(props: ChatItemToolsProps) {
  const { tools } = props;

  const entries = Object.entries(tools);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={classes.tools}>
      {Object.entries(tools).map(([name, state]) => (
        <div className={classes.tool} key={name}>
          <Markdown>{name}</Markdown>
          {state === 'Started' && <Loader size={16} color="gray.7" />}
        </div>
      ))}
    </div>
  );
}
