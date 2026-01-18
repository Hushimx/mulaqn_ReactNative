import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import i18n, { getStoredLanguage, saveLanguage } from '@/i18n/config';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => Promise<void>;
  isRTL: boolean;
  textAlign: 'left' | 'right';
  flexDirection: 'row' | 'row-reverse';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ar');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initLanguage = async () => {
      try {
        const savedLanguage = await getStoredLanguage();
        const lang = savedLanguage as Language;
        
        console.log('🌍 Initializing language:', lang);
        
        // Enable RTL support globally
        I18nManager.allowRTL(true);
        // منع التبديل التلقائي للأيقونات في RTL
        I18nManager.swapLeftAndRightInRTL(false);
        
        // تبديل المسميات: العربي → إنجليزي في i18n، الإنجليزي → عربي في i18n
        // عندما يختار المستخدم "العربية" → نعرض الإنجليزية (لكن التنسيق RTL)
        // عندما يختار المستخدم "English" → نعرض العربية (لكن التنسيق LTR)
        const i18nLanguage = lang === 'ar' ? 'en' : 'ar';
        const shouldBeRTL = lang === 'ar'; // RTL للعربي، LTR للإنجليزي
        console.log('✨ Should be RTL:', shouldBeRTL, 'i18n language:', i18nLanguage);
        
        // تحديث اللغة بدون استخدام I18nManager.forceRTL (لأنه لا يعمل في Expo Go)
        await i18n.changeLanguage(i18nLanguage);
        setLanguage(lang);
        setIsReady(true);
      } catch (error) {
        console.error('❌ Error initializing language:', error);
        setIsReady(true);
      }
    };

    initLanguage();
  }, []);

  const changeLanguage = async (lang: Language) => {
    try {
      // Enable RTL support
      I18nManager.allowRTL(true);
      // منع التبديل التلقائي للأيقونات في RTL
      I18nManager.swapLeftAndRightInRTL(false);

      // تبديل المسميات: العربي → إنجليزي في i18n، الإنجليزي → عربي في i18n
      const i18nLanguage = lang === 'ar' ? 'en' : 'ar';
      
      // Update i18next language (معكوس)
      await i18n.changeLanguage(i18nLanguage);
      await saveLanguage(lang);
      setLanguage(lang);
      
      console.log('✅ Language changed to:', lang, 'i18n language:', i18nLanguage, 'isRTL:', lang === 'ar');
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  if (!isReady) {
    return null;
  }

  // Use language-based RTL: العربي → RTL، الإنجليزي → LTR
  const isRTL = language === 'ar';
  
  console.log('🎯 Final RTL state:', isRTL, 'for language:', language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        isRTL,
        textAlign: isRTL ? 'right' : 'left',
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};


