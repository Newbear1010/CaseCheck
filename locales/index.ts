import { zhTW, type TranslationKeys } from './zh-TW';
import { enUS } from './en-US';

export type Locale = 'zh-TW' | 'en-US';

export const translations: Record<Locale, TranslationKeys> = {
  'zh-TW': zhTW,
  'en-US': enUS,
};

export const defaultLocale: Locale = 'zh-TW';

export { zhTW, enUS };
