import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

const LANGUAGE_KEY = '@app/language';

// Get device language
const getDeviceLanguage = (): string => {
  try {
    const locale = Localization.locale;
    if (locale && typeof locale === 'string' && locale.startsWith('ar')) {
      return 'ar';
    }
    return 'en';
  } catch (error) {
    console.error('Error getting device language:', error);
    return 'ar'; // Default to Arabic
  }
};

// Load saved language preference
export const getStoredLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    return savedLanguage || getDeviceLanguage();
  } catch (error) {
    console.error('Error loading language preference:', error);
    return getDeviceLanguage();
  }
};

// Save language preference
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      ar: {
        translation: ar,
      },
      en: {
        translation: en,
      },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

