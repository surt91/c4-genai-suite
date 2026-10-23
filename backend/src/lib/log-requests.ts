import { Logger } from '@nestjs/common';

const extractResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
};

const removeCredentials = (headers: HeadersInit): Record<string, string> => {
  const pattern = /(authorization|key|token|secret|cookie)/i;

  const sanitizedHeaders: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    const lk = key.toLowerCase();
    if (pattern.test(lk)) {
      return;
    }
    sanitizedHeaders[key] = value;
  });
  return sanitizedHeaders;
};

const parseBody = (body: RequestInit['body']): unknown => {
  if (typeof body !== 'string') {
    return body == null ? undefined : '[binary body]';
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
};

/** Some providers (e.g. Google, Azure) accept keys as query parameters. */
const sanitizeUrl = (url: string | Request | URL): string => {
  try {
    const parsed = new URL(url instanceof Request ? url.url : url.toString());
    parsed.searchParams.forEach((_, key) => {
      if (/(key|token|secret|signature|sig)/i.test(key)) {
        parsed.searchParams.set(key, '***');
      }
    });
    return parsed.toString();
  } catch {
    return '[invalid url]';
  }
};

const logger = new Logger('DebugModelRequestLogging');

export const fetchWithDebugLogging =
  (extensionName: string) => async (url: string | Request | URL, options: RequestInit | undefined) => {
    const response = await fetch(url, options);
    if (process.env.DEBUG_MODEL_REQUESTS) {
      const clonedResponse = response.clone();
      // Not awaited: waiting for the complete body would turn streamed responses into buffered ones.
      void extractResponseBody(clonedResponse)
        .catch((err: unknown) => `failed to read the response body: ${String(err)}`)
        .then((responseBody) =>
          logger.log('Model request', {
            extensionName,
            url: sanitizeUrl(url),
            requestHeaders: removeCredentials(options?.headers ?? {}),
            requestBody: parseBody(options?.body),
            responseHeaders: [...clonedResponse.headers.entries()],
            responseBody,
          }),
        );
    }
    return response;
  };
