import { ActionIcon, Button, Group, Tooltip } from '@mantine/core';
import { IconArrowUp, IconPaperclip, IconPlayerStopFilled } from '@tabler/icons-react';
import { clsx } from 'clsx';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { ConfigurationDto, FileDto } from 'src/api';
import { Markdown } from 'src/components';
import { DisabledAwareTooltip } from 'src/components/DisabledAwareTooltip';
import { ExtensionContext, JSONObject, useEventCallback, useExtensionContext, usePersistentState, useTheme } from 'src/hooks';
import { useUserBucket } from 'src/hooks/api/extensions';
import { useSpeechRecognitionToggle } from 'src/hooks/useSpeechRecognitionToggle';
import { useTranscribe } from 'src/hooks/useTranscribe';
import { FileItemComponent } from 'src/pages/chat/conversation/FileItem';
import { Language, SpeechRecognitionButton } from 'src/pages/chat/conversation/SpeechRecognitionButton';
import { TranscribeButton } from 'src/pages/chat/conversation/TranscribeButton';
import { MyFilesButton } from 'src/pages/chat/files/MyFilesButton';
import { texts } from 'src/texts';
import { closeInspectorIfOpen } from '../state/inspector';
import { useChatDropzone } from '../useChatDropzone';
import classes from './ChatInput.module.css';
import { ChatSettings } from './ChatSettings';
import { Suggestions } from './Suggestions';
import {
  getDefault,
  isExtensionWithUserArgs,
  UserArgumentDefaultValueByExtensionIDAndName,
  valueIsDefined,
  valueToString,
} from './chat-input-utils';

