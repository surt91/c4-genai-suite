import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from 'src/hooks';

export function ThemeStyle() {
  const { theme } = useTheme();

  useEffect(() => {
    setFavicon(theme.avatarLogoUrl || '/favicon.svg');
  }, [theme.avatarLogoUrl]);

  return ReactDOM.createPortal(
    <>
      <style type="text/css">
        {`
        :root {
          --color-primary: ${theme.primaryColor};
          --color-primary-content: ${theme.primaryContentColor};
        }
        ${theme.customCss || ''}
      `}
        {theme.customCss || ''}
      </style>
    </>,
    document.querySelector('#head')!,
  );
}

function setFavicon(faviconUrl: string) {
  const existingFaviconLink = document.querySelector("link[rel~='icon']");
  if (existingFaviconLink) {
    existingFaviconLink.parentNode?.removeChild(existingFaviconLink);
  }
  const newFaviconLink = document.createElement('link');
  newFaviconLink.rel = 'icon';
  newFaviconLink.type = 'image/svg+xml';
  newFaviconLink.href = `${faviconUrl}`;
  document.head.appendChild(newFaviconLink);
}
