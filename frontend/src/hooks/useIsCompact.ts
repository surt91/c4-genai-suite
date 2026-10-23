import { useMediaQuery } from '@mantine/hooks';

// Below the Mantine `md` breakpoint (62em) the chat list and the inspector are drawers instead of columns.
const COMPACT_QUERY = '(max-width: 61.99em)';

// Below the Mantine `sm` breakpoint (48em) popovers of the composer are bottom sheets.
const PHONE_QUERY = '(max-width: 47.99em)';

function matches(query: string) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** Whether the layout is compact (tablet or phone). Reactive, e.g. when the window is resized or the tablet rotated. */
export function useIsCompact() {
  return useMediaQuery(COMPACT_QUERY, matches(COMPACT_QUERY), { getInitialValueInEffect: false }) ?? false;
}

/** Whether the screen is as small as a phone. Reactive. */
export function useIsPhone() {
  return useMediaQuery(PHONE_QUERY, matches(PHONE_QUERY), { getInitialValueInEffect: false }) ?? false;
}
