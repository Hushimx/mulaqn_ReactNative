import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import i18n, { getStoredLanguage, saveLanguage } from '@/i18n/config';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => Promise<void>;
  isRTL: boolean;
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
        
        // Enable RTL support
        I18nManager.allowRTL(true);
        
        // Set RTL for Arabic, LTR for English
        const shouldBeRTL = lang === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL);
          
          // On Android, need to restart the app for RTL to take effect
          if (Platform.OS === 'android') {
            // Note: In production, you might want to use react-native-restart
            // or show a message to the user to restart the app
            console.log('RTL changed. App restart may be needed on Android.');
          }
        }
        
        // Set i18next language
        await i18n.changeLanguage(lang);
        setLanguage(lang);
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing language:', error);
        setIsReady(true);
      }
    };

    initLanguage();
  }, []);

  const changeLanguage = async (lang: Language) => {
    try {
      // Enable RTL support
      I18nManager.allowRTL(true);
      
      // Set RTL for Arabic, LTR for English
      const shouldBeRTL = lang === 'ar';
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        
        // On Android, need to restart the app for RTL to take effect
        if (Platform.OS === 'android') {
          // Note: In production, you might want to use react-native-restart
          // or show a message to the user to restart the app
          console.log('RTL changed. App restart may be needed on Android.');
        }
      }

      // Update i18next language
      await i18n.changeLanguage(lang);
      await saveLanguage(lang);
      setLanguage(lang);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        isRTL: language === 'ar',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

