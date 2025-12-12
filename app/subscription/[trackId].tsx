import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';

const { width } = Dimensions.get('window');

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
  price: number | string;
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

// Marketing content for each track
const trackMarketingContent = {
  1: { // قدرات
    heroTitle: 'اكتشف قدراتك الحقيقية',
    heroSubtitle: 'اختبار القدرات العامة - رحلتك نحو النجاح تبدأ من هنا',
    stats: [
      { icon: 'school', label: 'دروس تفاعلية', value: '500+' },
      { icon: 'quiz', label: 'أسئلة محاكاة', value: '10,000+' },
      { icon: 'trending-up', label: 'نسبة النجاح', value: '95%' },
      { icon: 'people', label: 'طلاب نشطون', value: '50,000+' },
    ],
    features: [
      'وصول غير محدود لجميع الدروس التفاعلية',
      'أسئلة محاكاة حقيقية للاختبار',
      'تتبع تقدمك بدقة مع تحليلات متقدمة',
      'تقارير تفصيلية أسبوعية وشهرية',
      'نظام إتقان المهارات (IRT)',
      'لوحة صدارة تنافسية',
      'إنجازات وبادجات حصرية',
    ],
    benefits: [
      'حسّن قدراتك التحليلية والاستدلالية',
      'استعد بثقة للاختبار النهائي',
      'احصل على نتائج مضمونة',
    ],
  },
  2: { // تحصيلي
    heroTitle: 'احقق أعلى الدرجات',
    heroSubtitle: 'الاختبار التحصيلي - اجتياز المواد الدراسية بامتياز',
    stats: [
      { icon: 'book', label: 'مواد شاملة', value: '6+' },
      { icon: 'assignment', label: 'اختبارات محاكاة', value: '200+' },
      { icon: 'star', label: 'نسبة التفوق', value: '92%' },
      { icon: 'groups', label: 'طلاب متفوقون', value: '45,000+' },
    ],
    features: [
      'دروس شاملة لجميع المواد الدراسية',
      'اختبارات محاكاة حقيقية',
      'شرح مفصل لكل سؤال',
      'تتبع أدائك في كل مادة',
      'خطط دراسية مخصصة',
      'نظام مراجعة ذكي',
      'إحصائيات تفصيلية',
    ],
    benefits: [
      'قوّي تحصيلك في جميع المواد',
      'احصل على أعلى الدرجات',
      'كن جاهزاً للاختبار النهائي',
    ],
  },
  3: { // STEP
    heroTitle: 'أتقن اللغة الإنجليزية',
    heroSubtitle: 'اختبار كفايات اللغة الإنجليزية - خطوتك الأولى نحو العالمية',
    stats: [
      { icon: 'translate', label: 'مستويات متقدمة', value: '5+' },
      { icon: 'record-voice-over', label: 'تدريبات صوتية', value: '1,000+' },
      { icon: 'verified', label: 'نسبة النجاح', value: '88%' },
      { icon: 'public', label: 'طلاب دوليون', value: '30,000+' },
    ],
    features: [
      'دروس تفاعلية لجميع المهارات',
      'تدريبات على القراءة والكتابة',
      'اختبارات استماع حقيقية',
      'قواعد شاملة مع أمثلة',
      'مفردات متقدمة',
      'اختبارات محاكاة STEP',
      'تتبع تقدمك في كل مهارة',
    ],
    benefits: [
      'حسّن مستواك في اللغة الإنجليزية',
      'احصل على شهادة معتمدة',
      'افتح آفاقاً جديدة لمستقبلك',
    ],
  },
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { trackId } = useLocalSearchParams();
  const { textAlign, flexDirection } = useLanguage();
  const { user } = useAuth();
  const [track, setTrack] = useState<Track | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const trackColors = getTrackColors(track?.id || null);
  const marketingContent = trackMarketingContent[track?.id as keyof typeof trackMarketingContent] || trackMarketingContent[1];

  useEffect(() => {
    fetchData();
  }, [trackId]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

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
        // Filter to show only monthly (30 days) and yearly (365 days) plans
        // Also filter by plan_type to only show personal plans
        const filteredPlans = plansResponse.data.filter(
          plan => (plan.duration_days === 30 || plan.duration_days === 365) && plan.plan_type === 'personal'
        );
        
        // Sort: monthly first, then yearly
        const sortedPlans = filteredPlans.sort((a, b) => {
          if (a.duration_days === 30) return -1;
          if (b.duration_days === 30) return 1;
          return 0;
        });
        
        setPlans(sortedPlans);
        // Auto-select monthly plan
        const monthlyPlan = sortedPlans.find(p => p.duration_days === 30);
        if (monthlyPlan) {
          setSelectedPlan(monthlyPlan.id);
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
    if (!selectedPlan) {
      alert('الرجاء اختيار خطة اشتراك');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      alert('الرجاء تسجيل الدخول أولاً');
      router.push('/(auth)/login');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setPaymentLoading(true);
      
      console.log('Creating payment for plan:', selectedPlan);
      console.log('API Endpoint:', API_ENDPOINTS.CREATE_PAYMENT(selectedPlan));
      console.log('User authenticated:', !!user);
      
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.CREATE_PAYMENT(selectedPlan),
        {
          success_url: 'mulaqn://payment/success',
          error_url: 'mulaqn://payment/error',
        }
      );

      console.log('Payment creation response:', response);

      if (response && response.ok && response.data) {
        const { payment_id } = response.data;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/payment/moyasar?paymentId=${payment_id}&trackId=${trackId}`);
      } else {
        throw new Error(response?.error?.message || 'فشل في إنشاء الدفع');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Show more detailed error message
      let errorMessage = error.message || 'حدث خطأ أثناء إنشاء الدفع. الرجاء التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.';
      
      // Check if it's an authentication error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('انتهت صلاحية')) {
        errorMessage = 'انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى';
        router.push('/(auth)/login');
      }
      
      alert(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
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
        {/* Header */}
        <View style={[styles.header, { flexDirection }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: trackColors.primary }]}>
            <Text style={styles.badgeText}>{track?.name.toUpperCase()}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[styles.heroIconContainer, { backgroundColor: `${trackColors.primary}20` }]}>
              <MaterialIcons name="rocket-launch" size={48} color={trackColors.primary} />
            </View>
            <Text style={[styles.heroTitle, { textAlign }]}>
              {marketingContent.heroTitle}
            </Text>
            <Text style={[styles.heroSubtitle, { textAlign }]}>
              {marketingContent.heroSubtitle}
              </Text>
          </Animated.View>

          {/* Stats Section */}
          <Animated.View
            style={[
              styles.statsSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.statsGrid}>
              {marketingContent.stats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: `${trackColors.primary}15` }]}>
                    <MaterialIcons name={stat.icon as any} size={24} color={trackColors.primary} />
                  </View>
                  <Text style={[styles.statValue, { color: trackColors.primary }]}>
                    {stat.value}
              </Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Features Section */}
          {!subscription?.subscribed && (
            <Animated.View
              style={[
                styles.featuresSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { textAlign }]}>مميزات الاشتراك</Text>
              <View style={styles.featuresList}>
                {marketingContent.features.map((feature, index) => (
                  <View key={index} style={[styles.featureItem, { flexDirection }]}>
                    <View style={[styles.featureIcon, { backgroundColor: `${trackColors.primary}20` }]}>
                      <MaterialIcons name="check-circle" size={20} color={trackColors.primary} />
                    </View>
                    <Text style={[styles.featureText, { textAlign }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Subscription Plans */}
          {!subscription?.subscribed ? (
            <Animated.View
              style={[
                styles.plansSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { textAlign }]}>اختر خطتك</Text>
              <View style={styles.plansContainer}>
                {plans.map((plan, index) => {
                  const isMonthly = plan.duration_days === 30;
                  const isYearly = plan.duration_days === 365;
                  const isSelected = selectedPlan === plan.id;
              
              return (
                    <Animated.View
                      key={plan.id}
                      style={{
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: slideAnim.interpolate({
                              inputRange: [0, 50],
                              outputRange: [0, 50 + index * 20],
                            }),
                          },
                        ],
                      }}
                    >
              <TouchableOpacity
                style={[
                          styles.planCard,
                          isSelected && {
                    borderColor: trackColors.primary,
                            borderWidth: 2.5,
                            backgroundColor: trackColors.primary === '#118066' 
                              ? 'rgba(17, 128, 102, 0.2)' 
                              : trackColors.primary === '#3B82F6' 
                              ? 'rgba(59, 130, 246, 0.2)' 
                              : 'rgba(139, 92, 246, 0.2)',
                  },
                ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedPlan(plan.id);
                        }}
                        activeOpacity={0.9}
              >
                        {isYearly && (
                  <View style={[styles.popularBadge, { backgroundColor: trackColors.primary }]}>
                            <MaterialIcons name="star" size={16} color="#FFFFFF" />
                            <Text style={styles.popularBadgeText}>الأفضل قيمة</Text>
                  </View>
                )}

                        {/* Glow effect for selected card */}
                        {isSelected && (
                          <View style={[styles.selectedGlow, { backgroundColor: `${trackColors.primary}20` }]} />
                        )}

                        <View style={styles.planHeader}>
                          <View style={styles.planNameContainer}>
                            <Text style={[styles.planName, { textAlign, color: '#FFFFFF' }]}>
                              {isMonthly ? 'اشتراك شهري' : 'اشتراك سنوي'}
                </Text>
                            {isYearly && (
                              <View style={[styles.yearlyBadge, { backgroundColor: trackColors.primary }]}>
                                <Text style={styles.yearlyBadgeText}>الأفضل</Text>
                  </View>
                            )}
                </View>
                          {isSelected && (
                  <View style={[styles.checkIcon, { backgroundColor: trackColors.primary }]}>
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                            </View>
                          )}
                        </View>

                        <View style={styles.priceContainer}>
                          <View style={styles.priceRow}>
                            <Text style={styles.price}>
                              {Number(plan.price).toFixed(2)}
                            </Text>
                            <Text style={styles.priceCurrency}>ريال</Text>
                          </View>
                          <Text style={styles.pricePeriod}>
                            {isMonthly ? 'شهرياً' : 'سنوياً'}
                          </Text>
                        </View>

                        {isYearly && (
                          <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                              وفر {((Number(plans.find(p => p.duration_days === 30)?.price || 0) * 12 - Number(plan.price)) / (Number(plans.find(p => p.duration_days === 30)?.price || 0) * 12) * 100).toFixed(0)}%
                            </Text>
                  </View>
                )}
              </TouchableOpacity>
                    </Animated.View>
            );
          })}
          </View>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.subscribedSection,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={[styles.subscribedCard, { borderColor: trackColors.primary }]}>
                <MaterialIcons name="check-circle" size={64} color={trackColors.primary} />
                <Text style={[styles.subscribedTitle, { textAlign }]}>لديك اشتراك نشط</Text>
                <Text style={[styles.subscribedSubtitle, { textAlign }]}>
                  يمكنك الآن الوصول لجميع محتويات {track?.name}
                </Text>
                {subscription.subscription?.end_date && (
                  <Text style={styles.subscriptionExpiry}>
                    صالح حتى {new Date(subscription.subscription.end_date).toLocaleDateString('ar-SA')}
                  </Text>
                )}
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: trackColors.primary }]}
                onPress={() => router.push(`/(tabs)/tracks/${trackId}`)}
                activeOpacity={0.8}
              >
                  <Text style={styles.startButtonText}>ابدأ التعلم</Text>
                  <MaterialIcons name={flexDirection === 'row-reverse' ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
              </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Benefits Section */}
          {!subscription?.subscribed && (
            <Animated.View
              style={[
                styles.benefitsSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { textAlign }]}>لماذا تختارنا؟</Text>
              <View style={styles.benefitsList}>
                {marketingContent.benefits.map((benefit, index) => (
                  <View key={index} style={[styles.benefitItem, { flexDirection }]}>
                    <MaterialIcons name="auto-awesome" size={24} color={trackColors.primary} />
                    <Text style={[styles.benefitText, { textAlign }]}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* CTA Section */}
          {!subscription?.subscribed && (
            <Animated.View
              style={[
                styles.ctaSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={[styles.ctaText, { textAlign }]}>
                الدفع آمن ومشفّر. يمكنك الإلغاء في أي وقت.
              </Text>
              <TouchableOpacity
                style={[
                  styles.subscribeButton,
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
                    <Text style={[styles.subscribeButtonText, { color: '#1B365D' }]}>
                      اشترك الآن
                    </Text>
                    <MaterialIcons 
                      name={flexDirection === 'row-reverse' ? "arrow-forward" : "arrow-back"} 
                      size={24} 
                      color="#1B365D" 
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
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
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  heroIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 42,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  plansSection: {
    marginBottom: 32,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  selectedGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    opacity: 0.3,
    zIndex: -1,
  },
  popularBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  planNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  yearlyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yearlyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priceContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceCurrency: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 20,
    fontWeight: '600',
  },
  pricePeriod: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  savingsBadge: {
    backgroundColor: 'rgba(99, 205, 47, 0.2)',
    borderColor: '#63CD2F',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  savingsText: {
    color: '#63CD2F',
    fontSize: 13,
    fontWeight: '700',
  },
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  benefitText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  ctaSection: {
    marginBottom: 20,
  },
  ctaText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  subscribeButton: {
    flexDirection: 'row-reverse',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  subscribedSection: {
    marginBottom: 32,
  },
  subscribedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
  },
  subscribedTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  subscribedSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  subscriptionExpiry: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row-reverse',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
