// `{{ name }}` or `{{ object.property }}`, whitespace inside the braces is optional
const PLACEHOLDER = /\{\{\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\}\}/g;

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Replaces the `{{ variable }}` placeholders of a template with the values from `data`. Dotted paths (`{{ user.email }}`)
 * address nested values. Unknown variables, `null` and `undefined` are replaced by an empty string, other values are
 * converted with `String()`. Values are inserted as they are (no HTML escaping).
 *
 * This is deliberately no template engine: anything else between double braces (filters, expressions) and tags like
 * `{% if %}` are left untouched.
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(PLACEHOLDER, (_, path: string) => format(resolve(data, path.split('.'))));
}

function resolve(data: unknown, path: string[]): unknown {
  let current = data;
  for (const key of path) {
    if (current === null || current === undefined || FORBIDDEN_KEYS.has(key)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function format(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'function') {
    return '';
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value);
}
