import React, { useState } from 'react';
import { Stack } from 'expo-router';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { FormInput } from '@/components/ui/FormInput';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async () => {
    // التحقق من الحقول
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.login.emailRequired') || 'البريد الإلكتروني مطلوب');
      return;
    }

    if (!password.trim()) {
      Alert.alert(t('common.error'), t('auth.login.passwordRequired') || 'كلمة المرور مطلوبة');
      return;
    }

    try {
      setIsLoading(true);
      await login(email.trim(), password);
      // بعد نجاح تسجيل الدخول، الانتقال للصفحة الرئيسية
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        t('common.error') || 'خطأ',
        error instanceof Error ? error.message : t('auth.login.generalError') || 'حدث خطأ أثناء تسجيل الدخول'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <LanguageSwitcher />
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={[styles.title]}>{t('auth.login.title')}</Text>
              <Text style={[styles.subtitle]}>
                {t('auth.login.subtitle')}
              </Text>
            </View>

            {/* Email Field */}
            <FormInput
              label={t('auth.login.email')}
              placeholder={t('common.placeholder.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />

            {/* Password Field */}
            <FormInput
              label={t('auth.login.password')}
              placeholder={t('common.placeholder.password')}
              secureTextEntry
              showPasswordToggle
              textContentType="password"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>{t('auth.login.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <GradientButton 
              text={isLoading ? t('common.loading') || 'جاري التحميل...' : t('auth.login.button')} 
              onPress={handleSubmit}
              disabled={isLoading}
            />

            {/* Separator */}
            <View style={[styles.separator]}>
              <View style={styles.separatorLine} />
              <Text style={[styles.separatorText]}>{t('auth.login.separator')}</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={[styles.socialContainer]}>
              <TouchableOpacity style={[styles.socialButton]} activeOpacity={0.8}>
                <MaterialIcons name="apple" size={24} color="#FFFFFF" />
                <Text style={[styles.socialText]}>{t('common.apple')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.socialButton]} activeOpacity={0.8}>
                <MaterialIcons name="all-inclusive" size={24} color="#FFFFFF" />
                <Text style={[styles.socialText]}>{t('common.google')}</Text>
              </TouchableOpacity>
            </View>

            {/* OTP Login Link */}
            <View style={[styles.otpLoginContainer]}>
              <Text style={[styles.otpLoginText]}>{t('auth.login.phoneLoginQuestion')} </Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/otp-login', params: { phone: '' } })}>
                <Text style={[styles.otpLoginLink]}>{t('auth.login.phoneLoginLink')}</Text>
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View style={[styles.registerContainer]}>
              <Text style={[styles.registerText]}>{t('auth.login.registerQuestion')} </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.registerLink]}>{t('auth.login.registerLink')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  forgotPassword: {
    marginBottom: 24,
  },
  forgotText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  separatorText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginHorizontal: 12,
    opacity: 0.8,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  otpLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpLoginText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  otpLoginLink: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  registerLink: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
});
