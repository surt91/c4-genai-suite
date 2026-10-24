import { ActionIcon, Tooltip, VisuallyHidden } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { PropsWithChildren } from 'react';
import { Logo } from 'src/components/Logo';
import { TransientNavLink } from 'src/components/TransientNavLink';
import { Theme } from 'src/hooks';
import { texts } from 'src/texts';
import { useDocsContext } from './InAppDocsProvider';
import classes from './NavigationBar.module.css';

interface NavigationBarProps extends PropsWithChildren {
  theme: Theme;
  redirectTo?: string;
}

export function NavigationBar({ theme, redirectTo }: NavigationBarProps) {
  const { isDocsButtonVisible, toggleDocs } = useDocsContext();
  const content = theme.logoUrl ? (
    <Logo key={theme.key} size={{ height: '60%' }} url={theme.logoUrl} />
  ) : (
    <span className={classes.brand}>
      <img className={classes.brandMark} src="/logo.svg" alt="" />
      {theme.name}
    </span>
  );
  return (
    <div className={classes.root}>
      <VisuallyHidden component="h1">{theme.name}</VisuallyHidden>
      {redirectTo ? (
        <TransientNavLink className={classes.logoLink} to={redirectTo} data-testid="logo-link">
          {content}
        </TransientNavLink>
      ) : (
        <div className={classes.logo}>{content}</div>
      )}
      {isDocsButtonVisible && (
        <div className={classes.actions}>
          <Tooltip label={texts.common.show(texts.common.docs)}>
            <ActionIcon
              onClick={toggleDocs}
              size="xl"
              variant="subtle"
              color="primary"
              aria-label={texts.common.show(texts.common.docs)}
            >
              <IconHelp data-testid="docs-icon" />
            </ActionIcon>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
