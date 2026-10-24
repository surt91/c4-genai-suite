import { SettingEntity } from '../../database/index.js';
import { Settings } from '../interfaces.js';

export function buildSettings(source: SettingEntity): Settings {
  // eslint-disable-next-line prefer-const
  let { name, language, primaryColor, primaryContentColor, ...other } = source;

  name ??= 'Gaible';
  primaryColor ||= '#4F46E5';
  primaryContentColor ||= '#FFFFFF';

  return {
    name,
    primaryColor,
    primaryContentColor,
    language: language || 'en',
    ...other,
  };
}

export function buildSettingsSnapshot(settings: Settings): Record<string, unknown> {
  return JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;
}
