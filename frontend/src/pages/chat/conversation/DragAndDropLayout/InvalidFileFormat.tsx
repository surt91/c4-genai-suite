import { Code, Flex } from '@mantine/core';
import { IconFileXFilled } from '@tabler/icons-react';
import { clsx } from 'clsx';
import classes from './DragAndDropLayout.module.css';

export const InvalidFileFormat = ({ allowedFileNameExtensions }: { allowedFileNameExtensions: string[] }) => {
  return (
    <div className={clsx('fade-in', classes.overlay)}>
      <IconFileXFilled width={128} size={128} fill="#3C46FF" />
      <b>File type not supported.</b>
      Accepted formats:{' '}
      <Flex gap={'xs'}>
        {allowedFileNameExtensions?.map((fileType, index) => (
          <Code key={index}>{fileType}</Code>
        ))}
      </Flex>
    </div>
  );
};
