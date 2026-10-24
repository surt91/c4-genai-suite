import { create } from 'zustand';

import { useTransientNavigate } from 'src/hooks';
import { AppClient } from '../apiAppClient';
import { redirectToLogin } from '../redirectToLogin';

type TransientNavigateFn = ReturnType<typeof useTransientNavigate>;

type AppClientActions = {
  getAppClient: (navigate: TransientNavigateFn) => AppClient;
};

/**
 * @description An appClient provider that can be reused without reinitializing
 * the appClient. The singleton functionality of Zustand enables us to do so.
 */
export const useAppClientStore = create<AppClientActions>(() => {
  let appClient: AppClient | undefined;

  const initializeAppClient = (navigate: TransientNavigateFn): AppClient => {
    if (!appClient) {
      appClient = new AppClient(import.meta.env.VITE_SERVER_URL || '', () => redirectToLogin(navigate));
    }

    return appClient;
  };

  return {
    getAppClient: (navigate: TransientNavigateFn) => initializeAppClient(navigate),
  };
});
