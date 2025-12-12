import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { ActiveAssessmentModal } from '@/components/ActiveAssessmentModal';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

interface Assessment {
  id: number;
  track_id: number;
  code: string;
  name: string;
  type: 'placement' | 'diagnostic' | 'periodic' | 'simulation';
  total_time_min: number;
  items_count?: number;
  total_questions?: number;
  description?: string;
  track?: {
    id: number;
    code: string;
    name: string;
  };
}

export default function AssessmentInstructionsScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [cancelingAttempt, setCancelingAttempt] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10); // Default: 10
  
  // Animations for question count selection
  const scaleAnims = useRef<Record<number, Animated.Value>>({
    10: new Animated.Value(1),
    30: new Animated.Value(1),
    60: new Animated.Value(1),
    100: new Animated.Value(1),
  }).current;

  useEffect(() => {
    fetchAssessment();
    checkActiveAttempt();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: Assessment }>(
        API_ENDPOINTS.ASSESSMENT(id!)
      );
      if (response && response.ok && response.data) {
        setAssessment(response.data);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  };

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
      // No active attempt
      setActiveAttempt(null);
    }
  };

  const handleStartAssessment = async () => {
    // فحص الاختبار النشط أولاً
    await checkActiveAttempt();
    
    if (activeAttempt) {
      setShowActiveModal(true);
      return;
    }

    try {
      // للاختبار المحاكي: إرسال question_count
      const requestBody: any = { assessment_id: assessment?.id };
      if (assessment?.type === 'simulation') {
        requestBody.question_count = selectedQuestionCount;
      }

      const response = await api.post<{ ok: boolean; data: { attempt_id: number } }>(
        API_ENDPOINTS.ASSESSMENT_START,
        requestBody
      );
      
      if (response && response.ok && response.data) {
        router.push(`/assessments/${id}/take?attemptId=${response.data.attempt_id}`);
      }
    } catch (error: any) {
      // التعامل مع خطأ ACTIVE_ATTEMPT_EXISTS
      if (error?.message?.includes('ACTIVE_ATTEMPT_EXISTS') || error?.message?.includes('لديك محاولة نشطة')) {
        await checkActiveAttempt();
        setShowActiveModal(true);
      } else {
        Alert.alert('خطأ', error?.message || 'حدث خطأ في بدء الاختبار');
      }
    }
  };

  const handleResumeAttempt = () => {
    if (activeAttempt && activeAttempt.id) {
      setShowActiveModal(false);
      const assessmentId = activeAttempt.assessment?.id || id;
      router.push(`/assessments/${assessmentId}/take?attemptId=${activeAttempt.id}`);
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

  if (loading || !assessment) {
    const trackColors = getTrackColors(1);
    return (
      <GradientBackground colors={trackColors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          {/* Header Skeleton */}
          <View style={styles.header}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width="50%" height={20} borderRadius={6} />
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Assessment Header Skeleton */}
            <View style={styles.assessmentHeader}>
              <SkeletonLoader width={80} height={80} borderRadius={16} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="80%" height={28} borderRadius={8} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="90%" height={16} borderRadius={6} />
            </View>

            {/* Stats Grid Skeleton */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 8 }} />
                <SkeletonLoader width={60} height={24} borderRadius={6} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={70} height={14} borderRadius={6} />
              </View>
              <View style={styles.statItem}>
                <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 8 }} />
                <SkeletonLoader width={60} height={24} borderRadius={6} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={70} height={14} borderRadius={6} />
              </View>
              <View style={styles.statItem}>
                <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 8 }} />
                <SkeletonLoader width={60} height={24} borderRadius={6} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={70} height={14} borderRadius={6} />
              </View>
            </View>

            {/* Instructions Section Skeleton */}
            <View style={styles.section}>
              <SkeletonLoader width="50%" height={20} borderRadius={6} style={{ marginBottom: 16 }} />
              <View style={styles.instructionsList}>
                {[1, 2, 3, 4, 5].map((item) => (
                  <View key={item} style={styles.instructionItem}>
                    <SkeletonLoader width={32} height={32} borderRadius={16} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                      <SkeletonLoader width="80%" height={14} borderRadius={6} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Button Skeleton */}
          <View style={styles.bottomContainer}>
            <SkeletonLoader width="100%" height={56} borderRadius={12} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const trackColors = getTrackColors(assessment.track_id);
  
  // بناء العنوان بشكل صحيح: نوع الاختبار + اسم المسار
  const getAssessmentDisplayName = () => {
    const typeName = assessment.type === 'periodic' ? 'اختبار سريع' : 
                     assessment.type === 'diagnostic' ? 'اختبار متوسط' : 
                     assessment.type === 'placement' ? 'اختبار محاكاة' : 'اختبار';
    const trackName = assessment.track?.name || 'قدرات';
    return `${typeName} - ${trackName}`;
  };

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>تعليمات الاختبار</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Robot Icon */}
          <View style={styles.robotContainer}>
            <Text style={styles.robotEmoji}>🤖</Text>
          </View>

          {/* Assessment Type and Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.assessmentType, { textAlign: 'center', color: trackColors.primary }]}>
              {getAssessmentDisplayName()}
            </Text>
          </View>

          {/* Info Cards in One Row */}
          <View style={styles.infoGrid}>
            <View style={[styles.infoCard, { borderColor: trackColors.primary, backgroundColor: `${trackColors.primary}15` }]}>
              <MaterialIcons name="help-outline" size={32} color={trackColors.primary} />
              <Text style={styles.infoValue}>{assessment.total_questions || assessment.items_count || '120'}</Text>
              <Text style={styles.infoLabel}>سؤال</Text>
            </View>

            <View style={[styles.infoCard, { borderColor: trackColors.primary }]}>
              <MaterialIcons name="access-time" size={32} color={trackColors.primary} />
              <Text style={styles.infoValue}>{assessment.total_time_min}</Text>
              <Text style={styles.infoLabel}>دقيقة</Text>
            </View>
          </View>

          {/* Question Count Selection - فقط للاختبار المحاكي */}
          {assessment.type === 'simulation' && (
            <View style={styles.questionCountSection}>
              <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>
                📊 اختر عدد الأسئلة
              </Text>
              <View style={styles.questionCountGrid}>
                {[10, 30, 60, 100].map((count) => {
                  const isSelected = selectedQuestionCount === count;
                  const scaleAnim = scaleAnims[count];
                  
                  return (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.questionCountOption,
                        isSelected && {
                          backgroundColor: `${trackColors.primary}25`,
                          borderColor: trackColors.primary,
                          borderWidth: 3,
                        },
                      ]}
                      onPress={() => {
                        // Animation on selection
                        Animated.sequence([
                          Animated.timing(scaleAnim, {
                            toValue: 1.15,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                          Animated.timing(scaleAnim, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                        setSelectedQuestionCount(count);
                      }}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.questionCountCircle,
                          isSelected && {
                            backgroundColor: trackColors.primary,
                          },
                          {
                            transform: [{ scale: scaleAnim }],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.questionCountNumber,
                            isSelected && { color: '#FFFFFF' },
                          ]}
                        >
                          {count}
                        </Text>
                      </Animated.View>
                      <Text
                        style={[
                          styles.questionCountLabel,
                          isSelected && { color: trackColors.primary, fontWeight: '700' },
                        ]}
                      >
                        {count} سؤال
                      </Text>
                      {isSelected && (
                        <View style={[styles.selectedIndicator, { backgroundColor: trackColors.primary }]}>
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Instructions Section */}
          <View style={styles.instructionsSection}>
            <Text style={[styles.sectionTitle]}>
              📋 تعليمات هامة
            </Text>

            <View style={styles.instructionsList}>
              <View style={[styles.instructionItem]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>1</Text>
                </View>
                <Text style={[styles.instructionText]}>
                  المدة المحددة للاختبار هي {assessment.total_time_min} دقيقة
                </Text>
              </View>

              <View style={[styles.instructionItem]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>2</Text>
                </View>
                <Text style={[styles.instructionText]}>
                  يجب الإجابة على جميع الأسئلة
                </Text>
              </View>

              <View style={[styles.instructionItem]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>3</Text>
                </View>
                <Text style={[styles.instructionText]}>
                  يمكنك وضع علامة على الأسئلة للعودة إليها لاحقاً
                </Text>
              </View>

              <View style={[styles.instructionItem]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>4</Text>
                </View>
                <Text style={[styles.instructionText]}>
                  يمكنك حفظ الأسئلة المهمة في مكتبتك الشخصية
                </Text>
              </View>

              <View style={[styles.instructionItem]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>5</Text>
                </View>
                <Text style={[styles.instructionText]}>
                  الخروج من الاختبار سيؤدي إلى إلغاء المحاولة
                </Text>
              </View>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: trackColors.primary }]}
            onPress={handleStartAssessment}
            activeOpacity={0.8}
          >
            <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>ابدأ الاختبار</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  robotContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  robotEmoji: {
    fontSize: 120,
  },
  titleContainer: {
    marginBottom: 20,
  },
  assessmentType: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  assessmentTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    minHeight: 120,
    justifyContent: 'center',
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  instructionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 12,
  },
  instructionBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
  questionCountSection: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionCountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  questionCountOption: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCountCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionCountNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  questionCountLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
});

