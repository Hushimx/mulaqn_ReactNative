import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CreditCard,
  // ApplePay, // Temporarily disabled
  // SamsungPay, // Temporarily disabled
  PaymentConfig,
  PaymentResponse,
  PaymentStatus,
  PaymentResult,
} from 'react-native-moyasar-sdk';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';
import { createMoyasarPaymentConfig, MoyasarPaymentData } from '@/utils/moyasar';

export default function MoyasarPaymentScreen() {
  const router = useRouter();
  const { paymentId, trackId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentData, setPaymentData] = useState<MoyasarPaymentData | null>(null);

  useEffect(() => {
    fetchPaymentData();
  }, [paymentId]);

  const fetchPaymentData = async () => {
    if (!paymentId) {
      router.back();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: any }>(
        API_ENDPOINTS.PAYMENT(paymentId as string)
      );

      if (response && response.ok && response.data) {
        const data = response.data;
        
        // Check if payment is already paid
        if (data.status === 'paid') {
          router.replace(`/payment/success?trackId=${trackId}&paymentId=${paymentId}`);
          return;
        }

        // Create Moyasar payment data
        const moyasarData: MoyasarPaymentData = {
          payment_id: paymentId as string,
          moyasar_payment_id: data.moyasar_payment_id || paymentId as string,
          publishable_key: data.publishable_key || '',
          amount: parseFloat(data.amount),
          currency: data.currency || 'SAR',
          description: data.description || 'دفع اشتراك',
          metadata: data.metadata || {},
        };

        setPaymentData(moyasarData);
        const config = createMoyasarPaymentConfig(moyasarData);
        setPaymentConfig(config);
      } else {
        alert('فشل في تحميل بيانات الدفع');
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching payment data:', error);
      alert(error.message || 'حدث خطأ أثناء تحميل بيانات الدفع');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentResult = async (result: PaymentResult) => {
    if (result instanceof PaymentResponse) {
      setProcessing(true);
      
      try {
        // Check payment status with backend
        const response = await api.get<{ ok: boolean; data: any }>(
          API_ENDPOINTS.PAYMENT(paymentId as string)
        );

        if (response && response.ok && response.data) {
          const { status } = response.data;

          if (status === 'paid' || result.status === PaymentStatus.paid) {
            // Payment successful
            router.replace(`/payment/success?trackId=${trackId}&paymentId=${paymentId}`);
          } else if (status === 'failed' || result.status === PaymentStatus.failed) {
            // Payment failed
            router.replace(`/payment/error?reason=failed`);
          } else {
            // Still processing
            setTimeout(() => {
              handlePaymentResult(result);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // Still navigate to success if payment response indicates success
        if (result.status === PaymentStatus.paid) {
          router.replace(`/payment/success?trackId=${trackId}&paymentId=${paymentId}`);
        } else {
          router.replace(`/payment/error?reason=unknown`);
        }
      } finally {
        setProcessing(false);
      }
    } else {
      // Handle errors
      console.error('Payment error:', result);
      router.replace(`/payment/error?reason=error`);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>جارٍ تحميل بيانات الدفع...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!paymentConfig || !paymentData) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#FFFFFF" />
            <Text style={styles.errorText}>فشل في تحميل بيانات الدفع</Text>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <Text style={styles.backButtonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إتمام الدفع</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Payment Content with Keyboard Avoidance */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Payment Methods */}
            <View style={styles.paymentMethodsContainer}>
              <Text style={styles.sectionTitle}>اختر طريقة الدفع</Text>

              {/* Credit Card */}
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodHeader}>
                  <MaterialIcons name="credit-card" size={24} color="#1B365D" />
                  <Text style={styles.paymentMethodTitle}>البطاقة الائتمانية</Text>
                </View>
                <View style={styles.creditCardWrapper}>
                  <CreditCard
                    paymentConfig={paymentConfig}
                    onPaymentResult={handlePaymentResult}
                    style={{
                      container: {
                        backgroundColor: '#FFFFFF',
                        borderRadius: 0,
                        padding: 0,
                      },
                      textInputs: {
                        borderWidth: 1.5,
                        borderColor: '#D1D5DB',
                        borderRadius: 8,
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: '#111827',
                        fontWeight: '400',
                        minHeight: 48,
                      },
                      labels: {
                        color: '#6B7280',
                        fontSize: 13,
                        fontWeight: '500',
                        marginBottom: 6,
                        textAlign: 'left',
                      },
                      buttons: {
                        backgroundColor: '#667eea',
                        borderRadius: 10,
                        paddingVertical: 14,
                        marginTop: 16,
                        width: '100%',
                      },
                      buttonText: {
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '600',
                      },
                    }}
                  />
                </View>
              </View>

            {/* Apple Pay (iOS only) - Temporarily disabled until properly configured */}
            {/* {Platform.OS === 'ios' && paymentConfig.applePay && (
              <View style={styles.paymentMethodCard}>
                <Text style={styles.paymentMethodTitle}>Apple Pay</Text>
                <ApplePay
                  paymentConfig={paymentConfig}
                  onPaymentResult={handlePaymentResult}
                  style={{ buttonType: 'buy' }}
                />
              </View>
            )} */}

            {/* Samsung Pay (Android only) - Temporarily disabled until properly configured */}
            {/* {Platform.OS === 'android' && paymentConfig.samsungPay && (
              <View style={styles.paymentMethodCard}>
                <Text style={styles.paymentMethodTitle}>Samsung Pay</Text>
                <SamsungPay
                  paymentConfig={paymentConfig}
                  onPaymentResult={handlePaymentResult}
                />
              </View>
            )} */}

            {/* STC Pay - Uncomment when STC Pay is configured */}
            {/* {paymentConfig.stcPay && (
              <View style={styles.paymentMethodCard}>
                <Text style={styles.paymentMethodTitle}>STC Pay</Text>
                <StcPay
                  paymentConfig={paymentConfig}
                  onPaymentResult={handlePaymentResult}
                  style={{
                    textInputs: {
                      borderWidth: 1.5,
                      borderColor: '#E0E0E0',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                    },
                  }}
                />
              </View>
            )} */}
          </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Processing overlay */}
        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.processingText}>جارٍ معالجة الدفع...</Text>
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 44,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for keyboard
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethodsContainer: {
    gap: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    marginBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  paymentMethodTitle: {
    color: '#1B365D',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  creditCardWrapper: {
    padding: 18,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  processingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

