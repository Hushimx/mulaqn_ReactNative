import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform, useColorScheme } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();
  const colorScheme = useColorScheme();

  const toggleLanguage = () => {
    const newLanguage = language === 'ar' ? 'en' : 'ar';
    changeLanguage(newLanguage);
  };

  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={[
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight
      ]}>
        <Text style={[
          styles.text,
          isDark ? styles.textDark : styles.textLight
        ]}>
          {language === 'ar' ? 'EN' : 'AR'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.select({ ios: 50, android: 20, default: 50 }),
    right: 24,
    zIndex: 1000,
    elevation: 10, // Android shadow
  },
  button: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textLight: {
    color: '#000000',
  },
});

