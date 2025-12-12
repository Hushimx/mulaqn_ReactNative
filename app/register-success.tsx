import React from 'react';
import { Stack } from 'expo-router';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { textAlign } = useLanguage();
  const fullName = params.fullName as string || '';

  return (
    <GradientBackground>
      <LanguageSwitcher />
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Success Message */}
          <Text style={[styles.congratulations, { textAlign }]}>
            {t('register.success.congratulations') || 'مبروووك !'}
          </Text>

          {/* Welcome Message */}
          <Text style={[styles.welcomeText, { textAlign }]}>
            {t('register.success.welcome', { name: fullName || t('register.success.user') || 'المستخدم' }) || `أهلا بك في ملاقن لقد تم إنشاء حسابك بنجاح`}
          </Text>

          {/* Start Button */}
          <GradientButton
            text={t('register.success.startButton') || 'ابدأ وتعلم'}
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
  },
  congratulations: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
});

