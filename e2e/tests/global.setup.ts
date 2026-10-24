import { test as setup } from '@playwright/test';
import { ensureAssistantViaApi, ensureBucketViaApi, newAdminApiContext } from './utils/api';
import { config } from './utils/config';
import { globalConversationBucketName, globalUserBucketName } from './utils/helper';

// The backend allows only one `user` and one `conversation` bucket. They are shared by all tests, so create them
// once before the (parallel) tests run instead of racing to create them from several tests.
setup('create shared buckets and a default assistant', async () => {
  const api = await newAdminApiContext();
  try {
    // only basic.spec.ts uses (and edits) the user bucket
    await ensureBucketViaApi(
      api,
      {
        name: globalUserBucketName(),
        type: 'user',
        endpoint: config.REIS_ENDPOINT,
        fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
      },
      false,
    );
    // search-file-in-chat.spec.ts and whole-file.spec.ts upload pdf/pptx files to the conversation bucket. The limits
    // are enforced, since older versions of the tests changed them.
    await ensureBucketViaApi(
      api,
      {
        name: globalConversationBucketName(),
        type: 'conversation',
        endpoint: config.REIS_ENDPOINT,
        fileSizeLimits: { general: 10 },
      },
      true,
    );

    // The chat page only redirects to a new conversation (/chat/<id>) if there is an assistant. `login` waits for that
    // redirect (otherwise it could override a navigation of the test), so make sure that there is one on a fresh database.
    await ensureAssistantViaApi(api, 'E2E Default Assistant');
  } finally {
    await api.dispose();
  }
});
