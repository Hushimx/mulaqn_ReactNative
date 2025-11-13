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

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { sendOtp } = useAuth();

  const validateForm = (): string | null => {
    if (!fullName.trim()) {
      return t('auth.register.fullNameRequired') || 'الاسم الكامل مطلوب';
    }

    if (!email.trim()) {
      return t('auth.register.emailRequired') || 'البريد الإلكتروني مطلوب';
    }

    // التحقق من صيغة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return t('auth.register.invalidEmail') || 'البريد الإلكتروني غير صحيح';
    }

    if (!phone.trim()) {
      return t('auth.register.phoneRequired') || 'رقم الهاتف مطلوب';
    }

    if (!password.trim()) {
      return t('auth.register.passwordRequired') || 'كلمة المرور مطلوبة';
    }

    if (password.length < 6) {
      return t('auth.register.passwordMin') || 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (password !== confirmPassword) {
      return t('auth.register.passwordMismatch') || 'كلمة المرور غير متطابقة';
    }

    if (!termsAccepted) {
      return t('auth.register.termsRequired') || 'يجب الموافقة على الشروط والأحكام';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert(t('common.error') || 'خطأ', validationError);
      return;
    }

    try {
      setIsLoading(true);
      
      // إرسال OTP أولاً
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      await sendOtp(cleanPhone, 'register');
      
      // الانتقال لصفحة OTP مع البيانات
      router.push({
        pathname: '/register-otp',
        params: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: cleanPhone,
          password: password,
          confirmPassword: confirmPassword,
        },
      });
    } catch (error) {
      Alert.alert(
        t('common.error') || 'خطأ',
        error instanceof Error ? error.message : t('otp.sendFailed') || 'فشل إرسال رمز التحقق'
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
              <Text style={styles.title}>{t('auth.register.title')}</Text>
              <Text style={styles.subtitle}>
                {t('auth.register.subtitle')}
              </Text>
            </View>

            {/* Full Name Field */}
            <FormInput
              label={t('auth.register.fullName')}
              placeholder={t('common.placeholder.fullName')}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />

            {/* Email Field */}
            <FormInput
              label={t('auth.register.email')}
              placeholder={t('common.placeholder.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />

            {/* Phone Field */}
            <FormInput
              label={t('auth.register.phone')}
              placeholder={t('common.placeholder.phone')}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {/* Password Field */}
            <FormInput
              label={t('auth.register.password')}
              placeholder={t('common.placeholder.password')}
              secureTextEntry
              showPasswordToggle
              textContentType="newPassword"
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
            />

            {/* Confirm Password Field */}
            <FormInput
              label={t('auth.register.confirmPassword')}
              placeholder={t('common.placeholder.password')}
              secureTextEntry
              showPasswordToggle
              textContentType="newPassword"
              autoComplete="password-new"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && (
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                {t('auth.register.terms')} <Text style={styles.termsLink}>{t('auth.register.termsLink')}</Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <GradientButton 
              text={isLoading ? t('common.loading') || 'جاري التحميل...' : t('auth.register.button')} 
              onPress={handleSubmit}
              disabled={isLoading}
            />

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>{t('auth.register.separator')}</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <MaterialIcons name="apple" size={24} color="#FFFFFF" />
                <Text style={styles.socialText}>{t('common.apple')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <MaterialIcons name="all-inclusive" size={24} color="#FFFFFF" />
                <Text style={styles.socialText}>{t('common.google')}</Text>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.register.loginQuestion')} </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>{t('auth.register.loginLink')}</Text>
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
    textAlign: 'center',
    opacity: 0.8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginEnd: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  termsText: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.8,
  },
  termsLink: {
    color: '#D4AF37',
    fontWeight: '700',
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
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  loginLink: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
});

