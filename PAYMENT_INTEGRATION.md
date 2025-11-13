# 💳 Paylink Payment Integration - React Native

دليل دمج نظام الدفع في تطبيق Mulaqn React Native.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @react-native-async-storage/async-storage
# Already installed, used for storing token
```

### 2. API Configuration

Create `services/PaymentService.ts`:

```typescript
import { API_URL } from '../constants/Config';

export interface Payment {
  payment_id: number;
  invoice_url: string;
  order_number: string;
  transaction_no: string;
  amount: string;
  currency: string;
}

export interface PaymentStatus {
  id: number;
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  payment_method: string;
  order_number: string;
  transaction_no: string;
  paid_at: string | null;
  subscription?: {
    id: number;
    status: string;
    start_date: string;
    end_date: string;
  };
}

export class PaymentService {
  private static baseUrl = `${API_URL}/api`;

  static async createPayment(
    planId: number,
    token: string
  ): Promise<Payment | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscription-plans/${planId}/pay`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.ok) {
        return data.data;
      }

      console.error('Payment creation failed:', data.error);
      return null;
    } catch (error) {
      console.error('Error creating payment:', error);
      return null;
    }
  }

  static async getPaymentStatus(
    paymentId: number,
    token: string
  ): Promise<PaymentStatus | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.ok) {
        return data.data;
      }

      return null;
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  static async cancelPayment(
    paymentId: number,
    token: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/payments/${paymentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      return false;
    }
  }

  static async pollPaymentStatus(
    paymentId: number,
    token: string,
    onStatusChange: (status: string) => void,
    maxAttempts: number = 60
  ): Promise<PaymentStatus | null> {
    let attempts = 0;

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        attempts++;

        const payment = await this.getPaymentStatus(paymentId, token);

        if (payment) {
          onStatusChange(payment.status);

          if (payment.status === 'paid') {
            clearInterval(interval);
            resolve(payment);
          } else if (['failed', 'cancelled'].includes(payment.status)) {
            clearInterval(interval);
            resolve(payment);
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve(null);
        }
      }, 5000); // Poll every 5 seconds
    });
  }
}
```

### 3. Create Payment Screen Component

Create `screens/SubscribePlanScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { PaymentService } from '../services/PaymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  track: {
    id: number;
    name: string;
  };
}

export default function SubscribePlanScreen({ route, navigation }) {
  const { plan } = route.params as { plan: SubscriptionPlan };
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('خطأ', 'الرجاء تسجيل الدخول أولاً');
        navigation.navigate('Login');
        return;
      }

      // Create payment
      const payment = await PaymentService.createPayment(plan.id, token);

      if (!payment) {
        Alert.alert('خطأ', 'فشل في إنشاء الفاتورة. الرجاء المحاولة مرة أخرى.');
        setLoading(false);
        return;
      }

      setPaymentId(payment.payment_id);

      // Open Paylink payment page
      const canOpen = await Linking.canOpenURL(payment.invoice_url);
      if (canOpen) {
        await Linking.openURL(payment.invoice_url);

        // Start polling for payment status
        pollPaymentStatus(payment.payment_id, token);
      } else {
        Alert.alert('خطأ', 'لا يمكن فتح صفحة الدفع');
        setLoading(false);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: number, token: string) => {
    const payment = await PaymentService.pollPaymentStatus(
      paymentId,
      token,
      (status) => {
        console.log('Payment status:', status);
      }
    );

    setLoading(false);

    if (payment?.status === 'paid') {
      Alert.alert(
        'نجح الدفع! 🎉',
        'تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول لجميع الدروس.',
        [
          {
            text: 'ابدأ التعلم',
            onPress: () => {
              navigation.navigate('TrackDashboard', {
                trackId: plan.track.id,
              });
            },
          },
        ]
      );
    } else if (payment?.status === 'failed') {
      Alert.alert(
        'فشل الدفع',
        'لم تتم عملية الدفع بنجاح. الرجاء المحاولة مرة أخرى.',
        [
          {
            text: 'حاول مرة أخرى',
            onPress: handleSubscribe,
          },
          {
            text: 'إلغاء',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert(
        'انتهت المهلة',
        'الرجاء التحقق من حالة الدفع يدوياً أو المحاولة مرة أخرى.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.trackName}>{plan.track.name}</Text>
        <Text style={styles.price}>{plan.price.toFixed(2)} ريال</Text>
        <Text style={styles.duration}>{plan.duration_days} يوم</Text>
        
        {plan.description && (
          <Text style={styles.description}>{plan.description}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>اشترك الآن</Text>
          )}
        </TouchableOpacity>

        {loading && paymentId && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.statusText}>
              في انتظار إتمام الدفع...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  trackName: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  duration: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#718096',
  },
});
```

### 4. Add Config

In `constants/Config.ts`:

```typescript
export const API_URL = 'http://localhost:8000'; // Change to your API URL
// For production: 'https://api.mulaqn.sa'
```

## 🎯 Usage Flow

1. User selects subscription plan
2. App creates payment via API
3. App opens Paylink URL in browser/WebView
4. User completes payment on Paylink
5. App polls payment status
6. When status = 'paid', show success and navigate
7. User can now access track content

## 📱 Testing

### Local Testing

1. Start Laravel server: `php artisan serve`
2. Update API_URL to your local IP: `http://192.168.1.X:8000`
3. Run app: `npm start`
4. Test with Paylink test cards

### Test Cards

```
Visa:  4111 1111 1111 1111 | CVV: 123 | Exp: 12/25
Mada:  5297 4100 0000 0000 | CVV: 123 | Exp: 12/25
```

## 🔧 Additional Features

### Show Payment History

```typescript
// In user profile or dashboard
const [payments, setPayments] = useState([]);

useEffect(() => {
  fetchPayments();
}, []);

const fetchPayments = async () => {
  const token = await AsyncStorage.getItem('token');
  // API endpoint to get user payments (you may need to create this)
  const response = await fetch(`${API_URL}/api/me/payments`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (data.ok) {
    setPayments(data.data);
  }
};
```

### Check Active Subscription

```typescript
const checkSubscription = async (trackId: number): Promise<boolean> => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  if (data.ok && data.data.subscriptions) {
    return data.data.subscriptions.some(
      (sub: any) => sub.track_id === trackId && sub.status === 'active'
    );
  }
  return false;
};
```

## 🎨 UI Improvements

### Add Loading States

```typescript
const [pollingStatus, setPollingStatus] = useState<string>('');

// In pollPaymentStatus:
PaymentService.pollPaymentStatus(
  paymentId,
  token,
  (status) => {
    setPollingStatus(status);
  }
);
```

### Show Payment Receipt

Create `PaymentReceiptScreen.tsx` to show payment details after success.

## 🔒 Security Notes

- Never store Paylink credentials in app
- Always use HTTPS in production
- Validate payment status on backend
- Don't trust client-side payment status alone

## 📞 Support

If you encounter issues:
- Check API_URL is correct
- Verify token is valid
- Check network connection
- Review Laravel logs
- Contact Paylink support for payment issues

## ✨ Done!

Your React Native app is now ready to accept payments via Paylink! 🎉

