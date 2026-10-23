import { Loader } from '@mantine/core';
import { IconFile, IconTrash } from '@tabler/icons-react';
import React from 'react';
import { FileDto } from 'src/api';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';
import classes from './FileItem.module.css';

type FileItemProps = {
  file: FileDto | { fileName: string };
  onRemove?: (file: FileDto) => void;
  loading?: boolean;
};

export const FileItemComponent = ({ file, onRemove, loading }: FileItemProps) => {
  const fileName = file.fileName;
  const fileType = 'mimeType' in file ? extractType(file) : undefined;

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRemove && 'id' in file) {
      onRemove(file);
    }
  };

  return (
    <div className={classes.root} data-testid="file-chip">
      <div className={classes.content} data-testid={loading ? 'file-chip-uploading' : 'file-chip-uploaded'}>
        <div className={classes.icon}>
          {loading ? <Loader size={24} /> : <IconFile />}
          {fileType && <span className={classes.type}>{fileType}</span>}
        </div>

        <div className={classes.nameContainer}>
          <div className={classes.nameColumn}>
            <span className={classes.name}>{fileName}</span>
          </div>
        </div>

        {!loading && onRemove && (
          <div className={classes.remove}>
            <button className={classes.removeButton} onClick={handleRemove} aria-label={texts.chat.deleteFile(fileName)}>
              <IconTrash size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
