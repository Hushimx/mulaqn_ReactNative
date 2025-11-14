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
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { ActiveAssessmentModal } from '@/components/ActiveAssessmentModal';

interface Assessment {
  id: number;
  track_id: number;
  code: string;
  name: string;
  type: 'placement' | 'diagnostic' | 'periodic';
  total_time_min: number;
  items_count?: number;
  description?: string;
}

export default function AssessmentInstructionsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [cancelingAttempt, setCancelingAttempt] = useState(false);

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
      const response = await api.post<{ ok: boolean; data: { attempt_id: number } }>(
        API_ENDPOINTS.ASSESSMENT_START,
        { assessment_id: assessment?.id }
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
    return (
      <GradientBackground colors={getTrackColors(1).gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const trackColors = getTrackColors(assessment.track_id);

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تعليمات الاختبار</Text>
          <View style={styles.backButton} />
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

          {/* Assessment Title */}
          <Text style={[styles.assessmentTitle, { textAlign: 'center' }]}>
            {assessment.name}
          </Text>

          {/* Info Cards */}
          <View style={styles.infoGrid}>
            <View style={[styles.infoCard, { borderColor: trackColors.primary }]}>
              <MaterialIcons name="access-time" size={32} color={trackColors.primary} />
              <Text style={styles.infoValue}>{assessment.total_time_min}</Text>
              <Text style={styles.infoLabel}>دقيقة</Text>
            </View>

            <View style={[styles.infoCard, { borderColor: trackColors.primary }]}>
              <MaterialIcons name="help-outline" size={32} color={trackColors.primary} />
              <Text style={styles.infoValue}>{assessment.items_count || '120'}</Text>
              <Text style={styles.infoLabel}>سؤال</Text>
            </View>

            <View style={[styles.infoCard, { borderColor: trackColors.primary }]}>
              <MaterialIcons name="quiz" size={32} color={trackColors.primary} />
              <Text style={styles.infoValue}>اختيارات</Text>
              <Text style={styles.infoLabel}>متعددة</Text>
            </View>
          </View>

          {/* Instructions Section */}
          <View style={styles.instructionsSection}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              📋 تعليمات هامة
            </Text>

            <View style={styles.instructionsList}>
              <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>1</Text>
                </View>
                <Text style={[styles.instructionText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  المدة المحددة للاختبار هي {assessment.total_time_min} دقيقة
                </Text>
              </View>

              <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>2</Text>
                </View>
                <Text style={[styles.instructionText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  يجب الإجابة على جميع الأسئلة
                </Text>
              </View>

              <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>3</Text>
                </View>
                <Text style={[styles.instructionText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  يمكنك وضع علامة على الأسئلة للعودة إليها لاحقاً
                </Text>
              </View>

              <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>4</Text>
                </View>
                <Text style={[styles.instructionText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  يمكنك حفظ الأسئلة المهمة في مكتبتك الشخصية
                </Text>
              </View>

              <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.instructionBullet, { backgroundColor: trackColors.primary }]}>
                  <Text style={styles.bulletNumber}>5</Text>
                </View>
                <Text style={[styles.instructionText, { textAlign: isRTL ? 'right' : 'left' }]}>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
  assessmentTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
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
});

