import { createContext, useContext } from 'react';
import { NavigateOptions, To, useNavigate } from 'react-router-dom';
import { isString } from 'src/lib';
import { useEventCallback } from './utils';

export type TransientContext = Record<string, string>;

export const TransientContext = createContext<TransientContext>({});

export function useTransientContext() {
  return useContext(TransientContext);
}

function withContext(search: string, context: TransientContext) {
  const query = new URLSearchParams(search);

  for (const [key, value] of Object.entries(context)) {
    query.set(`context.${key}`, value);
  }

  query.sort();
  return query.toString();
}

export function useTransientLinkBuilder() {
  const context = useTransientContext();

  return useEventCallback((to: To) => {
    if (Object.keys(context).length === 0) {
      return to;
    }

    if (isString(to)) {
      const [withoutHash] = to.split('#');
      const queryStart = withoutHash.indexOf('?');
      const url = queryStart < 0 ? withoutHash : withoutHash.substring(0, queryStart);
      const search = queryStart < 0 ? '' : withoutHash.substring(queryStart);

      return `${url}?${withContext(search, context)}`;
    } else if (to.search) {
      return { ...to, search: `?${withContext(to.search, context)}` };
    }

    return to;
  });
}

export function useTransientNavigate() {
  const navigate = useNavigate();
  const builder = useTransientLinkBuilder();

  return useEventCallback((to: To, options?: NavigateOptions) => {
    const result = builder(to);

    void navigate(result, options);
  });
}
