import { Menu } from '@mantine/core';
import { IconLogout, IconMessage, IconSettings, IconTrash, IconUserCog } from '@tabler/icons-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ConfirmDialog } from 'src/components/ConfirmDialog';
import { UserProfileModal } from 'src/components/UserProfileModal';
import { useLogoutUrl, useProfile } from 'src/hooks';
import { useAuthSettings } from 'src/hooks/useAuthSettings';
import { useStateOfSelectedChatId } from 'src/pages/chat/state/chat';
import { isMobile } from 'src/pages/utils';
import { texts } from 'src/texts';
import { Avatar } from './Avatar';
import classes from './ProfileButton.module.css';

interface ProfileButtonProps {
  onClearConversations?: () => void;
  section: 'admin' | 'chat';
}

export const ProfileButton = ({ onClearConversations, section }: ProfileButtonProps) => {
  const profile = useProfile();
  const logoutUrl = useLogoutUrl();
  const chatId = useStateOfSelectedChatId();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const { data: authSettings } = useAuthSettings();

  return (
    <Menu width={250} withInitialFocusPlaceholder={false}>
      <Menu.Target data-testid="menu user">
        <button className={classes.button} aria-haspopup="menu">
          <div className={classes.content}>
            <div className={classes.avatar}>
              <Avatar user={profile} />
            </div>

            <div className={classes.text}>
              <div className={classes.name}>{profile.name}</div>
              <div className={classes.email}>{profile.email}</div>
            </div>
          </div>
        </button>
      </Menu.Target>

      <Menu.Dropdown aria-label={texts.accessibility.userMenu}>
        {section === 'admin' && (
          <Menu.Item leftSection={<IconMessage size={14} />} component={NavLink} to={`/chat/${chatId || ''}`}>
            {texts.common.chat}
          </Menu.Item>
        )}

        {section === 'chat' && authSettings?.enablePasswordAuth && (
          <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => setIsUserModalOpen(true)}>
            {texts.common.settings}
          </Menu.Item>
        )}

        {section === 'chat' && profile.isAdmin && !isMobile() && (
          <Menu.Item leftSection={<IconUserCog size={14} />} component={NavLink} to="/admin">
            {texts.common.administration}
          </Menu.Item>
        )}

        {section === 'chat' && onClearConversations && (
          <ConfirmDialog
            title={texts.chat.clearConversationsConfirmTitle}
            text={texts.chat.clearConversationsConfirmText}
            performText={texts.chat.clearConversationsPerformText}
            onPerform={() => onClearConversations()}
          >
            {({ onClick }) => (
              <Menu.Item c="red.9" leftSection={<IconTrash size={14} />} onClick={onClick}>
                {texts.common.clearConversations}
              </Menu.Item>
            )}
          </ConfirmDialog>
        )}

        <Menu.Item leftSection={<IconLogout size={14} />} component={'a'} href={logoutUrl}>
          {texts.common.logout}
        </Menu.Item>
      </Menu.Dropdown>

      <UserProfileModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
    </Menu>
  );
};
