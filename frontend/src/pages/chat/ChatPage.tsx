import { Button, Drawer } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { IconEdit } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { Route, Routes } from 'react-router-dom';

import { ProfileButton } from 'src/components';
import { useDocsContext } from 'src/components/InAppDocsProvider';
import { NavigationBar } from 'src/components/NavigationBar';
import { useSidebarState, useTheme } from 'src/hooks';
import { useUserBucket } from 'src/hooks/api/extensions';
import { useConversationFiles } from 'src/hooks/api/files';
import { useIsCompact } from 'src/hooks/useIsCompact';
import { useListOfAllAssistantsInit, useListOfEnabledAssistantsInit } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
import classes from './ChatPage.module.css';
import { ConversationItems } from './ConversationItems';
import { NewChatRedirect } from './NewChatRedirect';
import { ConversationHeader } from './conversation/ConversationHeader';
import { ConversationPage } from './conversation/ConversationPage';
import { Inspector } from './inspector/Inspector';
import { useStateOfSelectedAssistantId, useStateOfSelectedChatId } from './state/chat';
import {
  getInspectorTopType,
  useInspectorActions,
  useInspectorHasViews,
  useIsHelpOpen,
  useIsInspectorOpen,
} from './state/inspector';
import { useListOfChatsInit, useMutateNewChat, useStateMutateRemoveAllChats, useStateOfChatEmptiness } from './state/listOfChats';

const ResizeHandle = () => (
  <Separator className={classes.resizeHandle}>
    <div className={classes.resizeHandleGrip} />
  </Separator>
);

