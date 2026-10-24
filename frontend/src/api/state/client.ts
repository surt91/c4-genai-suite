import type { Client } from 'src/api/generated/client';
import { i18next } from 'src/texts/i18n';
import { ResponseError } from './errors';

/**
 * Sets up a generated client like all our clients are used: with cookies and the UI language, calling `onUnauthorized`
 * on 401 responses and throwing a `ResponseError` (with status and server message) on error responses.
 */
export function configureClient(client: Client, onUnauthorized: () => void) {
  client.setConfig({ credentials: 'include', throwOnError: true });
  client.interceptors.request.use((request) => {
    request.headers.set('Accept-Language', i18next.language);
    return request;
  });
  client.interceptors.response.use((response) => {
    if (response.status === 401) {
      onUnauthorized();
    }
    return response;
  });
  // The client throws the parsed body of error responses; network errors (without a response) are thrown as they are.
  client.interceptors.error.use((error, response) => (response && !response.ok ? new ResponseError(response, error) : error));
  return client;
}
