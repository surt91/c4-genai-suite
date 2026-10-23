import { ActionIcon } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react';
import { DisabledAwareTooltip } from 'src/components/DisabledAwareTooltip';
import { texts } from 'src/texts';

interface TranscribeButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onToggle: () => void;
}

export function TranscribeButton({ isRecording, isTranscribing, onToggle }: TranscribeButtonProps) {
  const getButtonText = () => {
    if (isTranscribing) {
      return texts.chat.transcribe.transcribing;
    }
    if (isRecording) {
      return texts.chat.transcribe.stopRecording;
    }
    return texts.chat.transcribe.startRecording;
  };

  const getButtonColor = () => {
    if (isRecording) return 'red';
    return 'black';
  };

  return (
    <DisabledAwareTooltip label={getButtonText()}>
      <ActionIcon
        variant={isRecording ? 'filled' : 'outline'}
        size="lg"
        color={getButtonColor()}
        className={`border-gray-200 ${isRecording ? 'animate-pulse' : ''}`}
        onClick={onToggle}
        disabled={isTranscribing}
        loading={isTranscribing}
        aria-label={getButtonText()}
      >
        <IconMicrophone className="w-4" />
      </ActionIcon>
    </DisabledAwareTooltip>
  );
}