export function ChatPage() {
  const { theme } = useTheme();
  const isCompact = useIsCompact();

  const { hasNoAssistants } = useListOfEnabledAssistantsInit();
  useListOfAllAssistantsInit();
  useListOfChatsInit();

  const selectedAssistantId = useStateOfSelectedAssistantId();
  const { userBucket } = useUserBucket(selectedAssistantId);
  const checkIfEmptyChat = useStateOfChatEmptiness();
  const selectedChatId = useStateOfSelectedChatId();
  const removeAllChats = useStateMutateRemoveAllChats();
  const createNewChat = useMutateNewChat();

  // On wide screens the chat list is a column that can be collapsed (stored), on small screens a drawer (closed).
  const [chatListPinned, setChatListPinned] = useSidebarState('sidebar-left');
  // The drawer belongs to the chat it was opened in, so it is closed when another chat is selected.
  const [chatListDrawerChatId, setChatListDrawerChatId] = useState<typeof selectedChatId | null>(null);
  const chatListDrawer = chatListDrawerChatId === selectedChatId;
  const setChatListDrawer = (open: boolean) => setChatListDrawerChatId(open ? selectedChatId : null);
  const isChatListOpen = isCompact ? chatListDrawer : chatListPinned;
  const toggleChatList = () => (isCompact ? setChatListDrawer(!chatListDrawer) : setChatListPinned(!chatListPinned));

  const isInspectorOpen = useIsInspectorOpen();
  const inspectorHasViews = useInspectorHasViews();
  const {
    close: closeInspector,
    toggleHidden: toggleInspector,
    open: openInspector,
    back: backInspector,
  } = useInspectorActions();

  const { clear: clearBucketFiles } = useConversationFiles(selectedChatId);

  useEffect(() => {
    clearBucketFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBucket]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openNewChatIfNeeded = async () => {
    setChatListDrawer(false);
    if (selectedChatId) {
      if (await checkIfEmptyChat(selectedChatId)) textareaRef.current?.focus();
      else createNewChat.mutate(selectedAssistantId);
    }
  };

  // The details belong to the conversation, close them when another one is selected.
  useEffect(() => {
    closeInspector();
  }, [selectedChatId, closeInspector]);

  // The help is shown in the inspector (the one side panel of the chat).
  const { setDocsHost } = useDocsContext();
  const isHelpOpen = useIsHelpOpen();
  useEffect(() => {
    setDocsHost({
      isOpen: isHelpOpen,
      toggle: () => {
        if (getInspectorTopType() === 'help') {
          backInspector();
        } else {
          openInspector({ type: 'help' });
        }
      },
    });
  }, [isHelpOpen, setDocsHost, openInspector, backInspector]);
  useEffect(() => () => setDocsHost(undefined), [setDocsHost]);

  useHotkeys(
    [
      ['mod+.', () => toggleInspector()],
      ['mod+shift+o', () => void openNewChatIfNeeded()],
    ],
    [],
  );

  const panelIds = useMemo(
    () => [...(isChatListOpen ? ['left'] : []), 'center', ...(isInspectorOpen ? ['right'] : [])],
    [isChatListOpen, isInspectorOpen],
  );
  const layout = useDefaultLayout({ id: 'chat-layout', panelIds, storage: localStorage, onlySaveAfterUserInteractions: true });

  const chatList = (
    <nav aria-label={texts.common.conversations} className={classes.nav}>
      <div className={classes.section}>
        <Button
          variant="subtle"
          p="xs"
          onClick={openNewChatIfNeeded}
          fullWidth
          justify="space-between"
          rightSection={<IconEdit size={16} />}
        >
          {texts.chat.newChat}
        </Button>
      </div>
      <div className={classes.conversations}>
        <ConversationItems />
      </div>
      <div className={classes.section}>
        <ProfileButton section="chat" onClearConversations={removeAllChats.mutate} />
      </div>
    </nav>
  );

  const main = (
    <main className={clsx('chat-main', classes.main)}>
      <ConversationHeader
        isChatListOpen={isChatListOpen}
        onToggleChatList={toggleChatList}
        showNewChat={isCompact || !isChatListOpen}
        onNewChat={openNewChatIfNeeded}
        hasDetails={inspectorHasViews}
        isDetailsOpen={isInspectorOpen}
        onToggleDetails={toggleInspector}
      />
      <div className={classes.conversation}>
        <Routes>
          <Route path="" element={<NewChatRedirect hasNoAssistants={hasNoAssistants} />} />
          <Route path=":id" element={<ConversationPage textareaRef={textareaRef} />} />
        </Routes>
      </div>
    </main>
  );

  return (
    <div className={classes.root}>
      <header>
        <NavigationBar theme={theme} />
      </header>
      {isCompact ? (
        <>
          {main}
          <Drawer
            opened={chatListDrawer}
            onClose={() => setChatListDrawer(false)}
            position="left"
            size="85%"
            withCloseButton={false}
            padding={0}
            classNames={{ body: classes.drawerBody, content: classes.drawerContent }}
            data-testid="chat-list-drawer"
          >
            <div className={clsx('chat-conversations', classes.leftPanel)}>{chatList}</div>
          </Drawer>
          <Drawer
            opened={isInspectorOpen}
            onClose={closeInspector}
            position="right"
            size="100%"
            withCloseButton={false}
            padding={0}
            classNames={{ body: classes.drawerBody }}
            closeOnEscape={false}
          >
            <Inspector />
          </Drawer>
        </>
      ) : (
        <Group
          orientation="horizontal"
          className={classes.group}
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
        >
          {isChatListOpen && (
            <>
              <Panel
                className={clsx('chat-conversations', classes.leftPanel)}
                id="left"
                defaultSize="16%"
                minSize="180px"
                maxSize="40%"
              >
                {chatList}
              </Panel>
              <ResizeHandle />
            </>
          )}
          <Panel id="center" minSize="360px">
            {main}
          </Panel>
          {isInspectorOpen && (
            <>
              <ResizeHandle />
              <Panel id="right" defaultSize="33%" minSize="320px" maxSize="60%" className={classes.rightPanel}>
                <Inspector />
              </Panel>
            </>
          )}
        </Group>
      )}
    </div>
  );
}
