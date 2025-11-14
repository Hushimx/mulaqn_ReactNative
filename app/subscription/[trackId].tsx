import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface SubscriptionPlan {
  id: number;
  code: string;
  plan_type: 'personal' | 'family';
  name: string;
  description: string;
  price: number | string; // Can come as string from API
  duration_days: number;
  features: string[];
}

interface UserSubscription {
  subscribed: boolean;
  track_id: number;
  subscription?: {
    id: number;
    status: string;
    end_date: string | null;
    days_remaining: number | null;
  };
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { trackId } = useLocalSearchParams();
  const [track, setTrack] = useState<Track | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  const trackColors = getTrackColors(track?.id || null);

  useEffect(() => {
    fetchData();
  }, [trackId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch track info
      const trackResponse = await api.get<{ ok: boolean; data: Track }>(
        API_ENDPOINTS.TRACK(trackId as string)
      );
      if (trackResponse && trackResponse.ok && trackResponse.data) {
        setTrack(trackResponse.data);
      }

      // Fetch subscription plans for this track
      const plansResponse = await api.get<{ ok: boolean; data: SubscriptionPlan[] }>(
        API_ENDPOINTS.SUBSCRIPTION_PLANS(trackId as string)
      );
      if (plansResponse && plansResponse.ok && plansResponse.data) {
        setPlans(plansResponse.data);
        // Auto-select first personal plan
        const firstPersonalPlan = plansResponse.data.find(p => p.plan_type === 'personal');
        if (firstPersonalPlan) {
          setSelectedPlan(firstPersonalPlan.id);
        }
      }

      // Check if user already has subscription
      try {
        const subResponse = await api.get<{ ok: boolean; data: UserSubscription }>(
          API_ENDPOINTS.CHECK_TRACK_SUBSCRIPTION(trackId as string)
        );
        if (subResponse && subResponse.ok && subResponse.data) {
          setSubscription(subResponse.data);
        }
      } catch (err) {
        console.log('User not logged in or no subscription');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPayment = async () => {
    if (!selectedPlan) return;

    try {
      setPaymentLoading(true);
      
      // Create payment and get Paylink invoice URL
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.CREATE_PAYMENT(selectedPlan),
        {
          success_url: 'mulaqn://payment/success',
          error_url: 'mulaqn://payment/error',
        }
      );

      if (response && response.ok && response.data) {
        const { invoice_url, payment_id } = response.data;
        
        // Navigate to payment webview
        router.push(`/payment/webview?url=${encodeURIComponent(invoice_url)}&paymentId=${payment_id}&trackId=${trackId}`);
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error.message || 'حدث خطأ أثناء إنشاء الدفع');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleViewAllPlans = () => {
    router.back();
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Badge and Back Button */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: trackColors.primary }]}>
            <Text style={styles.badgeText}>SUPER</Text>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Title Section */}
          {subscription?.subscribed ? (
            <View style={styles.titleSection}>
              <MaterialIcons name="check-circle" size={60} color={trackColors.primary} />
              <Text style={styles.title}>
                لديك اشتراك نشط
              </Text>
              <Text style={styles.subtitle}>
                يمكنك الآن الوصول لجميع محتويات {track?.name}
              </Text>
              {subscription.subscription?.end_date && (
                <Text style={styles.subscriptionExpiry}>
                  صالح حتى {new Date(subscription.subscription.end_date).toLocaleDateString('ar-SA')}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                اختر خطة الاشتراك المناسبة
              </Text>
              <Text style={styles.subtitle}>
                ابدأ رحلتك التعليمية في {track?.name}
              </Text>
            </View>
          )}

          {/* Subscription Plans */}
          {!subscription?.subscribed && (
          <View style={styles.tiersContainer}>
            {plans.map((plan) => {
              const isPopular = plan.plan_type === 'personal' && plan.duration_days === 30;
              const isFamily = plan.plan_type === 'family';
              
              return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.tierCard,
                  selectedPlan === plan.id && {
                    borderColor: trackColors.primary,
                    borderWidth: 3,
                  },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: trackColors.primary }]}>
                    <Text style={styles.popularBadgeText}>الأكثر شعبية</Text>
                  </View>
                )}

                {/* Members Badge */}
                {isFamily && (
                  <View style={styles.membersBadge}>
                    <Text style={styles.membersBadgeText}>2 - 6 أعضاء</Text>
                  </View>
                )}

                {/* Plan Name */}
                <Text style={[styles.tierName, { textAlign: 'right' }]}>
                  {plan.name}
                </Text>

                {/* Description */}
                <Text style={styles.tierDescription}>
                  {plan.description}
                </Text>

                {/* Price */}
                <View style={styles.pricesContainer}>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: trackColors.primary }]}>
                      SAR{Number(plan.price).toFixed(2)}
                    </Text>
                    <Text style={styles.priceLabel}>
                      {plan.duration_days === 30 ? '/ شهر' : 
                       plan.duration_days === 365 ? '/ سنة' : 
                       `/ ${plan.duration_days} يوم`}
                    </Text>
                  </View>
                </View>

                {/* Check Icon */}
                {selectedPlan === plan.id && (
                  <View style={[styles.checkIcon, { backgroundColor: trackColors.primary }]}>
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          </View>
          )}

          {subscription?.subscribed ? (
            <>
              {/* Active Subscription Actions */}
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: trackColors.primary }]}
                onPress={() => router.push(`/(tabs)/tracks/${trackId}`)}
                activeOpacity={0.8}
              >
                <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>
                  ابدأ التعلم
                </Text>
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewAllPlansButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllPlansText}>العودة</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Description */}
              <Text style={styles.description}>
                الدفع آمن ومشفّر. يمكنك الإلغاء في أي وقت.
              </Text>

              {/* Subscribe Button */}
              <TouchableOpacity
                style={[
                  styles.startButton, 
                  { backgroundColor: '#FFFFFF' },
                  (paymentLoading || !selectedPlan) && styles.buttonDisabled
                ]}
                onPress={handleStartPayment}
                activeOpacity={0.8}
                disabled={paymentLoading || !selectedPlan}
              >
                {paymentLoading ? (
                  <ActivityIndicator size="small" color="#1B365D" />
                ) : (
                  <>
                    <Text style={[styles.startButtonText, { color: '#1B365D' }]}>
                      اشترك الآن
                    </Text>
                    <MaterialIcons name="arrow-back" size={24} color="#1B365D" />
                  </>
                )}
              </TouchableOpacity>

              {/* View All Plans Link */}
              <TouchableOpacity
                style={styles.viewAllPlansButton}
                onPress={handleViewAllPlans}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllPlansText}>عرض كل المسارات</Text>
              </TouchableOpacity>

              {/* Footer Note */}
              <Text style={styles.footerNote}>
                سيتم تفعيل الاشتراك فوراً بعد إتمام الدفع. يمكنك الوصول لجميع المحتويات
                طوال فترة الاشتراك.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 36,
  },
  titleHighlight: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  highlightBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  titleHighlightText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  subscriptionExpiry: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  tiersContainer: {
    gap: 16,
    marginBottom: 24,
  },
  tierCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  membersBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(27, 54, 93, 0.1)',
  },
  membersBadgeText: {
    color: '#1B365D',
    fontSize: 12,
    fontWeight: '600',
  },
  tierName: {
    color: '#1B365D',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  tierDescription: {
    color: '#1B365D',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'right',
    opacity: 0.8,
  },
  pricesContainer: {
    gap: 8,
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
  priceLabel: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '600',
  },
  yearlyPrice: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllPlansButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  viewAllPlansText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerNote: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

