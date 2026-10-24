import { FormErrors } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { infer as ZodInfer, ZodTypeAny } from 'zod';
import { ResponseError } from 'src/api';
import { texts } from 'src/texts';

export function isString(value: unknown): value is string {
  return typeof value === 'string' || value instanceof String;
}

export function formatFileSize(value: number, factor = 1024) {
  let u = 0;

  while (value >= factor || -value >= factor) {
    value /= factor;
    u++;
  }

  return (u ? `${value.toFixed(1)} ` : value) + ' kMGTPEZY'[u] + 'B';
}

/**
 * Downloads data as a JSON file.
 */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes a string for use as a filename (keeps alphanumerics, hyphens, underscores, spaces).
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_ ]/g, '_');
}

/** Builds the message of an error toast. Returns a promise as the message of the server used to be read from the response. */
export function buildError(common: string, details?: string | Error | null): Promise<string> {
  let detailString: string | null = null;
  if (isString(details)) {
    detailString = details;
  } else if (details instanceof ResponseError) {
    detailString = details.serverMessage ?? null;
  }

  let result = common;
  if (isString(detailString)) {
    if (result.endsWith('.')) {
      result = result.substring(0, result.length - 1);
    }

    result = `${result}: ${detailString}`;
  }

  if (!result.endsWith('.')) {
    result = `${result}.`;
  }

  return Promise.resolve(result);
}

export function formatBoolean(value: boolean) {
  return value ? texts.common.yes : texts.common.no;
}

export function typedZodResolver<S extends ZodTypeAny>(schema: S): (values: ZodInfer<S>) => FormErrors {
  const base = zod4Resolver(schema);
  return (values: ZodInfer<S>) => base(values as Parameters<typeof base>[0]);
}
