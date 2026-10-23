import { generateColors } from '@mantine/colors-generator';
import { createTheme, MantineProvider, Tooltip } from '@mantine/core';
import { ReactNode } from 'react';
import { useTheme } from 'src/hooks';

type MantineThemeProviderProps = {
  admin?: boolean;
  children: ReactNode;
};

export const MantineThemeProvider = ({ children }: MantineThemeProviderProps) => {
  const {
    theme: { primaryColor: themePrimaryColor },
  } = useTheme();
  const mantineTheme = createTheme({
    primaryColor: 'dark',
    autoContrast: true,
    defaultRadius: 'md',
    colors: { accent: generateColors(themePrimaryColor ?? 'grey') },
    components: {
      // Small tooltips below the element, like the previous global react-tooltip.
      Tooltip: Tooltip.extend({ defaultProps: { position: 'bottom', fz: 'xs', withArrow: true, multiline: true, maw: 320 } }),
    },
  });

  return <MantineProvider theme={mantineTheme}>{children}</MantineProvider>;
};
