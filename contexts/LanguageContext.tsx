import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Platform, Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Updates from 'expo-updates';
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
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    const initLanguage = async () => {
      try {
        const savedLanguage = await getStoredLanguage();
        const lang = savedLanguage as Language;
        
        console.log('🌍 Initializing language:', lang);
        console.log('📱 Current I18nManager.isRTL:', I18nManager.isRTL);
        
        // Enable RTL support globally
        I18nManager.allowRTL(true);
        
        // Set RTL for Arabic, LTR for English
        const shouldBeRTL = lang === 'ar';
        console.log('✨ Should be RTL:', shouldBeRTL);
        
        // Check if RTL state needs to change
        if (I18nManager.isRTL !== shouldBeRTL) {
          console.log('🔄 RTL mismatch detected! Forcing RTL:', shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
          
          // Save the language
          await saveLanguage(lang);
          await i18n.changeLanguage(lang);
          
          // In Expo Go/development, I18nManager.forceRTL doesn't persist
          // So we'll continue without restart but use manual RTL handling
          console.log('⚠️ I18nManager.forceRTL called (may need native build to persist)');
          console.log('✅ Continuing with manual RTL handling');
        }
        
        // Always continue normally - don't show restart screen
        await i18n.changeLanguage(lang);
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
      const shouldBeRTL = lang === 'ar';
      const needsReload = I18nManager.isRTL !== shouldBeRTL;

      // Enable RTL support
      I18nManager.allowRTL(true);
      
      // Force RTL/LTR based on language
      if (needsReload) {
        I18nManager.forceRTL(shouldBeRTL);
      }

      // Update i18next language
      await i18n.changeLanguage(lang);
      await saveLanguage(lang);
      setLanguage(lang);

      // Show reload prompt if direction changed
      if (needsReload) {
        Alert.alert(
          lang === 'ar' ? 'تغيير اللغة' : 'Language Change',
          lang === 'ar' 
            ? 'يجب إعادة تشغيل التطبيق لتطبيق التغييرات. هل تريد إعادة التشغيل الآن؟'
            : 'The app needs to restart to apply the changes. Do you want to restart now?',
          [
            {
              text: lang === 'ar' ? 'لاحقاً' : 'Later',
              style: 'cancel',
            },
            {
              text: lang === 'ar' ? 'إعادة التشغيل' : 'Restart',
              onPress: async () => {
                try {
                  // Try to use Expo Updates to reload
                  await Updates.reloadAsync();
                } catch (error) {
                  console.error('Error reloading app:', error);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  if (!isReady) {
    return null;
  }

  // Show restart screen if RTL change is pending
  if (needsRestart) {
    return (
      <View style={restartStyles.container}>
        <View style={restartStyles.content}>
          <Text style={restartStyles.emoji}>🔄</Text>
          <Text style={restartStyles.title}>
            {language === 'ar' ? 'إعادة تشغيل مطلوبة' : 'Restart Required'}
          </Text>
          <Text style={restartStyles.message}>
            {language === 'ar' 
              ? 'تم تغيير اتجاه التطبيق. يرجى إغلاق التطبيق وإعادة فتحه لتطبيق التغييرات.'
              : 'App direction has been changed. Please close and reopen the app to apply changes.'}
          </Text>
          <TouchableOpacity 
            style={restartStyles.button}
            onPress={() => {
              // Try to reload if possible
              if (Updates.isEnabled) {
                Updates.reloadAsync().catch(() => {
                  Alert.alert(
                    language === 'ar' ? 'إعادة التشغيل' : 'Restart',
                    language === 'ar' 
                      ? 'يرجى إغلاق التطبيق وإعادة فتحه يدوياً'
                      : 'Please close and reopen the app manually'
                  );
                });
              } else {
                Alert.alert(
                  language === 'ar' ? 'إعادة التشغيل' : 'Restart',
                  language === 'ar' 
                    ? 'يرجى إغلاق التطبيق وإعادة فتحه يدوياً'
                    : 'Please close and reopen the app manually'
                );
              }
            }}
          >
            <Text style={restartStyles.buttonText}>
              {language === 'ar' ? 'حاول إعادة التشغيل' : 'Try to Restart'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Use language-based RTL, not I18nManager (which doesn't work in Expo Go)
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

const restartStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});

