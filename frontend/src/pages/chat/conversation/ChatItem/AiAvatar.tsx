import { Avatar } from '@mantine/core';
import { Logo } from 'src/components';
import { useTheme } from 'src/hooks';
import classes from './ChatItem.module.css';

export const AiAvatar = ({ llmLogo }: { llmLogo?: string }) => {
  const { theme } = useTheme();
  const { avatarLogoUrl } = theme;

  return (
    <div className={classes.avatar}>
      {avatarLogoUrl && <Logo url={avatarLogoUrl} />}
      {!avatarLogoUrl && llmLogo && <Logo previewLogo={llmLogo} />}
      {!avatarLogoUrl && !llmLogo && <Avatar size={'xs'} radius="sm" src="/favicon.svg" alt="AI" />}
    </div>
  );
};
