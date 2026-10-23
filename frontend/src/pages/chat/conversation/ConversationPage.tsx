import { ActionIcon, Tooltip, VisuallyHidden } from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';

import { FileDto } from 'src/api';
import { useEventCallback, useTheme } from 'src/hooks';
import { useScrollToBottom } from 'src/hooks/useScrollToBottom';
import { useStateOfSelectedAssistant } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
import {
  useChatStream,
  useStateOfChat,
  useStateOfIsAiWriting,
  useStateOfIsWaitingForUser,
  useStateOfMessages,
} from '../state/chat';
import { useChatDropzone } from '../useChatDropzone';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { ChatRating } from './ChatRating';
import classes from './ConversationPage.module.css';
import { DragAndDropLayout } from './DragAndDropLayout/DragAndDropLayout';

interface ConversationPageProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function ConversationPage(props: ConversationPageProps) {
  const { textareaRef } = props;

  const chatParam = useParams<'id'>();
  const chatId = +chatParam.id!;
  const { sendMessage, stopMessage, isChatLoading } = useChatStream(chatId);
  const chat = useStateOfChat();
  const messages = useStateOfMessages();
  const isAiWriting = useStateOfIsAiWriting();
  const isWaitingForUser = useStateOfIsWaitingForUser();
  const assistant = useStateOfSelectedAssistant();

  const { theme } = useTheme();
  const { canScrollToBottom, scrollToBottom, containerRef } = useScrollToBottom([chat.id], [messages]);

  const isNewConversation = messages.length === 0 && !!history;

  const agentName = useMemo(() => {
    return assistant?.agentName || theme.agentName || texts.chat.sourceAI;
  }, [assistant?.agentName, theme.agentName]);

  const submitMessage = useEventCallback((input: string, uploadedFiles?: FileDto[], editMessageId?: number) => {
    sendMessage(input, uploadedFiles, editMessageId);
    setTimeout(() => scrollToBottom(), 500);
    return false;
  });
  const { uploadLimitReached, allowedFileNameExtensions, handleUploadFile, multiple } = useChatDropzone();
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    multiple,
    onDrop: handleUploadFile,
    noClick: true,
  });

  const scrollToBottomButtonRef = useRef<HTMLButtonElement>(null);

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
    textareaRef.current?.focus();
  }, [scrollToBottom, textareaRef]);

  const lastMessage = messages[messages.length - 1];
  const liveStatus = isWaitingForUser
    ? texts.chat.live.waiting
    : isAiWriting
      ? texts.chat.live.generating
      : lastMessage?.error
        ? texts.chat.live.error(lastMessage.error)
        : lastMessage?.stopped
          ? texts.chat.live.stopped
          : '';

  const showRateThisConversation = !isChatLoading && !chat.rating && messages.length > 10;
  const showScrollToBottomButton = canScrollToBottom && !isAiWriting;

  useEffect(() => {
    if (!showScrollToBottomButton && document.activeElement === scrollToBottomButtonRef.current) {
      textareaRef.current?.focus();
    }
  }, [showScrollToBottomButton, textareaRef]);
  return (
    <div className={classes.root} {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && (
        <>
          {isDragAccept && <>{uploadLimitReached ? <DragAndDropLayout.UploadLimitReached /> : <DragAndDropLayout.Accept />}</>}
          {isDragReject && <DragAndDropLayout.InvalidFileFormat allowedFileNameExtensions={allowedFileNameExtensions} />}
        </>
      )}
      <VisuallyHidden aria-live="polite" role="status" data-testid="chat-live-region">
        {liveStatus}
      </VisuallyHidden>
      {isChatLoading ? (
        <div className={clsx('fade-in', classes.loading)} />
      ) : (
        <>
          {messages.length > 0 && (
            <div className={clsx('fade-in overflow-anchor-none', classes.history)} ref={containerRef} data-testid="chat-history">
              <ChatHistory agentName={agentName} editMessage={submitMessage} />
            </div>
          )}
          <div className={clsx(classes.bottom, !messages.length && classes.grow)}>
            {!messages.length && <h2 className={classes.welcome}>{texts.chat.welcomeText}</h2>}
            <div
              className={clsx(
                'fade-in',
                classes.inputArea,
                (showScrollToBottomButton || showRateThisConversation) && 'white-shadow',
              )}
            >
              <div
                data-testid={'scrollToBottomButton'}
                aria-hidden={!showScrollToBottomButton}
                className={clsx(
                  classes.floating,
                  showScrollToBottomButton ? ['fade-in', classes.floatingVisible] : classes.scrollButtonHidden,
                )}
              >
                <Tooltip label={texts.common.scrollToBottom}>
                  <ActionIcon
                    ref={scrollToBottomButtonRef}
                    aria-label={texts.common.scrollToBottom}
                    tabIndex={showScrollToBottomButton ? 0 : -1}
                    onClick={handleScrollToBottom}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                </Tooltip>
              </div>
              <ChatInput
                textareaRef={textareaRef}
                chatId={chat.id}
                configuration={assistant}
                isDisabled={isAiWriting}
                isAiWriting={isAiWriting}
                isWaitingForUser={isWaitingForUser}
                isEmpty={isNewConversation}
                submitMessage={submitMessage}
                stopMessage={stopMessage}
              />
              <div
                className={clsx(
                  classes.floating,
                  showRateThisConversation ? ['fade-in', classes.floatingVisible] : classes.ratingHidden,
                )}
              >
                <ChatRating key={chatId} chatId={chatId} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
