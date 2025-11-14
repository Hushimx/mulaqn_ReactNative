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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTrack, getTrackColors } from '@/contexts/TrackContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { ActiveAssessmentModal } from '@/components/ActiveAssessmentModal';

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
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
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

  const trackId = parseInt(id);
  const colors = getTrackColors(trackId);

  useEffect(() => {
    if (id) {
      setCurrentTrack(trackId);
      fetchTrackData();
      checkActiveAttempt();
    }
  }, [id]);

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

      // جلب نقاط المستخدم
      try {
        const pointsResponse = await api.get<{ ok: boolean; data: UserPoints }>(
          API_ENDPOINTS.POINTS
        );
        if (pointsResponse && pointsResponse.ok && pointsResponse.data) {
          setUserPoints(pointsResponse.data);
        }
      } catch (err) {
        console.log('Points not available');
      }

      // جلب الاختبارات
      try {
        const assessmentsResponse = await api.get<{ ok: boolean; data: Assessment[] }>(
          API_ENDPOINTS.ASSESSMENTS(id)
        );
        if (assessmentsResponse && assessmentsResponse.ok && assessmentsResponse.data) {
          setAssessments(assessmentsResponse.data);
        }
      } catch (err) {
        console.log('Assessments not available yet');
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
      case 'placement':
        return {
          icon: '🎯',
          title: t('trackDashboard.assessments.placement.title'),
          desc: t('trackDashboard.assessments.placement.desc'),
        };
      case 'periodic':
        return {
          icon: '⚡',
          title: t('trackDashboard.assessments.quick.title'),
          desc: t('trackDashboard.assessments.quick.desc'),
        };
      case 'diagnostic':
        return {
          icon: '📝',
          title: t('trackDashboard.assessments.medium.title'),
          desc: t('trackDashboard.assessments.medium.desc'),
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
    // سننشئ صفحة lessons list لاحقاً
    router.push(`/tracks/${id}/lessons`);
  };

  if (loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
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
        {/* Header with Skip */}
        <View style={[styles.topHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push('/(tabs)/')}
          >
            <MaterialIcons name="arrow-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Track Header */}
          <View style={styles.trackHeader}>
            <Text style={styles.trackEmoji}>{getTrackEmoji(trackId)}</Text>
            <Text style={[styles.trackTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {track.name}
            </Text>
            <Text style={[styles.trackSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('trackDashboard.welcome', { name: user?.full_name || t('home.guest') })}
            </Text>
            <Text style={[styles.trackDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
              {track.description || `اختبار كفايات اللغة ${track.code === 'STEP' ? 'الإنجليزية' : ''} ${track.code}`}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userPoints?.total_points || 0}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.totalPoints')}</Text>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            
            <View style={[styles.statCard, { borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {userPoints?.streak_days || 0}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.streakDays')}</Text>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            
            <View style={[styles.statCard, { borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {completedTests}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.completedTests')}</Text>
              <Text style={styles.statIcon}>🏆</Text>
            </View>
            
            <View style={[styles.statCard, { borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {lessonsCount}
              </Text>
              <Text style={styles.statLabel}>{t('trackDashboard.stats.availableLessons')}</Text>
              <Text style={styles.statIcon}>📚</Text>
            </View>
          </View>

          {/* Assessment Cards */}
          <View style={styles.cardsGrid}>
            {/* Placement Assessment */}
            {assessments.find(a => a.type === 'placement') && (
              <TouchableOpacity
                style={[styles.assessmentCard, { borderColor: `${colors.primary}40` }]}
                onPress={() => handleAssessmentPress(assessments.find(a => a.type === 'placement')!)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardEmoji}>
                  {getAssessmentInfo('placement').icon}
                </Text>
                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {getAssessmentInfo('placement').title}
                </Text>
                <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {getAssessmentInfo('placement').desc}
                </Text>
                <Text style={[styles.cardDuration, { color: colors.primary }]}>
                  {assessments.find(a => a.type === 'placement')?.total_time_min} {t('trackDashboard.assessments.placement.duration')}
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
                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {getAssessmentInfo('periodic').title}
                </Text>
                <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
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
              <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('trackDashboard.assessments.lessons.title')}
              </Text>
              <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
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
                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {getAssessmentInfo('diagnostic').title}
                </Text>
                <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
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
              <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('trackDashboard.assessments.interactive.title')}
              </Text>
              <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('trackDashboard.assessments.interactive.desc')}
              </Text>
              <Text style={[styles.cardDuration, { color: colors.primary }]}>
                {t('trackDashboard.assessments.interactive.status')}
              </Text>
            </View>

            {/* Smart Test - Coming Soon */}
            <View style={[styles.assessmentCard, styles.comingSoon, { borderColor: `${colors.primary}40` }]}>
              <Text style={styles.cardEmoji}>🧠</Text>
              <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('trackDashboard.assessments.smart.title')}
              </Text>
              <Text style={[styles.cardDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  skipButton: {
    padding: 8,
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
  },
  cardDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginBottom: 12,
    width: '100%',
  },
  cardDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
});
