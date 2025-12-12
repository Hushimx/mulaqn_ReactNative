import React, { useState, useRef, useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRTL } from '@/hooks/useRTL';

export default function RegisterOtpScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { sendOtp, register } = useAuth();
  const { textAlign, flexDirection } = useLanguage();
  const rtl = useRTL();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputs = useRef<(TextInput | null)[]>([]);

  const phone = params.phone as string;
  const fullName = params.fullName as string;
  const email = params.email as string;
  const password = params.password as string;
  const confirmPassword = params.confirmPassword as string;

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto focus first input
  useEffect(() => {
    setTimeout(() => {
      otpInputs.current[0]?.focus();
    }, 100);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue.length > 1) {
      const digits = numericValue.split('').slice(0, 6);
      const newOtp = [...otpCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtpCode(newOtp);
      
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otpCode];
      newOtp[index] = numericValue;
      setOtpCode(newOtp);

      if (numericValue && index < 5) {
        otpInputs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otpCode.join('');
    
    if (fullOtp.length !== 6) {
      Alert.alert(
        t('common.error') || 'خطأ',
        t('otp.incomplete') || 'الرجاء إدخال رمز التحقق كاملاً'
      );
      return;
    }

    try {
      setIsLoading(true);
      
      // إنشاء الحساب مع OTP (التحقق يتم في Backend)
      await register(fullName, email, phone, password, confirmPassword, fullOtp);
      
      // الانتقال لصفحة النجاح
      router.replace({
        pathname: '/register-success',
        params: { fullName },
      });
    } catch (error) {
      Alert.alert(
        t('common.error') || 'خطأ',
        error instanceof Error ? error.message : t('otp.invalid') || 'رمز التحقق غير صحيح'
      );
      setOtpCode(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      Alert.alert(
        t('common.error') || 'خطأ',
        t('otp.waitBeforeResend', { seconds: countdown }) || `الرجاء الانتظار ${countdown} ثانية قبل إعادة الإرسال`
      );
      return;
    }

    try {
      setIsLoading(true);
      await sendOtp(phone, 'register');
      setCountdown(60);

      Alert.alert(
        t('common.success') || 'نجح',
        t('otp.sent') || 'تم إرسال رمز التحقق بنجاح'
      );
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
            <Text style={[styles.title, { textAlign }]}>
              {t('otp.title') || 'أدخل رمز التحقق'}
            </Text>

            {/* Instructions */}
            <Text style={[styles.instructions, { textAlign }]}>
              {t('otp.instructions') || 'لقد أرسلنا رمزا إلى رقم هاتفك الذي أدخلته، يرجى إدخال الرمز لإكمال التحقق.'}
            </Text>

            {/* OTP Input Fields */}
            <View style={styles.otpContainer}>
              {otpCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpInputs.current[index] = ref)}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Verify Button */}
            <GradientButton
              text={isLoading ? (t('common.loading') || 'جاري التحقق...') : (t('otp.verify') || 'تحقق الان')}
              onPress={handleVerify}
              disabled={isLoading}
            />

            {/* Resend Option */}
            <View style={[styles.resendContainer, { flexDirection }]}>
              <Text style={[styles.resendText, { textAlign }]}>
                {t('otp.noCode') || 'لم يصلك أي رمز؟'}
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0 || isLoading}
              >
                <Text style={[styles.resendLink, { textAlign }, (countdown > 0 || isLoading) && styles.resendLinkDisabled]}>
                  {countdown > 0
                    ? t('otp.resendCountdown', { seconds: countdown }) || `أعد إرسال الرمز (${countdown})`
                    : t('otp.resend') || 'أعد إرسال الرمز'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
    marginBottom: 40,
    gap: 14,
    alignSelf: 'center',
  },
  otpInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    minWidth: 50,
    maxWidth: 60,
  },
  resendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  resendText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  resendLink: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
});

