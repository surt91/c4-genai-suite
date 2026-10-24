import { create } from 'zustand';

import { useTransientNavigate } from 'src/hooks';
import { EvalClient } from '../apiEvalClient';
import { redirectToLogin } from '../redirectToLogin';

type TransientNavigateFn = ReturnType<typeof useTransientNavigate>;

type EvalClientActions = {
  getEvalClient: (navigate: TransientNavigateFn) => EvalClient;
};

/**
 * @description An evalClient provider that can be reused without reinitializing
 * the evalClient. The singleton functionality of Zustand enables us to do so.
 *
 * The eval service is accessed through the Gaible backend proxy at /eval
 */
export const useEvalClientStore = create<EvalClientActions>(() => {
  let evalClient: EvalClient | undefined;

  const initializeEvalClient = (navigate: TransientNavigateFn): EvalClient => {
    if (!evalClient) {
      // Eval service is proxied through Gaible backend at /api/eval
      evalClient = new EvalClient(`${import.meta.env.VITE_SERVER_URL || ''}/api/eval`, () => redirectToLogin(navigate));
    }

    return evalClient;
  };

  return {
    getEvalClient: (navigate: TransientNavigateFn) => initializeEvalClient(navigate),
  };
});
