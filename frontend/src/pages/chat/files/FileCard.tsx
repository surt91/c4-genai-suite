import { Badge, Card } from '@mantine/core';
import { clsx } from 'clsx';
import { formatDate } from 'date-fns';
import { memo } from 'react';
import { FileDto } from 'src/api';
import { ConfirmDialog, Icon } from 'src/components';
import { OverlayDropdown } from 'src/components/Overlay';
import { formatFileSize } from 'src/lib';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';
import classes from './FileCard.module.css';
import { useFileIdSelector } from './useFileIdSelector';

interface FileCardProps {
  // The uploaded file.
  file: FileDto;

  // Invoked when deleted.
  onDelete: (file: FileDto) => void;

  // state manager for selecting files as user arguments
  fileIdSelector: ReturnType<typeof useFileIdSelector>;
}

export const FileCard = memo((props: FileCardProps) => {
  const { file, onDelete, fileIdSelector } = props;
  const { selectedIDs, toggleIdSelection, deselectId } = fileIdSelector;

  const removeFile = (file: FileDto) => {
    deselectId(file);
    onDelete(file);
  };

  return (
    <Card padding={0} radius="md" className={classes.card}>
      <div className={classes.body}>
        <div className={classes.header}>
          <Badge color="gray.2" c="black" tt="none" fw={400} radius="sm" size="lg">
            {extractType(file)}
          </Badge>
          <span>{formatFileSize(file.fileSize)}</span>
        </div>

        <div className={classes.name} title={file.fileName}>
          <input
            type="checkbox"
            checked={selectedIDs.includes(file.id)}
            onChange={() => toggleIdSelection(file)}
            aria-label={texts.accessibility.selectFile(file.fileName)}
          />
          {file.fileName}
        </div>
        <span>{formatDate(file.uploadedAt, 'Pp')}</span>

        <OverlayDropdown
          className={classes.menuTarget}
          button={({ isOpen }) => (
            <button className={clsx(classes.menuButton, isOpen && classes.menuButtonOpen)}>
              <Icon size={16} icon="more-horizontal" />
            </button>
          )}
        >
          <ul tabIndex={0} className={classes.menu}>
            <li>
              <ConfirmDialog
                title={texts.files.removeBucketConfirmTitle}
                text={texts.files.removeFileConfirmText}
                onPerform={() => removeFile(file)}
              >
                {({ onClick }) => <a onClick={onClick}>{texts.common.remove}</a>}
              </ConfirmDialog>
            </li>
          </ul>
        </OverlayDropdown>
      </div>
    </Card>
  );
});
