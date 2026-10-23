import { useMemo } from 'react';
import { TransientContext } from 'src/hooks';

export function TransientProvider(props: React.PropsWithChildren) {
  const { children } = props;

  const values = useMemo(() => {
    const result: Record<string, string> = {};
    const parsed = new URLSearchParams(location.search);
    const prefix = 'context.';

    for (const key of new Set(parsed.keys())) {
      if (key.indexOf(prefix) !== 0) {
        continue;
      }

      const actualValue = parsed.get(key);

      if (actualValue && actualValue.length > 0) {
        const withoutContext = key.substring(prefix.length);

        result[withoutContext] = actualValue;
      }
    }

    return result;
  }, []);

  return <TransientContext.Provider value={values}>{children}</TransientContext.Provider>;
}
