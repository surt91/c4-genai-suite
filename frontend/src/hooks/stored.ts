import { useLocalStorage } from '@mantine/hooks';
import { useCallback, useState } from 'react';

export function useSidebarState(key: string): [boolean, (value: boolean) => void] {
  const [state, setState] = useState(() => {
    const fromLocalStore = localStorage.getItem(key);
    return fromLocalStore !== 'false';
  });

  const update = useCallback(
    (value: boolean) => {
      setState(value);
      localStorage.setItem(key, `${value}`);
    },
    [key],
  );

  return [state, update];
}

/**
 * A value stored in the local storage (as JSON). All components using the same key share the value: an update in one of
 * them is seen by the others (and by other tabs).
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((previous: T) => T)) => void] {
  const [state, setState] = useLocalStorage<T>({ key, defaultValue: initialValue, getInitialValueInEffect: false });
  return [state, setState];
}