interface ChatInputProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  configuration?: ConfigurationDto;
  chatId: number;
  isDisabled?: boolean;
  isEmpty?: boolean;
  // Whether an answer is being generated, which can be stopped.
  isAiWriting?: boolean;
  // Whether the answer waits for the user (e.g. a confirmation).
  isWaitingForUser?: boolean;
  submitMessage: (input: string, files?: FileDto[]) => void;
  stopMessage?: () => void;
}
export function ChatInput({
  textareaRef,
  chatId,
  configuration,
  isDisabled,
  isEmpty,
  isAiWriting,
  isWaitingForUser,
  submitMessage,
  stopMessage,
}: ChatInputProps) {
  const extensionsWithFilter = configuration?.extensions?.filter(isExtensionWithUserArgs) ?? [];
  const { updateContext, context } = useExtensionContext(chatId);
  const {
    uploadingFiles,
    fullFileSlots,
    allowedFileNameExtensions,
    chatFiles,
    handleUploadFile,
    multiple,
    uploadLimitReached,
    refetchConversationFiles,
    uploadMutations,
    upload,
    userBucket,
    remove,
  } = useChatDropzone();

  // the personal files of the user (user bucket), selectable via "My files"
  const { userBucket: personalBucket } = useUserBucket(configuration?.id);

  const speechRecognitionLanguages: Language[] = [
    { name: texts.chat.speechRecognition.languages.de, code: 'de-DE' },
    { name: texts.chat.speechRecognition.languages.en, code: 'en-US' },
  ];

  const [speechLanguage, setSpeechLanguage] = usePersistentState<string>(
    'speechRecognitionLanguage',
    speechRecognitionLanguages[0].code,
  );

  const defaultValues = useMemo<UserArgumentDefaultValueByExtensionIDAndName>(
    () =>
      configuration?.extensions?.filter(isExtensionWithUserArgs).reduce(
        (prev, extension) => {
          prev[extension.id] = {};
          Object.keys(extension.userArguments).forEach((name) => {
            prev[extension.id][name] = getDefault(extension.userArguments[name]);
          });

          return prev;
        },
        {} as Record<string, JSONObject>,
      ) ?? {},
    [configuration?.extensions],
  );

  const { theme } = useTheme();
  const [input, setInput] = useState('');

  useEffect(() => {
    textareaRef?.current?.focus();
  }, [chatId, textareaRef]);

  const contextWithDefaults = context ?? defaultValues;
  const settingsChips = extensionsWithFilter.flatMap((extension) =>
    contextWithDefaults[extension.id]
      ? Object.entries(contextWithDefaults[extension.id] ?? {})
          .filter(valueIsDefined)
          .map(([key, value]) => `${extension?.userArguments[key]?.title}: ${valueToString(value)}`)
      : [],
  );

  const doSetInput = useEventCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  });

  const doSetText = useEventCallback((text: string, chatFiles?: FileDto[]) => {
    try {
      submitMessage(text, chatFiles);
    } finally {
      setInput('');
    }
  });

  const doSubmit = useEventCallback((event: React.FormEvent) => {
    if (isDisabled || !input.trim() || upload.status === 'pending') {
      return;
    }
    doSetText(input, chatFiles);
    event.preventDefault();
    void refetchConversationFiles();
  });

  const canStop = !!isAiWriting && !!stopMessage;

  const showWaitingRequest = () => {
    const cards = document.querySelectorAll<HTMLElement>(
      '[data-testid="chat-card-form"][data-status="waiting"], [data-testid="chat-card-url"][data-status="waiting"], [data-testid="chat-card-url"][data-status="opened"]',
    );
    const card = cards[cards.length - 1];
    card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card?.focus({ preventScroll: true });
  };

  const doStop = useEventCallback(() => {
    stopMessage?.();
    textareaRef?.current?.focus();
  });

  const doKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter also confirms the candidates of input method editors (e.g. Japanese), which must not send the message.
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.nativeEvent.isComposing) {
      doSubmit(event);
    } else if (event.key === 'Escape') {
      // Esc closes the inspector first and stops the generation afterwards.
      if (closeInspectorIfOpen()) {
        event.preventDefault();
      } else if (canStop) {
        event.preventDefault();
        doStop();
      }
    }
  });

  const doUpdate = (newContext: ExtensionContext) => updateContext(newContext);

  const handleUploadFileFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    handleUploadFile(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const filesToUpload = [] as File[];
      for (let i = 0; i < items.length; i++) {
        const blob = items[i].getAsFile();

        if (!blob) {
          continue;
        }

        filesToUpload.push(blob);
      }

      if (filesToUpload.length) {
        event.preventDefault();
        handleUploadFile(filesToUpload);
      }
    },
    [handleUploadFile],
  );

  useEffect(() => {
    window.addEventListener('paste', handleFilePaste as EventListener);

    return () => {
      window.removeEventListener('paste', handleFilePaste as EventListener);
    };
  }, [handleFilePaste]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const footer = `${configuration?.chatFooter || ''} ${theme.chatFooter || ''}`.trim();

  const { toggleSpeechRecognition, listening } = useSpeechRecognitionToggle({
    speechLanguage,
    onTranscriptUpdate: setInput,
  });

  const voiceExtensions =
    configuration?.extensions?.filter((e) => e.name === 'speech-to-text' || e.name === 'transcribe-azure') ?? [];
  const activeVoiceExtension = voiceExtensions[0];
  const showSpeechToText = activeVoiceExtension?.name === 'speech-to-text';
  const showTranscribe = activeVoiceExtension?.name === 'transcribe-azure';

  // Transcribe extension setup
  const transcribeExtension = showTranscribe ? activeVoiceExtension : undefined;
  const transcribeHook = useTranscribe({
    extensionId: transcribeExtension?.id ?? 0,
    onTranscriptReceived: setInput,
  });
  const { isRecording, isTranscribing, toggleRecording } = transcribeHook;

  return (
    <>
      <div className={classes.root}>
        {fullFileSlots?.map((slot, index) => (
          <div className={classes.uploadLimit} key={index}>
            {texts.common.uploadLimit(slot.maxFiles, slot.extensionTitle)}
          </div>
        ))}

        {isEmpty && <Suggestions configuration={configuration} theme={theme} onSelect={setInput} />}

        {isWaitingForUser && (
          <Button
            variant="light"
            color="yellow"
            c="dark.8"
            size="xs"
            className={classes.waitingHint}
            leftSection={<IconArrowUp size={14} />}
            onClick={showWaitingRequest}
            data-testid="composer-waiting-hint"
          >
            {texts.chat.cards.waitingHint} · {texts.chat.cards.waitingHintAction}
          </Button>
        )}

        <div className={classes.wrap}>
          {chatFiles.map((file) => (
            <FileItemComponent key={file.id} file={file} onRemove={remove} personal={file.bucketType === 'user'} />
          ))}
          {uploadingFiles.map((file, n) => (
            <FileItemComponent key={`${n}-${file.name}`} file={{ fileName: file.name }} loading={true} />
          ))}
        </div>

        <form onSubmit={doSubmit}>
          <div className={classes.inputBox}>
            <Group gap={6} className={classes.context} data-testid="composer-context">
              <ChatSettings
                configuration={configuration}
                extensionsWithFilter={extensionsWithFilter}
                context={context}
                defaultValues={defaultValues}
                onUpdateContext={doUpdate}
                chips={settingsChips}
              />
              {personalBucket && configuration && (
                <MyFilesButton
                  conversationId={chatId}
                  configurationId={configuration.id}
                  userBucket={personalBucket}
                  selectedFiles={chatFiles.filter((file) => file.bucketType === 'user')}
                />
              )}
            </Group>
            <TextareaAutosize
              className={classes.textarea}
              maxRows={15}
              minRows={1}
              value={input}
              autoFocus
              onChange={doSetInput}
              onKeyDown={doKeyDown}
              placeholder={texts.chat.placeholder(configuration?.name ?? '')}
              ref={textareaRef}
              aria-label={texts.accessibility.chatMessageInput}
            />
            <div className={classes.toolbar}>
              <div className={classes.actions}>
                {userBucket?.extensions && userBucket.extensions.length > 0 && (
                  <>
                    <input
                      type="file"
                      id="file-upload"
                      data-testid="file-upload"
                      ref={fileInputRef}
                      className={classes.fileInput}
                      multiple={multiple}
                      onChange={handleUploadFileFromInput}
                      accept={allowedFileNameExtensions?.join(', ') ?? undefined}
                      disabled={uploadLimitReached}
                      aria-label={texts.common.attachFile}
                    />
                    <label
                      htmlFor="file-upload"
                      className={clsx(classes.attachLabel, uploadLimitReached && classes.attachDisabled)}
                    >
                      <Tooltip label={texts.common.attachFile}>
                        <ActionIcon
                          component="div"
                          size="lg"
                          variant="outline"
                          color="black"
                          disabled={uploadLimitReached}
                          aria-hidden
                          className={clsx(uploadLimitReached && classes.attachDisabled)}
                        >
                          <IconPaperclip size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </label>
                  </>
                )}
              </div>
              <div className={classes.submitActions}>
                {showSpeechToText ? (
                  <SpeechRecognitionButton
                    listening={listening}
                    toggleSpeechRecognition={toggleSpeechRecognition}
                    speechLanguage={speechLanguage}
                    setSpeechLanguage={setSpeechLanguage}
                    languages={speechRecognitionLanguages}
                  />
                ) : showTranscribe ? (
                  <TranscribeButton isRecording={isRecording} isTranscribing={isTranscribing} onToggle={toggleRecording} />
                ) : null}
                {canStop ? (
                  <Tooltip label={`${texts.chat.stopGeneration} (Esc)`}>
                    <ActionIcon
                      type="button"
                      size="lg"
                      onClick={doStop}
                      data-testid="chat-stop-button"
                      aria-label={texts.chat.stopGeneration}
                    >
                      <IconPlayerStopFilled size={16} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <DisabledAwareTooltip label={texts.common.send}>
                    <ActionIcon
                      type="submit"
                      size="lg"
                      disabled={!input.trim() || isDisabled || uploadMutations.some((m) => m.status === 'pending') || listening}
                      data-testid="chat-submit-button"
                      aria-label={texts.common.send}
                    >
                      <IconArrowUp />
                    </ActionIcon>
                  </DisabledAwareTooltip>
                )}
              </div>
            </div>
          </div>
        </form>

        {footer && <Markdown className={classes.footer}>{footer}</Markdown>}
      </div>
    </>
  );
}
