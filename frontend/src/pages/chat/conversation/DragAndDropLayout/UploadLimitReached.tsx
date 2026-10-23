import { IconFileXFilled } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { texts } from 'src/texts';
import classes from './DragAndDropLayout.module.css';

export const UploadLimitReached = () => {
  return (
    <div className={clsx('fade-in', classes.overlay)}>
      <IconFileXFilled width={128} size={128} fill="#3C46FF" />
      <b>{texts.chat.dragAndDrop.uploadLimitReached}</b>
      {texts.chat.dragAndDrop.uploadLimitReachedHint}
    </div>
  );
};
