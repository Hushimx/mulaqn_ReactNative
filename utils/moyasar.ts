import {
  PaymentConfig,
  CreditCardConfig,
  ApplePayConfig,
  SamsungPayConfig,
} from 'react-native-moyasar-sdk';
import { Platform } from 'react-native';

export interface MoyasarPaymentData {
  payment_id: string;
  moyasar_payment_id: string;
  publishable_key: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Create Moyasar PaymentConfig from API response
 */
export function createMoyasarPaymentConfig(
  paymentData: MoyasarPaymentData
): PaymentConfig {
  // Convert amount from SAR to halaalas (smallest currency unit)
  const amountInHalaalas = Math.round(paymentData.amount * 100);

  const config = new PaymentConfig({
    givenId: paymentData.moyasar_payment_id,
    publishableApiKey: paymentData.publishable_key,
    amount: amountInHalaalas,
    currency: paymentData.currency || 'SAR',
    description: paymentData.description || 'دفع اشتراك',
    merchantCountryCode: 'SA',
    supportedNetworks: ['mada', 'visa', 'mastercard', 'amex'],
    metadata: paymentData.metadata || {},
    creditCard: new CreditCardConfig({
      saveCard: false,
      manual: false,
    }),
    applyCoupon: false,
  });

  // Add Apple Pay config for iOS - Temporarily disabled until merchant ID is configured
  // if (Platform.OS === 'ios') {
  //   config.applePay = new ApplePayConfig({
  //     merchantId: 'merchant.com.mulaqn', // Update with your actual merchant ID
  //     label: 'ملقن',
  //     manual: false,
  //     saveCard: false,
  //   });
  // }

  // Add Samsung Pay config for Android - Temporarily disabled until service ID is configured
  // if (Platform.OS === 'android') {
  //   config.samsungPay = new SamsungPayConfig({
  //     serviceId: 'YOUR_SERVICE_ID', // Update with your actual service ID
  //     merchantName: 'ملقن',
  //     orderNumber: paymentData.moyasar_payment_id,
  //     manual: false,
  //   });
  // }

  // Add STC Pay config (if available)
  // Note: STC Pay configuration may vary - check Moyasar SDK documentation
  // config.stcPay = new StcPayConfig({
  //   manual: false,
  // });

  return config;
}

/**
 * Check if Apple Pay is available
 */
export function isApplePayAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Check if Samsung Pay is available
 */
export function isSamsungPayAvailable(): boolean {
  return Platform.OS === 'android';
}

