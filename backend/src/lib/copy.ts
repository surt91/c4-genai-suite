import { isUndefined } from './types.js';

export function assignDefined<T extends object>(target: T, source: Partial<T>): T {
  const record = target as Record<string, any>;

  for (const [key, value] of Object.entries(source)) {
    if (!isUndefined(value)) {
      record[key] = value;
    }
  }

  return target;
}

export function assignWithUndefined<T extends object>(target: T, source: Partial<T>): T {
  const record = target as Record<string, any>;

  for (const [key, value] of Object.entries(source)) {
    record[key] = value === undefined ? null : value;
  }

  return target;
}
