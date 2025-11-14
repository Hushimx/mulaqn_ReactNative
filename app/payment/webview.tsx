import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';

export default function PaymentWebViewScreen() {
  const router = useRouter();
  const { url, paymentId, trackId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const decodedUrl = typeof url === 'string' ? decodeURIComponent(url) : '';

  const checkPaymentStatus = async () => {
    if (!paymentId || checking) return;

    try {
      setChecking(true);
      const response = await api.get<{ ok: boolean; data: any }>(
        API_ENDPOINTS.PAYMENTS + `/${paymentId}`
      );

      if (response && response.ok && response.data) {
        const { status } = response.data;
        
        if (status === 'paid') {
          // Payment successful
          router.replace(`/payment/success?trackId=${trackId}&paymentId=${paymentId}`);
        } else if (status === 'failed' || status === 'cancelled') {
          // Payment failed
          router.replace(`/payment/error?reason=${status}`);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url: currentUrl } = navState;
    
    // Check if URL indicates success or failure
    if (currentUrl.includes('success') || currentUrl.includes('paid')) {
      // Payment successful - webhook will handle subscription activation
      setTimeout(() => {
        router.replace(`/payment/success?trackId=${trackId}&paymentId=${paymentId}`);
      }, 1000); // Small delay to ensure webhook processes
    } else if (currentUrl.includes('error') || currentUrl.includes('cancel')) {
      router.replace(`/payment/error?reason=cancelled`);
    }
  };

  const handleClose = () => {
    router.back();
  };

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

        {/* WebView */}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: decodedUrl }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4AF37" />
                <Text style={styles.loadingText}>جارٍ تحميل صفحة الدفع...</Text>
              </View>
            )}
          />
        </View>

        {/* Processing indicator */}
        {checking && (
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
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  loadingText: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '600',
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

