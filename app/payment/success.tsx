import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { trackId, paymentId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const fetchSubscriptionDetails = async () => {
    try {
      if (paymentId) {
        // Fetch payment details to get subscription info
        const response = await api.get<{ ok: boolean; data: any }>(
          API_ENDPOINTS.PAYMENT(paymentId as string)
        );

        if (response && response.ok && response.data) {
          setSubscription(response.data.subscription);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLearning = () => {
    if (trackId) {
      router.replace(`/(tabs)/tracks/${trackId}`);
    } else {
      router.replace('/(tabs)');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={styles.loadingText}>جارٍ تأكيد الاشتراك...</Text>
            </View>
          ) : (
            <>
              {/* Success Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="check-circle" size={80} color="#10B981" />
                </View>
              </View>

              {/* Success Message */}
              <Text style={styles.title}>تم الاشتراك بنجاح! 🎉</Text>
              <Text style={styles.subtitle}>
                مبروك! لقد تم تفعيل اشتراكك بنجاح
              </Text>

              {/* Subscription Details */}
              {subscription && (
                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>حالة الاشتراك</Text>
                    <View style={styles.statusBadge}>
                      <MaterialIcons name="verified" size={16} color="#10B981" />
                      <Text style={styles.statusText}>مفعّل</Text>
                    </View>
                  </View>

                  {subscription.start_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>تاريخ البدء</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(subscription.start_date)}
                      </Text>
                    </View>
                  )}

                  {subscription.end_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>تاريخ الانتهاء</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(subscription.end_date)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Features List */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>يمكنك الآن:</Text>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>الوصول لجميع الدروس والمحتويات</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>تتبع تقدمك وحل التمارين</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>الحصول على شهادة إتمام معتمدة</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartLearning}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>ابدأ التعلم الآن</Text>
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.replace('/(tabs)')}
                activeOpacity={0.7}
              >
                <Text style={styles.homeButtonText}>العودة للرئيسية</Text>
              </TouchableOpacity>
            </>
          )}
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
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
  },
  detailsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
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
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  homeButton: {
    paddingVertical: 12,
  },
  homeButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

