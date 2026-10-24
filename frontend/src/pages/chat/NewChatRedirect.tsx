import { useEffect, useRef } from 'react';
import { useStateOfSelectedAssistant } from 'src/pages/chat/state/listOfAssistants';
import { useStateOfEnabledAssistants } from 'src/pages/chat/state/listOfAssistants';
import { NoAssistants } from './NoAssistants';
import { useMutateNewChat } from './state/listOfChats';

interface NewChatRedirectProps {
  // The assistants have been loaded and there is none the user can chat with.
  hasNoAssistants: boolean;
}

export function NewChatRedirect({ hasNoAssistants }: NewChatRedirectProps) {
  const createNewConversation = useMutateNewChat();
  const assistant = useStateOfSelectedAssistant();
  const assistants = useStateOfEnabledAssistants();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current && assistants.length) {
      hasRun.current = true;
      createNewConversation.mutate(assistant.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant, createNewConversation]);

  return hasNoAssistants ? <NoAssistants /> : null;
}
