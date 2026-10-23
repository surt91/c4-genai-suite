import { Card } from '@mantine/core';
import { Page } from 'src/components';
import { texts } from 'src/texts';
import { LogoUpload } from './LogoUpload';
import classes from './Theme.module.css';
import { ThemeForm } from './ThemeForm';

export function ThemePage() {
  return (
    <Page>
      <h1 className={classes.headline}>{texts.theme.headline}</h1>

      <h2 className={classes.sectionTitle}>{texts.theme.logo}</h2>

      <Card radius="md" shadow="xs" padding={24}>
        <LogoUpload imageType="logo" />
      </Card>
      <h2 className={classes.sectionTitle}>{texts.theme.avatarLogo}</h2>

      <Card radius="md" shadow="xs" padding={24}>
        <LogoUpload imageType="avatarLogo" />
      </Card>

      <h2 className={classes.sectionTitle}>{texts.theme.backgroundLogo}</h2>

      <Card radius="md" shadow="xs" padding={24} mb={8}>
        <LogoUpload imageType="backgroundLogo" />
      </Card>

      <h2 className={classes.settingsTitle}>{texts.theme.settings}</h2>

      <Card radius="md" shadow="xs" padding={24} mt={16}>
        <ThemeForm />
      </Card>
    </Page>
  );
}
