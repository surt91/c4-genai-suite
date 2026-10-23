import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from 'src/api';
import { Theme, ThemeContext } from 'src/hooks';
import { texts } from 'src/texts';

const defaultTheme = { name: texts.common.appName };

export function ThemeProvider(props: React.PropsWithChildren) {
  const { children } = props;

  const api = useApi();

  const { i18n } = useTranslation();

  const { data: loadedSettings, refetch } = useQuery({
    queryKey: ['theme'],
    queryFn: () => api.settings.getSettings(),
    refetchOnWindowFocus: false,
  });

  const [customTheme, setCustomTheme] = useState<Theme>({} as Theme);

  const initialTheme = useMemo(() => {
    return merge(api.url, defaultTheme, loadedSettings);
  }, [api.url, loadedSettings]);

  useEffect(() => {
    if (loadedSettings) {
      void i18n.changeLanguage(loadedSettings.language);
    }
  }, [i18n, loadedSettings]);

  const theme = useMemo(() => {
    return merge(api.url, initialTheme, customTheme);
  }, [api.url, customTheme, initialTheme]);

  const setTheme = useCallback(
    (values: Partial<Theme>) => {
      setCustomTheme((v) => addLogoUrls(api.url, { ...v, ...values }));
    },
    [api.url],
  );

  const context = useMemo(() => {
    return {
      refetch,
      theme,
      setTheme,
    };
  }, [refetch, setTheme, theme]);

  if (!loadedSettings) {
    return null;
  }

  return <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>;
}

function merge<T extends Theme>(baseUrl: string, target: T, source?: Partial<T>): T {
  const result = { ...target };

  type Key = keyof T;
  type Value = T[Key];

  if (source) {
    for (const [key, value] of Object.entries(source || {}).filter((x) => x[1] != null)) {
      result[key as Key] = value as Value;
    }
  }

  return addLogoUrls(baseUrl, result);
}

function addLogoUrls<T extends Theme>(baseUrl: string, target: T): T {
  const imageTypes = ['logo', 'backgroundLogo', 'avatarLogo'] as const;
  return imageTypes.reduce((result, imageType) => {
    target[`${imageType}Url`] = target[imageType] ? `${baseUrl}/api/settings/${imageType}` : undefined;
    return result;
  }, target);
}
