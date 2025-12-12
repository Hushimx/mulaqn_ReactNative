import { I18nManager } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Simplified RTL Hook
 * 
 * This hook provides basic RTL context values.
 * RTL/LTR layout is now handled automatically by React Native's I18nManager.
 * When language direction changes, the app will restart to apply changes globally.
 * 
 * Use logical properties in styles instead of directional ones:
 * - Use 'marginStart' instead of 'marginLeft'
 * - Use 'paddingEnd' instead of 'paddingRight'
 * - Use 'start' instead of 'left' for positioning
 * 
 * Text alignment and flex direction are handled automatically by I18nManager.
 */
export const useRTL = () => {
  const { isRTL, language } = useLanguage();

  return {
    isRTL,
    language,
    direction: isRTL ? 'rtl' : 'ltr',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  };
};
