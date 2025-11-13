import { I18nManager } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook to get RTL-aware styles and utilities
 */
export const useRTL = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return {
    isRTL,
    textAlign: isRTL ? 'right' as const : 'left' as const,
    textAlignReverse: isRTL ? 'left' as const : 'right' as const,
    direction: isRTL ? 'rtl' as const : 'ltr' as const,
    writingDirection: isRTL ? 'rtl' as const : 'ltr' as const,
    flexDirection: isRTL ? 'row-reverse' as const : 'row' as const,
    flexDirectionReverse: isRTL ? 'row' as const : 'row-reverse' as const,
    // For flexbox
    start: isRTL ? 'flex-end' as const : 'flex-start' as const,
    end: isRTL ? 'flex-start' as const : 'flex-end' as const,
    // For positioning
    left: isRTL ? 'right' as const : 'left' as const,
    right: isRTL ? 'left' as const : 'right' as const,
  };
};

