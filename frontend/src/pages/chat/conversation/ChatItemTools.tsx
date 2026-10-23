import { Loader } from '@mantine/core';
import { Markdown } from 'src/components';
import { ToolCallState } from '../state/types';
import classes from './ChatItemDetails.module.css';

interface ChatItemToolsProps {
  // The tool calls of the answer.
  tools: ToolCallState[];
}

export function ChatItemTools(props: ChatItemToolsProps) {
  const { tools } = props;

  if (tools.length === 0) {
    return null;
  }

  return (
    <div className={classes.tools}>
      {tools.map(({ id, name, status }) => (
        <div className={classes.tool} key={id}>
          <Markdown>{name}</Markdown>
          {status === 'running' && <Loader size={16} color="gray.7" />}
        </div>
      ))}
    </div>
  );
}
