import { Alert, Anchor, Button, PasswordInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AuthSettingsDto, useApi } from 'src/api';
import { LoginDto, ResponseError } from 'src/api/generated';
import { Logo } from 'src/components';
import { Theme, useLoginUrl, useTheme, useTransientLinkBuilder } from 'src/hooks';
import { useAuthSettings } from 'src/hooks/useAuthSettings';
import { loadPage, takePostLoginRedirect } from 'src/lib/navigation';
import { texts } from 'src/texts';
import classes from './LoginPage.module.css';

export function LoginPage() {
  const { theme } = useTheme();
  const { data: authSettings, isError: isAuthSettingsError } = useAuthSettings();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  return (
    <div className={classes.root}>
      <main className={classes.main}>
        <Sidebar theme={theme} authSettings={authSettings} isAuthSettingsError={isAuthSettingsError} oauthError={oauthError} />
      </main>
      {theme.backgroundLogoUrl && <BackgroundImage logoUrl={theme.backgroundLogoUrl} />}
    </div>
  );
}

function Sidebar(props: {
  theme: Theme;
  authSettings?: AuthSettingsDto;
  isAuthSettingsError: true | false;
  oauthError: string | null;
}) {
  return (
    <>
      <header className={classes.header}>
        {props.theme.logoUrl && <Logo size={{ height: '2rem' }} url={props.theme.logoUrl} />}
      </header>
      <div className={classes.providers}>
        <LoginProviders
          welcomeText={props.theme.welcomeText}
          authSettings={props.authSettings}
          error={props.isAuthSettingsError}
          oauthError={props.oauthError}
        />
      </div>
      <nav className={classes.footer}>
        <LegalFooter siteLinks={props.theme.siteLinks} />
      </nav>
    </>
  );
}

function LoginProviders(props: {
  welcomeText?: string;
  authSettings: AuthSettingsDto | undefined;
  error: true | false;
  oauthError: string | null;
}) {
  return (
    <>
      <h1 className={classes.welcome}>{renderTextWithBreaks(props.welcomeText || texts.login.welcome)}</h1>

      {props.error && (
        <div>
          <LoginAuthError />
        </div>
      )}
      {props.oauthError && (
        <Alert variant="filled" color="red.4" mb={16}>
          {props.oauthError === 'forbidden' && texts.common.loginForbidden}
          {props.oauthError && props.oauthError !== 'forbidden' && texts.login.authError}
        </Alert>
      )}
      <div className={classes.providerList}>
        {props.authSettings?.providers.map((p) => (
          <LoginButton key={p.name} name={p.name} label={p.displayName} />
        ))}
      </div>

      {props.authSettings?.enablePasswordAuth && <LoginForm />}

      <div className={classes.hint}>
        <div>{props.authSettings?.providers.length === 0 && !props.authSettings.enablePasswordAuth && <NoAuthSettings />}</div>
      </div>
    </>
  );
}

function LoginForm() {
  const api = useApi();

  const buildLink = useTransientLinkBuilder();
  const login = useMutation({
    mutationFn: (request: LoginDto) => {
      return api.auth.login(request);
    },
    onSuccess: () => {
      // A full page load: the caches and stores may still contain the data of the previous user (session expired).
      loadPage(buildLink(takePostLoginRedirect()) as string);
    },
  });

  const form = useForm<LoginDto>({
    mode: 'controlled',
    initialValues: {
      email: '',
      password: '',
    },
  });

  return (
    <form className={classes.form} onSubmit={form.onSubmit((v) => login.mutate(v))}>
      {/* Error Message Placeholder */}
      {login.isError && (
        <Alert variant="filled" color="red.4" mb={16}>
          {login.error instanceof ResponseError && login.error.response.status === 403
            ? texts.common.loginForbidden
            : texts.common.loginFailed}
        </Alert>
      )}

      <div className={classes.field}>
        <TextInput placeholder={texts.common.email} autoFocus key={form.key('email')} {...form.getInputProps('email')} />
      </div>

      <div className={classes.field}>
        <PasswordInput placeholder={texts.common.password} key={form.key('password')} {...form.getInputProps('password')} />
      </div>

      <Button type="submit" fullWidth>
        {texts.common.loginButton}
      </Button>
    </form>
  );
}

function LoginButton({ label, name }: { label: string; name: string }) {
  const url = useLoginUrl(name);

  return (
    <Button component="a" href={url} fullWidth radius="sm" className={classes.providerButton}>
      {texts.login.loginButton(label)}
    </Button>
  );
}

const LoginAuthError = () => {
  return <p role={'alert'}>{texts.login.authError}</p>;
};

const NoAuthSettings = () => {
  return <p role={'alert'}>{texts.login.emptyAuthSettings}</p>;
};

const renderTextWithBreaks = (text: string) => {
  return text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      {index < text.split('\n').length - 1 && <br />}
    </span>
  ));
};

function LegalFooter(props: { siteLinks: { text: string; link: string }[] | undefined }) {
  return (
    <>
      {props.siteLinks?.map((siteLink) => (
        <div key={siteLink.text} className={classes.siteLink}>
          <Anchor href={siteLink.link} underline="always" className={classes.link}>
            {siteLink.text}
          </Anchor>
        </div>
      ))}
    </>
  );
}

function BackgroundImage(props: { logoUrl: string }) {
  return <img className={classes.background} src={props.logoUrl} alt="Background Logo" />;
}
