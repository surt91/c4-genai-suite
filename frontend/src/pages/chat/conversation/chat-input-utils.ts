import { ExtensionArgumentObjectSpecDto, ExtensionArgumentObjectSpecDtoPropertiesValue, ExtensionUserInfoDto } from 'src/api';

type UserArgumentDefaultValue = Array<unknown> | string | number | boolean | undefined | object;
type UserArgumentDefaultValueByName = Record<string, UserArgumentDefaultValue>;
export type UserArgumentDefaultValueByExtensionIDAndName = Record<string, UserArgumentDefaultValueByName>;
type ExtensionUserInfoDtoUserArgumentsValue = ExtensionArgumentObjectSpecDtoPropertiesValue;

function isDefined(value: UserArgumentDefaultValue): boolean {
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.some(isDefined);
    } else {
      return Object.values(value).some(isDefined);
    }
  }

  return value != null && value !== '';
}

export function valueToString(value: UserArgumentDefaultValue): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    const keyValueStrings = Object.entries(value)
      .filter(valueIsDefined)
      .map(([key, value]: [string, UserArgumentDefaultValue]) => `${key}: ${valueToString(value)}`);
    return `(${keyValueStrings.join(', ')})`;
  }
  return `${value}`;
}
export const valueIsDefined = (e: [string, UserArgumentDefaultValue]) => isDefined(e[1]);
export const filterFilesByFileNameExtensions = (files: { name?: string; fileName?: string }[], fileNameExtensions: string[]) => {
  if (fileNameExtensions.length === 0) return files;
  return files.filter(
    (f) =>
      fileNameExtensions.some((fileNameExtension) => matchExtension(f.name, fileNameExtension)) ||
      fileNameExtensions.some((fileNameExtension) => matchExtension(f.fileName, fileNameExtension)),
  );
};
export const getDefault = (spec: ExtensionUserInfoDtoUserArgumentsValue): UserArgumentDefaultValue => {
  switch (spec.type) {
    case 'array':
      return spec._default ?? [];
    case 'string':
      return spec._default ?? '';
    case 'number':
    case 'boolean':
      return spec._default;
    case 'object':
      return getDefaultValuesFromNestedObject(spec);
  }
};
const isFilterValueWithoutCustomGaibleUI = (argumentValue: ExtensionUserInfoDtoUserArgumentsValue) =>
  ({ format: undefined, ...argumentValue }).format !== 'gaible-ui';
export const isExtensionWithUserArgs = (e: ExtensionUserInfoDto) =>
  Object.values(e.userArguments || {}).some(isFilterValueWithoutCustomGaibleUI);

function getDefaultValuesFromNestedObject(spec: ExtensionArgumentObjectSpecDto) {
  const defaultValues: Record<string, unknown> = {};
  for (const [propertyName, propertySpec] of Object.entries(spec.properties)) {
    defaultValues[propertyName] = getDefault(propertySpec);
  }
  return defaultValues;
}

export function matchExtension(fileName: string | undefined, extension: string): boolean {
  return !!fileName && fileName.toLowerCase().endsWith(extension.toLowerCase());
}
