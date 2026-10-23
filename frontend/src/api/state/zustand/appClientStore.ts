import { create } from 'zustand';

import { Configuration, Middleware } from 'src/api/generated';
import { useTransientNavigate } from 'src/hooks';
import { i18next } from 'src/texts/i18n';
import { AppClient } from '../apiAppClient';
import { redirectToLogin } from '../redirectToLogin';

type TransientNavigateFn = ReturnType<typeof useTransientNavigate>;

type AppClientActions = {
  getAppClient: (navigate: TransientNavigateFn) => AppClient;
};

const createAppClientMiddleware: (navigate: TransientNavigateFn) => Middleware = (navigate) => ({
  pre: async (context) => {
    context.init.credentials = 'include';
    context.init.headers = {
      ...context.init.headers,
      'Accept-Language': i18next.language,
    };
    return Promise.resolve();
  },
  post: async (context) => {
    if (context.response?.status === 401) {
      redirectToLogin(navigate);
    }
    return Promise.resolve();
  },
});

/**
 * @description An appClient provider that can be reused without reinitializing
 * the appClient. The singleton functionality of Zustand enables us to do so.
 */
export const useAppClientStore = create<AppClientActions>(() => {
  let appClient: AppClient | undefined;

  const initializeAppClient = (navigate: TransientNavigateFn): AppClient => {
    if (!appClient) {
      const basePath = import.meta.env.VITE_SERVER_URL || '';
      const configuration = new Configuration({
        basePath,
      });
      const middleware = createAppClientMiddleware(navigate);
      appClient = new AppClient(configuration, middleware);
    }

    return appClient;
  };

  return {
    getAppClient: (navigate: TransientNavigateFn) => initializeAppClient(navigate),
  };
});
