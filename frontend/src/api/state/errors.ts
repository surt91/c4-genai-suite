/** The server answered with an error status (e.g. 401, a validation error or a proxy error). */
export class ResponseError extends Error {
  override name = 'ResponseError';

  /** The message of the server, if it sent one (NestJS: `{ message: string | string[] }`). */
  public readonly serverMessage?: string;

  constructor(
    public readonly response: Response,
    /** The parsed (JSON) or textual body of the error response. */
    public readonly body?: unknown,
  ) {
    const serverMessage = extractServerMessage(body);
    super(serverMessage ?? `Request failed with status ${response.status}`);
    this.serverMessage = serverMessage;
  }

  get status() {
    return this.response.status;
  }
}

function extractServerMessage(body: unknown) {
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return undefined;
  }
  const { message } = body;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  return typeof message === 'string' ? message : undefined;
}

/** Reads the body of an error response, as JSON if possible. */
export async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => undefined);
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
