import { Button } from '@mantine/core';
import { IconChevronUp, IconFiles } from '@tabler/icons-react';
import { useState } from 'react';
import { ExtensionBucketSettingsDto, FileDto } from 'src/api';
import { ComposerPopover } from 'src/components/ComposerPopover';
import { texts } from 'src/texts';
import { Files } from './Files';
import { ManageFilesModal } from './ManageFilesModal';

interface MyFilesButtonProps {
  conversationId: number;
  configurationId: number;
  userBucket: ExtensionBucketSettingsDto;
  // The selected personal files.
  selectedFiles: FileDto[];
}

/** The chip "My files (n)" in the composer, which opens the selection of the personal files. */
export function MyFilesButton({ conversationId, configurationId, userBucket, selectedFiles }: MyFilesButtonProps) {
  const [opened, setOpened] = useState(false);
  const [managing, setManaging] = useState(false);
  const count = selectedFiles.length;

  return (
    <>
      <ComposerPopover
        opened={opened}
        onClose={() => setOpened(false)}
        title={texts.chat.myFiles.title}
        data-testid="my-files-popover"
        target={
          <Button
            variant={count > 0 ? 'light' : 'default'}
            size="compact-sm"
            radius="xl"
            leftSection={<IconFiles size={14} />}
            rightSection={<IconChevronUp size={12} />}
            onClick={() => setOpened((x) => !x)}
            aria-haspopup="dialog"
            aria-expanded={opened}
            data-testid="my-files-button"
          >
            {count > 0 ? texts.chat.myFiles.buttonCount(count) : texts.chat.myFiles.button}
          </Button>
        }
      >
        <Files
          conversationId={conversationId}
          configurationId={configurationId}
          userBucket={userBucket}
          onManage={() => {
            setOpened(false);
            setManaging(true);
          }}
        />
      </ComposerPopover>
      {managing && <ManageFilesModal conversationId={conversationId} onClose={() => setManaging(false)} />}
    </>
  );
}
