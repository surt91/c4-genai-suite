import { Loader } from '@mantine/core';
import { IconFile, IconFiles, IconTrash, IconX } from '@tabler/icons-react';
import React from 'react';
import { FileDto } from 'src/api';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';
import classes from './FileItem.module.css';

type FileItemProps = {
  file: FileDto | { fileName: string };
  onRemove?: (file: FileDto) => void;
  loading?: boolean;
  // A personal file selected for the chat (removing only deselects it) instead of an attachment of the chat.
  personal?: boolean;
};

export const FileItemComponent = ({ file, onRemove, loading, personal }: FileItemProps) => {
  const fileName = file.fileName;
  const fileType = 'mimeType' in file ? extractType(file) : undefined;

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRemove && 'id' in file) {
      onRemove(file);
    }
  };

  return (
    <div
      className={classes.root}
      data-testid="file-chip"
      data-origin={personal ? 'personal' : 'chat'}
      title={personal ? texts.chat.myFiles.personalFile : texts.chat.myFiles.chatFile}
    >
      <div className={classes.content} data-testid={loading ? 'file-chip-uploading' : 'file-chip-uploaded'}>
        <div className={classes.icon}>
          {loading ? <Loader size={24} /> : personal ? <IconFiles /> : <IconFile />}
          {fileType && <span className={classes.type}>{fileType}</span>}
        </div>

        <div className={classes.nameContainer}>
          <div className={classes.nameColumn}>
            <span className={classes.name}>{fileName}</span>
            <span className={classes.origin}>{personal ? texts.chat.myFiles.personalFile : texts.chat.myFiles.chatFile}</span>
          </div>
        </div>

        {!loading && onRemove && (
          <div className={classes.remove}>
            <button
              type="button"
              className={classes.removeButton}
              onClick={handleRemove}
              aria-label={personal ? texts.chat.myFiles.deselect(fileName) : texts.chat.deleteFile(fileName)}
            >
              {personal ? <IconX size={16} /> : <IconTrash size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
