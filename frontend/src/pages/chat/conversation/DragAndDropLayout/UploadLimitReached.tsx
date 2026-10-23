import { IconFileXFilled } from '@tabler/icons-react';
import { clsx } from 'clsx';
import classes from './DragAndDropLayout.module.css';

export const UploadLimitReached = () => {
  return (
    <div className={clsx('fade-in', classes.overlay)}>
      <IconFileXFilled width={128} size={128} fill="#3C46FF" />
      <b>Upload limit reached</b>
      You can start a new converstation to upload other files or remove existing files.
    </div>
  );
};
