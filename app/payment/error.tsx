import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';

export default function PaymentErrorScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams();

  const getErrorMessage = () => {
    if (reason === 'cancelled') {
      return {
        title: 'تم إلغاء العملية',
        message: 'لقد قمت بإلغاء عملية الدفع. يمكنك المحاولة مرة أخرى في أي وقت.',
        icon: 'cancel' as const,
      };
    } else if (reason === 'failed') {
      return {
        title: 'فشلت عملية الدفع',
        message: 'حدث خطأ أثناء معالجة الدفع. يرجى التحقق من بياناتك والمحاولة مرة أخرى.',
        icon: 'error' as const,
      };
    } else {
      return {
        title: 'حدث خطأ',
        message: 'نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.',
        icon: 'error-outline' as const,
      };
    }
  };

  const errorInfo = getErrorMessage();

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={errorInfo.icon} size={80} color="#EF4444" />
            </View>
          </View>

          {/* Error Message */}
          <Text style={styles.title}>{errorInfo.title}</Text>
          <Text style={styles.subtitle}>{errorInfo.message}</Text>

          {/* Help Info */}
          <View style={styles.helpCard}>
            <MaterialIcons name="info-outline" size={24} color="#D4AF37" />
            <View style={styles.helpText}>
              <Text style={styles.helpTitle}>تحتاج مساعدة؟</Text>
              <Text style={styles.helpDescription}>
                يمكنك التواصل مع الدعم الفني إذا استمرت المشكلة
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>حاول مرة أخرى</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={styles.homeButtonText}>العودة للرئيسية</Text>
          </TouchableOpacity>

          {/* Contact Support */}
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => {
              // TODO: Open support/contact page
              console.log('Contact support');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="support-agent" size={20} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.supportButtonText}>تواصل مع الدعم الفني</Text>
          </TouchableOpacity>
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
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  helpCard: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  helpText: {
    flex: 1,
  },
  helpTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
  },
  helpDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  homeButton: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  homeButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  supportButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
});

