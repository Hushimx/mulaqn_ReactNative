import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideInLeft,
  ZoomIn,
  BounceIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useTrack, getTrackColors } from '@/contexts/TrackContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { ActiveAssessmentModal } from '@/components/ActiveAssessmentModal';
import { SkeletonStatCard, SkeletonAssessmentCard, SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { SubscriptionRequiredScreen } from '@/components/SubscriptionRequiredScreen';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
}

interface Assessment {
  id: number;
  name: string;
  type: 'placement' | 'diagnostic' | 'periodic';
  total_time_min: number;
  items_count?: number;
}

interface UserPoints {
  total_points: number;
  streak_days: number;
  monthly_points: number;
  weekly_points: number;
}

export default function TrackDashboardScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setCurrentTrack } = useTrack();
  
  const [track, setTrack] = useState<Track | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [lessonsCount, setLessonsCount] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [cancelingAttempt, setCancelingAttempt] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const trackId = parseInt(id);
  const colors = getTrackColors(trackId);

  useEffect(() => {
    if (id && trackId) {
      // تأكد من تحديث track context عند تحميل الصفحة
      setCurrentTrack(trackId);
      checkSubscription();
    }
    
    // Cleanup: عند الخروج من الصفحة، لا نمسح الـ track (دع TabLayout يتعامل معه)
    return () => {
      // لا نفعل شيء - دع TabLayout يمسح عند الرجوع للصفحة الرئيسية
    };
  }, [id, trackId, setCurrentTrack]);

  useEffect(() => {
    // بعد التحقق من الاشتراك، جلب البيانات
    if (hasSubscription !== null && trackId) {
      fetchTrackData();
      checkActiveAttempt();
    }
  }, [hasSubscription, trackId]);

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const response = await api.get<{ ok: boolean; data: { subscribed: boolean } }>(
        API_ENDPOINTS.CHECK_TRACK_SUBSCRIPTION(trackId)
      );
      if (response && response.ok && response.data) {
        setHasSubscription(response.data.subscribed);
      } else {
        setHasSubscription(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setHasSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-50);

  useEffect(() => {
    // Animate header entrance
    headerOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const checkActiveAttempt = async () => {
    try {
      const response = await api.get<{ ok: boolean; data: { active_attempt: any } }>(
        API_ENDPOINTS.ASSESSMENT_ACTIVE
      );
      if (response && response.ok && response.data && response.data.active_attempt) {
        setActiveAttempt(response.data.active_attempt);
      } else {
        setActiveAttempt(null);
      }
    } catch (error) {
      setActiveAttempt(null);
    }
  };

  const fetchTrackData = async () => {
    try {
      setLoading(true);
      setError(null);

      // جلب معلومات المسار
      const trackResponse = await api.get<{ ok: boolean; data: Track }>(
        API_ENDPOINTS.TRACK(id)
      );

      if (trackResponse && trackResponse.ok && trackResponse.data) {
        setTrack(trackResponse.data);
      }

      // جلب نقاط المستخدم (فقط إذا كان مشترك)
      if (hasSubscription) {
        try {
          const pointsResponse = await api.get<{ ok: boolean; data: UserPoints }>(
            API_ENDPOINTS.POINTS,
            { silent401: true } // لا ترمي خطأ عند 401
          );
          if (pointsResponse && pointsResponse.ok && pointsResponse.data) {
            setUserPoints(pointsResponse.data);
          }
        } catch (err: any) {
          // تجاهل خطأ 401 (token منتهي) - هذا طبيعي
          if (err?.message?.includes('انتهت صلاحية الجلسة')) {
            // لا تفعل شيء - المستخدم يحتاج تسجيل الدخول
          } else {
            console.log('Points not available');
          }
        }

        // جلب الاختبارات
        try {
          const assessmentsResponse = await api.get<{ ok: boolean; data: Assessment[] | { assessments: Assessment[]; has_subscription: boolean } }>(
            API_ENDPOINTS.ASSESSMENTS(id)
          );
          if (assessmentsResponse && assessmentsResponse.ok && assessmentsResponse.data) {
            let assessmentsData: Assessment[] = [];
            
            // دعم التنسيق القديم والجديد
            if (Array.isArray(assessmentsResponse.data)) {
              assessmentsData = assessmentsResponse.data;
            } else if (assessmentsResponse.data && typeof assessmentsResponse.data === 'object' && 'assessments' in assessmentsResponse.data) {
              assessmentsData = (assessmentsResponse.data as { assessments: Assessment[]; has_subscription: boolean }).assessments;
            }
            
            console.log('Assessments loaded:', assessmentsData.length, assessmentsData.map(a => ({ type: a.type, name: a.name })));
            setAssessments(assessmentsData);
          } else {
            console.log('Assessments response invalid:', assessmentsResponse);
          }
        } catch (err) {
          console.error('Error loading assessments:', err);
        }

        // جلب عدد الدروس
        try {
          const lessonsResponse = await api.get<{ ok: boolean; data: any[] }>(
            API_ENDPOINTS.LESSONS(id)
          );
          if (lessonsResponse && lessonsResponse.ok && lessonsResponse.data) {
            setLessonsCount(lessonsResponse.data.length);
          }
        } catch (err) {
          console.log('Lessons count not available');
        }
      }

    } catch (err) {
      console.error('Error fetching track data:', err);
      setError(err instanceof Error ? err.message : t('tracks.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const getTrackEmoji = (trackId: number) => {
    switch (trackId) {
      case 1: return '🤖'; // قدرات
      case 2: return '🤖'; // تحصيلي
      case 3: return '🤖'; // STEP
      default: return '🤖';
    }
  };

  const getAssessmentInfo = (type: string) => {
    switch (type) {
      case 'simulation':
        return {
          icon: '🎯',
          title: 'اختبار محاكاة',
          desc: 'اختبار شامل يحاكي الاختبار الحقيقي',
        };
      case 'periodic':
        return {
          icon: '⚡',
          title: t('trackDashboard.assessments.quick.title'),
          desc: 'اختبار تدريبي سريع مع feedback فوري',
        };
      case 'diagnostic':
        return {
          icon: '📝',
          title: t('trackDashboard.assessments.medium.title'),
          desc: 'اختبار متوسط مع تحليل الأداء وfeedback فوري',
        };
      default:
        return { icon: '📋', title: '', desc: '' };
    }
  };

  const handleAssessmentPress = async (assessment: Assessment) => {
    // فحص الاختبار النشط
    await checkActiveAttempt();
    
    if (activeAttempt) {
      setShowActiveModal(true);
      return;
    }
    
    router.push(`/assessments/${assessment.id}/instructions`);
  };

  const handleResumeAttempt = () => {
    if (activeAttempt && activeAttempt.id) {
      setShowActiveModal(false);
      const assessmentId = activeAttempt.assessment?.id;
      if (assessmentId) {
        router.push(`/assessments/${assessmentId}/take?attemptId=${activeAttempt.id}`);
      }
    }
  };

  const handleCancelAttempt = async () => {
    if (!activeAttempt || !activeAttempt.id) return;

    Alert.alert(
      'تأكيد الإلغاء',
      'هل أنت متأكد من رغبتك في إلغاء المحاولة الحالية؟ سيتم فقدان جميع الإجابات.',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم، إلغاء',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelingAttempt(true);
              await api.post(API_ENDPOINTS.ASSESSMENT_CANCEL(activeAttempt.id), {});
              setActiveAttempt(null);
              setShowActiveModal(false);
              Alert.alert('تم الإلغاء', 'تم إلغاء المحاولة السابقة بنجاح');
            } catch (error) {
              Alert.alert('خطأ', 'حدث خطأ في إلغاء المحاولة');
            } finally {
              setCancelingAttempt(false);
            }
          },
        },
      ]
    );
  };

  const handleLessonsPress = () => {
    router.push(`/(tabs)/tracks/${id}/lessons`);
  };

  // إذا كان يفحص الاشتراك، اعرض loading
  if (checkingSubscription || loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          {/* Header with Back Button */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/(tabs)/')}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Track Header Skeleton */}
            <View style={styles.trackHeader}>
              <SkeletonLoader width={80} height={80} borderRadius={40} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="70%" height={28} borderRadius={8} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="90%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="80%" height={13} borderRadius={6} />
            </View>

            {/* Stats Grid Skeleton */}
            <View style={styles.statsGrid}>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </View>

            {/* Level Review Card Skeleton */}
            <View style={[styles.levelReviewCard, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}>
              <View style={styles.levelReviewContent}>
                <SkeletonLoader width={56} height={56} borderRadius={16} />
                <View style={styles.levelReviewTextContainer}>
                  <SkeletonLoader width="80%" height={18} borderRadius={6} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width="100%" height={13} borderRadius={6} />
                </View>
                <SkeletonLoader width={24} height={24} borderRadius={12} />
              </View>
            </View>

            {/* Assessments Section Skeleton */}
            <View style={styles.assessmentsSectionHeader}>
              <View style={styles.assessmentsTitleRow}>
                <SkeletonLoader width={8} height={8} borderRadius={4} />
                <SkeletonLoader width={80} height={20} borderRadius={6} />
              </View>
              <SkeletonLoader width="100%" height={13} borderRadius={6} style={{ marginBottom: 12 }} />
              <View style={[styles.assessmentsSectionLine, { backgroundColor: `${colors.primary}30` }]} />
            </View>

            {/* Assessment Cards Skeleton */}
            <View style={styles.cardsGrid}>
              <SkeletonAssessmentCard />
              <SkeletonAssessmentCard />
              <SkeletonAssessmentCard />
              <SkeletonAssessmentCard />
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // إذا لم يكن مشترك، اعرض شاشة الاشتراك المطلوب
  if (!checkingSubscription && hasSubscription === false && track) {
    return (
      <SubscriptionRequiredScreen
        trackName={track.name}
        trackId={trackId}
        trackColor={colors.primary}
      />
    );
  }

  if (error || !track) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error || t('tracks.errorNotFound')}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchTrackData}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/')}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Track Header with Animation */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.trackHeader}
          >
            <Animated.Text 
              entering={ZoomIn.duration(800).delay(200).springify()}
              style={styles.trackEmoji}
            >
              {getTrackEmoji(trackId)}
            </Animated.Text>
            <Animated.Text 
              entering={FadeInUp.duration(600).delay(300)}
              style={styles.trackTitle}
            >
              {track.name}
            </Animated.Text>
            <Animated.Text 
              entering={FadeInUp.duration(600).delay(400)}
              style={styles.trackSubtitle}
            >
              {t('trackDashboard.welcome', { name: user?.full_name || t('home.guest') })}
            </Animated.Text>
            <Animated.Text 
              entering={FadeInUp.duration(600).delay(500)}
              style={styles.trackDescription}
            >
              {track.description || `اختبار كفايات اللغة ${track.code === 'STEP' ? 'الإنجليزية' : ''} ${track.code}`}
            </Animated.Text>
          </Animated.View>

          {/* Stats Grid with Staggered Animation */}
          <View style={styles.statsGrid}>
            <Animated.View 
              entering={FadeInDown.duration(500).delay(600).springify()}
              style={[styles.statCard, { borderColor: `${colors.primary}40` }]}
            >
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userPoints?.total_points || 0}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.totalPoints')}</Text>
              <Text style={styles.statIcon}>📊</Text>
            </Animated.View>
            
            <Animated.View 
              entering={FadeInDown.duration(500).delay(700).springify()}
              style={[styles.statCard, { borderColor: `${colors.primary}40` }]}
            >
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userPoints?.streak_days || 0}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.streakDays')}</Text>
              <Text style={styles.statIcon}>🔥</Text>
            </Animated.View>
            
            <Animated.View 
              entering={FadeInDown.duration(500).delay(800).springify()}
              style={[styles.statCard, { borderColor: `${colors.primary}40` }]}
            >
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {completedTests}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.completedTests')}</Text>
              <Text style={styles.statIcon}>🏆</Text>
            </Animated.View>
            
            <Animated.View 
              entering={FadeInDown.duration(500).delay(900).springify()}
              style={[styles.statCard, { borderColor: `${colors.primary}40` }]}
            >
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {lessonsCount}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.availableLessons')}</Text>
              <Text style={styles.statIcon}>📚</Text>
            </Animated.View>
          </View>

          {/* Level Review Card with Animation */}
          <Animated.View entering={FadeInUp.duration(600).delay(1000)}>
            <TouchableOpacity 
              style={[styles.levelReviewCard, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}
              onPress={() => {
                router.push(`/(tabs)/tracks/${id}/performance`);
              }}
              activeOpacity={0.8}
            >
            <View style={styles.levelReviewContent}>
              <View style={[styles.levelReviewIconContainer, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="insights" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.levelReviewTextContainer}>
                <Text style={styles.levelReviewTitle}>استعراض مستواي</Text>
                <Text style={styles.levelReviewSubtitle}>
                  عرض شامل لتقدمك وأدائك في جميع الاختبارات
                </Text>
              </View>
              <MaterialIcons 
                name="arrow-back" 
                size={24} 
                color={colors.primary}
              />
            </View>
            </TouchableOpacity>
          </Animated.View>

          {/* AI Chat & Multiplayer Cards - جنب بعض */}
          <Animated.View entering={FadeInUp.duration(600).delay(1100)} style={styles.toolsRow}>
            {/* AI Chat Card */}
            <TouchableOpacity 
              style={[styles.toolCard, { borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}
              onPress={() => {
                if (!isAuthenticated) {
                  Alert.alert(
                    'تسجيل الدخول مطلوب',
                    'الرجاء تسجيل الدخول لاستخدام المحادثة',
                    [{ text: 'حسناً' }]
                  );
                  return;
                }
                router.push(`/(tabs)/tracks/${id}/chat`);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.toolCardContent}>
                <View style={[styles.toolIconContainer, { backgroundColor: '#D4AF37' }]}>
                  <MaterialIcons name="smart-toy" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.toolTextContainer}>
                  <Text style={styles.toolTitle}>محادثة مع خبيرك</Text>
                  <Text style={styles.toolSubtitle}>
                    اسأل خبيرك الذكي عن أي شيء في مسارك التعليمي
                  </Text>
                </View>
                <MaterialIcons 
                  name="arrow-back" 
                  size={20} 
                  color="#D4AF37"
                />
              </View>
            </TouchableOpacity>

            {/* Multiplayer Quiz Card */}
            <TouchableOpacity 
              style={[styles.toolCard, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}
              onPress={() => {
                if (!isAuthenticated) {
                  Alert.alert(
                    'تسجيل الدخول مطلوب',
                    'الرجاء تسجيل الدخول لاستخدام الاختبار مع الصديق',
                    [{ text: 'حسناً' }]
                  );
                  return;
                }
                router.push({
                  pathname: '/multiplayer',
                  params: { trackId: id }
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.toolCardContent}>
                <View style={[styles.toolIconContainer, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="people" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.toolTextContainer}>
                  <Text style={styles.toolTitle}>اختبار مع صديق</Text>
                  <Text style={styles.toolSubtitle}>
                    تنافس مع صديقك في نفس الاختبار في الوقت الفعلي
                  </Text>
                </View>
                <MaterialIcons 
                  name="arrow-back" 
                  size={20} 
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Assessments Section Title */}
          <View style={styles.assessmentsSectionHeader}>
            <View style={[styles.assessmentsTitleRow, { flexDirection }]}>
              <View style={[styles.assessmentsTitleDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.assessmentsSectionTitle, { textAlign }]}>الاختبارات</Text>
            </View>
            <Text style={[styles.assessmentsSectionDescription, { textAlign }]}>
              اختبارات متنوعة تقيس قدراتك وتساعدك على تحسين أدائك بشكل مستمر
            </Text>
            <View style={[styles.assessmentsSectionLine, { backgroundColor: `${colors.primary}30` }]} />
          </View>

          {/* Assessment Cards */}
          <View style={styles.cardsGrid}>
            {/* Simulation Assessment */}
            {assessments.find(a => a.type === 'simulation') && (
              <TouchableOpacity
                style={[styles.assessmentCard, { borderColor: `${colors.primary}40` }]}
                onPress={() => handleAssessmentPress(assessments.find(a => a.type === 'simulation')!)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardEmoji}>
                  {getAssessmentInfo('simulation').icon}
                </Text>
                <Text style={styles.cardTitle}>
                  {getAssessmentInfo('simulation').title}
                </Text>
                <Text style={styles.cardDesc}>
                  {getAssessmentInfo('simulation').desc}
                </Text>
                <Text style={[styles.cardDuration, { color: colors.primary }]}>
                  {assessments.find(a => a.type === 'simulation')?.total_time_min} دقيقة
                </Text>
              </TouchableOpacity>
            )}

            {/* Quick Assessment */}
            {assessments.find(a => a.type === 'periodic') && (
              <TouchableOpacity
                style={[styles.assessmentCard, { borderColor: `${colors.primary}40` }]}
                onPress={() => handleAssessmentPress(assessments.find(a => a.type === 'periodic')!)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardEmoji}>
                  {getAssessmentInfo('periodic').icon}
                </Text>
                <Text style={styles.cardTitle}>
                  {getAssessmentInfo('periodic').title}
                </Text>
                <Text style={styles.cardDesc}>
                  {getAssessmentInfo('periodic').desc}
                </Text>
                <Text style={[styles.cardDuration, { color: colors.primary }]}>
                  {assessments.find(a => a.type === 'periodic')?.total_time_min} {t('trackDashboard.assessments.quick.duration')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Lessons Review */}
            <TouchableOpacity
              style={[styles.assessmentCard, { borderColor: `${colors.primary}40` }]}
              onPress={handleLessonsPress}
              activeOpacity={0.8}
            >
              <Text style={styles.cardEmoji}>📚</Text>
              <Text style={styles.cardTitle}>
                {t('trackDashboard.assessments.lessons.title')}
              </Text>
              <Text style={styles.cardDesc}>
                {t('trackDashboard.assessments.lessons.desc')}
              </Text>
              <Text style={[styles.cardDuration, { color: colors.primary }]}>
                {t('trackDashboard.assessments.lessons.cta')}
              </Text>
            </TouchableOpacity>

            {/* Medium Assessment */}
            {assessments.find(a => a.type === 'diagnostic') && (
              <TouchableOpacity
                style={[styles.assessmentCard, { borderColor: `${colors.primary}40` }]}
                onPress={() => handleAssessmentPress(assessments.find(a => a.type === 'diagnostic')!)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardEmoji}>
                  {getAssessmentInfo('diagnostic').icon}
                </Text>
                <Text style={styles.cardTitle}>
                  {getAssessmentInfo('diagnostic').title}
                </Text>
                <Text style={styles.cardDesc}>
                  {getAssessmentInfo('diagnostic').desc}
                </Text>
                <Text style={[styles.cardDuration, { color: colors.primary }]}>
                  {assessments.find(a => a.type === 'diagnostic')?.total_time_min} {t('trackDashboard.assessments.medium.duration')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Interactive - Coming Soon */}
            <View style={[styles.assessmentCard, styles.comingSoon, { borderColor: `${colors.primary}40` }]}>
              <Text style={styles.cardEmoji}>🎮</Text>
              <Text style={styles.cardTitle}>
                {t('trackDashboard.assessments.interactive.title')}
              </Text>
              <Text style={styles.cardDesc}>
                {t('trackDashboard.assessments.interactive.desc')}
              </Text>
              <Text style={[styles.cardDuration, { color: colors.primary }]}>
                {t('trackDashboard.assessments.interactive.status')}
              </Text>
            </View>

            {/* Smart Test - Coming Soon */}
            <View style={[styles.assessmentCard, styles.comingSoon, { borderColor: `${colors.primary}40` }]}>
              <Text style={styles.cardEmoji}>🧠</Text>
              <Text style={styles.cardTitle}>
                {t('trackDashboard.assessments.smart.title')}
              </Text>
              <Text style={styles.cardDesc}>
                {t('trackDashboard.assessments.smart.desc')}
              </Text>
              <Text style={[styles.cardDuration, { color: colors.primary }]}>
                {t('trackDashboard.assessments.smart.status')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Modal للاختبار النشط */}
        <ActiveAssessmentModal
          visible={showActiveModal}
          activeAttempt={activeAttempt ? {
            id: activeAttempt.id,
            assessment_name: activeAttempt.assessment?.name || 'اختبار',
            started_at: activeAttempt.started_at,
          } : null}
          onResume={handleResumeAttempt}
          onCancel={handleCancelAttempt}
          onClose={() => setShowActiveModal(false)}
          loading={cancelingAttempt}
        />
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
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  trackHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trackEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  trackSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  trackDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  levelReviewCard: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  levelReviewContent: {
    alignItems: 'center',
    gap: 16,
  },
  levelReviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  levelReviewTextContainer: {
    flex: 1,
    alignItems: 'center', // محاذاة للمنتصف
  },
  levelReviewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center', // محاذاة للمنتصف
  },
  levelReviewSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center', // محاذاة للمنتصف
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toolCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  toolCardContent: {
    alignItems: 'center',
    gap: 12,
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toolTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  toolTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  toolSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  assessmentsSectionHeader: {
    marginBottom: 20,
  },
  assessmentsTitleRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  assessmentsTitleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  assessmentsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'right', // RTL للعربية
  },
  assessmentsSectionDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    paddingHorizontal: 4,
    textAlign: 'right', // RTL للعربية
  },
  assessmentsSectionLine: {
    height: 2,
    borderRadius: 1,
    width: '100%',
    opacity: 0.6,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  assessmentCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  comingSoon: {
    opacity: 0.6,
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    width: '100%',
    textAlign: 'center', // محاذاة للمنتصف
  },
  cardDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginBottom: 12,
    width: '100%',
    textAlign: 'center', // محاذاة للمنتصف
  },
  cardDuration: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center', // محاذاة للمنتصف
  },
});
