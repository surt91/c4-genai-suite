export function isString(value: any): value is string {
  return typeof value === 'string' || value instanceof String;
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

export function isNull(value: any): value is null {
  return value === null;
}

export function isUndefined(value: any): value is undefined {
  return typeof value === 'undefined';
}

export function is<TClass>(x: any, c: new (...args: any[]) => TClass): x is TClass {
  return x instanceof c;
}
