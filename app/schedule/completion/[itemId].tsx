import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GradientButton } from '@/components/ui/GradientButton';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInDown, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';

interface ScheduleItem {
  id: number;
  lesson_id: number;
  lesson_title: string;
  lesson_slug?: string;
  scheduled_date: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  track_id?: number;
  verification_attempts?: number;
  skip_reason?: string;
  skip_reason_type?: string;
  failure_reason?: string;
}

const SKIP_REASONS = [
  { value: 'time_pressure', label: 'ضغط وقت', icon: 'schedule', color: '#F59E0B' },
  { value: 'not_understood', label: 'ما فهمت', icon: 'help-outline', color: '#3B82F6' },
  { value: 'laziness', label: 'كسل', icon: 'sentiment-dissatisfied', color: '#8B5CF6' },
  { value: 'circumstances', label: 'ظروف', icon: 'event-busy', color: '#EF4444' },
  { value: 'other', label: 'أخرى', icon: 'more-horiz', color: '#6B7280' },
];

export default function LessonCompletionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const itemId = parseInt(params.itemId as string);
  const trackId = params.trackId ? parseInt(params.trackId as string) : null;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [item, setItem] = useState<ScheduleItem | null>(null);
  const [action, setAction] = useState<'complete' | 'skip' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reasonText, setReasonText] = useState('');

  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  const fetchItemData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: ScheduleItem }>(
        API_ENDPOINTS.SCHEDULE_ITEM_GET(itemId)
      );
      
      if (response && response.ok && response.data) {
        const itemData = response.data;
        setItem(itemData);
      }
    } catch (err: any) {
      console.error('Error fetching item:', err);
      Alert.alert('خطأ', err.message || 'فشل تحميل بيانات الدرس');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchItemData();
  }, [fetchItemData]);

  // إعادة تحميل البيانات عند العودة للصفحة (بعد verify)
  useFocusEffect(
    useCallback(() => {
      fetchItemData();
    }, [fetchItemData])
  );

  const handleComplete = async () => {
    // منع إعادة الاختبار إذا كان الدرس مكتمل
    if (item?.status === 'completed') {
      Alert.alert('تنبيه', 'تم إتمام هذا الدرس مسبقاً');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.SCHEDULE_ITEM_COMPLETE(itemId),
        {
          verification_source: 'bank',
          verification_data: {},
        }
      );

      if (response && response.ok && response.data) {
        // تمرير السؤال إلى صفحة التحقق
        const questionData = response.data.question;
        router.push({
          pathname: '/schedule/verify/[itemId]',
          params: { 
            itemId: itemId.toString(),
            trackId: trackId?.toString() || '1',
            questionData: questionData ? JSON.stringify(questionData) : undefined,
          },
        });
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ أثناء إتمام الدرس');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!selectedReason) {
      Alert.alert('تنبيه', 'يرجى اختيار سبب التأجيل');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.SCHEDULE_ITEM_SKIP(itemId),
        {
          reason_type: selectedReason,
          reason_text: reasonText || null,
        }
      );

      if (response && response.ok) {
        Alert.alert('نجح', 'تم تأجيل الدرس بنجاح', [
          { text: 'حسناً', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ أثناء تأجيل الدرس');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLesson = () => {
    if (item?.lesson_id) {
      router.push({
        pathname: '/lessons/[id]',
        params: { id: item.lesson_id.toString() },
      });
    }
  };

  const handleRetryLesson = async () => {
    // إعادة تعيين status إلى pending للسماح بالمحاولة مرة أخرى
    try {
      setSubmitting(true);
      // يمكن إضافة endpoint لإعادة تعيين status إذا لزم الأمر
      // حالياً سنوجهه للدرس مباشرة
      handleGoToLesson();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={trackColor} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // التحقق من التاريخ
  const isFromYesterday = item?.scheduled_date ? 
    new Date(item.scheduled_date).toDateString() === new Date(Date.now() - 86400000).toDateString() : false;
  const isFromPast = item?.scheduled_date ? 
    new Date(item.scheduled_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

  // حالة الفشل - عرض صفحة فشل
  if (item?.status === 'failed') {
    const isAutoFailed = item?.failure_reason?.includes('عدم تجاوب مع الخطة التعليمية');
    
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { flexDirection }]}>
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
            <Text style={[styles.headerTitle, { textAlign }]}>
              {isFromPast ? 'درس من الماضي' : 'حظ أوفر'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={ZoomIn.duration(500)}
              style={[styles.failedCard, { borderColor: `${trackColor}50` }]}
            >
              <View style={[styles.failedIconContainer, { backgroundColor: `${trackColor}25` }]}>
                <MaterialIcons name="close-circle" size={64} color="#EF4444" />
              </View>
              <Text style={[styles.failedTitle, { textAlign, color: '#FFFFFF' }]}>
                {isAutoFailed && isFromPast 
                  ? 'تم عدم اجتيازك للدرس' 
                  : 'لم تنجح هذه المرة'}
              </Text>
              <Text style={[styles.failedSubtitle, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                {item?.lesson_title || 'الدرس'}
              </Text>
              {isFromPast && (
                <Text style={[styles.dateText, { textAlign, color: 'rgba(255,255,255,0.6)' }]}>
                  {new Date(item.scheduled_date).toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              )}
            </Animated.View>

            {isAutoFailed && isFromPast ? (
              <Animated.View 
                entering={FadeInUp.duration(500).delay(200)}
                style={styles.explanationContainer}
              >
                <Text style={[styles.explanationTitle, { textAlign, color: '#FFFFFF' }]}>
                  ⚠️ تنبيه مهم
                </Text>
                <Text style={[styles.explanationText, { textAlign, color: 'rgba(255,255,255,0.9)' }]}>
                  تم عدم اجتيازك لعدم تجاوبك معنا بالخطة التعليمية. هذا الدرس كان مبرمجاً ليوم محدد ولم تقم بإتمامه في الوقت المحدد.
                </Text>
                <Text style={[styles.explanationText, { textAlign, color: 'rgba(255,255,255,0.9)', marginTop: 12 }]}>
                  يمكنك مراجعة الدرس للتعلم، لكن لا يمكنك إعادة اختباره لأنه محسوب بيوم محدد.
                </Text>
              </Animated.View>
            ) : (
              <Animated.View 
                entering={FadeInUp.duration(500).delay(200)}
                style={styles.tipsContainer}
              >
                <Text style={[styles.tipsTitle, { textAlign, color: '#FFFFFF' }]}>
                  💡 نصائح للنجاح
                </Text>
                <View style={styles.tipsList}>
                  <Animated.View entering={FadeInUp.duration(400).delay(300)}>
                    <View style={[styles.tipItem, { flexDirection }]}>
                      <MaterialIcons name="book" size={20} color={trackColor} />
                      <Text style={[styles.tipText, { textAlign, color: 'rgba(255,255,255,0.9)' }]}>
                        راجع الدرس بعناية قبل المحاولة مرة أخرى
                      </Text>
                    </View>
                  </Animated.View>
                  <Animated.View entering={FadeInUp.duration(400).delay(400)}>
                    <View style={[styles.tipItem, { flexDirection }]}>
                      <MaterialIcons name="lightbulb" size={20} color={trackColor} />
                      <Text style={[styles.tipText, { textAlign, color: 'rgba(255,255,255,0.9)' }]}>
                        ركز على النقاط التي واجهت صعوبة فيها
                      </Text>
                    </View>
                  </Animated.View>
                </View>
              </Animated.View>
            )}

            <Animated.View 
              entering={FadeInUp.duration(500).delay(700)}
              style={styles.failedActions}
            >
              <GradientButton
                title="مراجعة الدرس"
                onPress={handleGoToLesson}
                loading={submitting}
                style={styles.failedButton}
                colors={[trackColor, `${trackColor}CC`]}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // حالة التأجيل - عرض معلومات الدرس المؤجل
  if (item?.status === 'skipped') {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { flexDirection }]}>
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
            <Text style={[styles.headerTitle, { textAlign }]}>درس مؤجل</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={ZoomIn.duration(500)}
              style={[styles.lessonCard, { borderColor: `${trackColor}50` }]}
            >
              <View style={[styles.lessonIconContainer, { backgroundColor: `${trackColor}25` }]}>
                <MaterialIcons name="schedule" size={56} color={trackColor} />
              </View>
              <Text style={[styles.lessonTitle, { textAlign, color: '#FFFFFF' }]}>
                {item?.lesson_title || 'درس'}
              </Text>
              <View style={[styles.skippedBadge, { backgroundColor: `${trackColor}30` }]}>
                <MaterialIcons name="schedule" size={16} color={trackColor} />
                <Text style={[styles.skippedBadgeText, { color: trackColor }]}>
                  مؤجل
                </Text>
              </View>
              {isFromPast && (
                <Text style={[styles.dateText, { textAlign, color: 'rgba(255,255,255,0.6)', marginTop: 8 }]}>
                  {new Date(item.scheduled_date).toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              )}
            </Animated.View>

            {item?.skip_reason && (
              <Animated.View 
                entering={FadeInUp.duration(500).delay(200)}
                style={styles.explanationContainer}
              >
                <Text style={[styles.explanationTitle, { textAlign, color: '#FFFFFF' }]}>
                  سبب التأجيل
                </Text>
                <Text style={[styles.explanationText, { textAlign, color: 'rgba(255,255,255,0.9)' }]}>
                  {item.skip_reason_type === 'time_pressure' && 'ضغط وقت'}
                  {item.skip_reason_type === 'not_understood' && 'ما فهمت'}
                  {item.skip_reason_type === 'laziness' && 'كسل'}
                  {item.skip_reason_type === 'circumstances' && 'ظروف'}
                  {item.skip_reason_type === 'other' && 'أخرى'}
                  {item.skip_reason && `: ${item.skip_reason}`}
                </Text>
              </Animated.View>
            )}

            {isFromPast && (
              <Animated.View 
                entering={FadeInUp.duration(500).delay(300)}
                style={styles.explanationContainer}
              >
                <Text style={[styles.explanationTitle, { textAlign, color: '#FFFFFF' }]}>
                  ⚠️ تنبيه
                </Text>
                <Text style={[styles.explanationText, { textAlign, color: 'rgba(255,255,255,0.9)' }]}>
                  هذا الدرس كان مبرمجاً ليوم محدد. يمكنك مراجعة الدرس للتعلم، لكن لا يمكنك إعادة اختباره لأنه محسوب بيوم محدد.
                </Text>
              </Animated.View>
            )}

            <Animated.View 
              entering={FadeInUp.duration(500).delay(400)}
              style={styles.skippedActions}
            >
              <GradientButton
                title="مراجعة الدرس"
                onPress={handleGoToLesson}
                style={styles.skippedButton}
                colors={[trackColor, `${trackColor}CC`]}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // حالة مكتمل - عرض رسالة النجاح
  if (item?.status === 'completed') {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { flexDirection }]}>
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
            <Text style={[styles.headerTitle, { textAlign }]}>درس مكتمل</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={ZoomIn.duration(500)}
              style={[styles.completedCard, { borderColor: `${trackColor}50` }]}
            >
              <View style={[styles.completedIconContainer, { backgroundColor: `${trackColor}25` }]}>
                <MaterialIcons name="check-circle" size={64} color={trackColor} />
              </View>
              <Text style={[styles.completedTitle, { textAlign, color: '#FFFFFF' }]}>
                {isFromYesterday 
                  ? 'ذا درس أمس وانت اجتزته الحمدلله' 
                  : '✅ تم إتمام الدرس بنجاح'}
              </Text>
              <Text style={[styles.completedSubtitle, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                {item?.lesson_title || 'الدرس'}
              </Text>
              {isFromPast && (
                <Text style={[styles.dateText, { textAlign, color: 'rgba(255,255,255,0.6)', marginTop: 8 }]}>
                  {new Date(item.scheduled_date).toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              )}
            </Animated.View>

            <Animated.View 
              entering={FadeInUp.duration(500).delay(200)}
              style={styles.completedActions}
            >
              <GradientButton
                title="مراجعة الدرس"
                onPress={handleGoToLesson}
                style={styles.completedButton}
                colors={[trackColor, `${trackColor}CC`]}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // إذا كان pending من الماضي، يجب أن يكون failed (يتم تلقائياً)
  // لكن إذا وصلنا هنا، نعرض رسالة
  if (item?.status === 'pending' && isFromPast) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { flexDirection }]}>
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
            <Text style={[styles.headerTitle, { textAlign }]}>درس من الماضي</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={ZoomIn.duration(500)}
              style={[styles.failedCard, { borderColor: `${trackColor}50` }]}
            >
              <View style={[styles.failedIconContainer, { backgroundColor: `${trackColor}25` }]}>
                <MaterialIcons name="info" size={64} color={trackColor} />
              </View>
              <Text style={[styles.failedTitle, { textAlign, color: '#FFFFFF' }]}>
                هذا الدرس من الماضي
              </Text>
              <Text style={[styles.failedSubtitle, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                {item?.lesson_title || 'الدرس'}
              </Text>
            </Animated.View>

            <Animated.View 
              entering={FadeInUp.duration(500).delay(200)}
              style={styles.explanationContainer}
            >
              <Text style={[styles.explanationText, { textAlign, color: 'rgba(255,255,255,0.9)' }]}>
                هذا الدرس كان مبرمجاً ليوم محدد. يمكنك مراجعة الدرس للتعلم، لكن لا يمكنك إتمامه الآن.
              </Text>
            </Animated.View>

            <Animated.View 
              entering={FadeInUp.duration(500).delay(300)}
              style={styles.failedActions}
            >
              <GradientButton
                title="مراجعة الدرس"
                onPress={handleGoToLesson}
                style={styles.failedButton}
                colors={[trackColor, `${trackColor}CC`]}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // الحالة الافتراضية - pending: عرض خيارات إتمام/تأجيل (فقط للدروس من اليوم)
  return (
    <GradientBackground colors={colors.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { flexDirection }]}>
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
          <Text style={[styles.headerTitle, { textAlign }]}>إتمام الدرس</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={ZoomIn.duration(500)}
            style={[styles.lessonCard, { borderColor: `${trackColor}50` }]}
          >
            <View style={[styles.lessonIconContainer, { backgroundColor: `${trackColor}25` }]}>
              <MaterialIcons name="menu-book" size={56} color={trackColor} />
            </View>
            <Text style={[styles.lessonTitle, { textAlign, color: '#FFFFFF' }]}>
              {item?.lesson_title || 'درس'}
            </Text>
          </Animated.View>

          {!action ? (
            <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.actionsContainer}>
              <Text style={[styles.actionPrompt, { textAlign, color: '#FFFFFF' }]}>
                ماذا تريد أن تفعل؟
              </Text>
              
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: `${trackColor}60`, backgroundColor: `${trackColor}15` }]}
                onPress={() => setAction('complete')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: trackColor }]}>
                  <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { textAlign, color: '#FFFFFF' }]}>
                    إتمام الدرس
                  </Text>
                  <Text style={[styles.actionDescription, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                    سأقوم بحل سؤال تحقق لإتمام الدرس
                  </Text>
                </View>
                <MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={24} color={trackColor} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }]}
                onPress={() => setAction('skip')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <MaterialIcons name="schedule" size={32} color="rgba(255,255,255,0.9)" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { textAlign, color: '#FFFFFF' }]}>
                    تأجيل الدرس
                  </Text>
                  <Text style={[styles.actionDescription, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                    سأؤجل هذا الدرس لوقت آخر
                  </Text>
                </View>
                <MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </Animated.View>
          ) : action === 'complete' ? (
            <Animated.View 
              entering={SlideInDown.duration(600).springify().damping(15)}
              style={[styles.completeContainer, { borderColor: `${trackColor}50` }]}
            >
              <Animated.View 
                entering={ZoomIn.duration(500).delay(200)}
                style={[styles.completeIconContainer, { backgroundColor: `${trackColor}25` }]}
              >
                <MaterialIcons name="quiz" size={48} color={trackColor} />
              </Animated.View>
              <Animated.View entering={FadeInUp.duration(500).delay(300)}>
                <Text style={[styles.questionText, { textAlign, color: '#FFFFFF' }]}>
                  مستعد نجرب نعطيك سؤال؟
                </Text>
                <Text style={[styles.questionSubtext, { textAlign, color: 'rgba(255,255,255,0.7)' }]}>
                  سؤال بسيط للتأكد من فهمك للدرس
                </Text>
              </Animated.View>
              <Animated.View 
                entering={FadeInUp.duration(500).delay(400)}
                style={styles.completeActions}
              >
                <GradientButton
                  title="نعم، مستعد"
                  onPress={handleComplete}
                  loading={submitting}
                  style={styles.completeButton}
                  colors={[trackColor, `${trackColor}CC`]}
                />
                <TouchableOpacity
                  onPress={() => setAction(null)}
                  style={[styles.cancelButton, { borderColor: `${trackColor}40` }]}
                >
                  <Text style={[styles.cancelText, { color: '#FFFFFF' }]}>إلغاء</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View 
              entering={SlideInDown.duration(600).springify().damping(15)}
              style={[styles.skipContainer, { borderColor: `${trackColor}30` }]}
            >
              <Animated.View 
                entering={FadeInDown.duration(400).delay(200)}
                style={[styles.skipHeader, { flexDirection }]}
              >
                <View style={[styles.skipIconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <MaterialIcons name="schedule" size={24} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={[styles.skipTitle, { textAlign, color: '#FFFFFF' }]}>
                  اختر سبب التأجيل
                </Text>
              </Animated.View>
              
              <View style={styles.reasonsList}>
                {SKIP_REASONS.map((reason, index) => (
                  <Animated.View
                    key={reason.value}
                    entering={FadeInDown.duration(400).delay(index * 100).springify()}
                  >
                    <TouchableOpacity
                      style={[
                        styles.reasonOption,
                        selectedReason === reason.value && { 
                          backgroundColor: `${trackColor}25`,
                          borderColor: trackColor,
                          borderWidth: 2,
                        },
                        { flexDirection }
                      ]}
                      onPress={() => setSelectedReason(reason.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.reasonIconContainer,
                        { backgroundColor: `${reason.color}20` },
                        selectedReason === reason.value && { backgroundColor: `${trackColor}30` }
                      ]}>
                        <MaterialIcons
                          name={reason.icon as any}
                          size={20}
                          color={selectedReason === reason.value ? trackColor : reason.color}
                        />
                      </View>
                      <Text style={[styles.reasonLabel, { textAlign, color: '#FFFFFF' }]}>
                        {reason.label}
                      </Text>
                      <MaterialIcons
                        name={selectedReason === reason.value ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={20}
                        color={selectedReason === reason.value ? trackColor : 'rgba(255,255,255,0.4)'}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              <Animated.View entering={FadeInUp.duration(500).delay(600)}>
                <Text style={[styles.reasonTextLabel, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                  اكتب السبب بالتفصيل (اختياري)
                </Text>
                <TextInput
                  style={[styles.reasonTextInput, { textAlign, borderColor: `${trackColor}30`, color: '#FFFFFF' }]}
                  placeholder="اكتب السبب بالتفصيل..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={reasonText}
                  onChangeText={setReasonText}
                  multiline
                  numberOfLines={4}
                />
              </Animated.View>

              <Animated.View 
                entering={FadeInUp.duration(500).delay(700)}
                style={styles.skipActions}
              >
                <GradientButton
                  title="حفظ التأجيل"
                  onPress={handleSkip}
                  loading={submitting}
                  style={styles.skipButton}
                  colors={[trackColor, `${trackColor}CC`]}
                />
                <TouchableOpacity
                  onPress={() => {
                    setAction(null);
                    setSelectedReason('');
                    setReasonText('');
                  }}
                  style={[styles.cancelButton, { borderColor: `${trackColor}40` }]}
                >
                  <Text style={[styles.cancelText, { color: '#FFFFFF' }]}>إلغاء</Text>
                </TouchableOpacity>
              </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  lessonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
  },
  lessonIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  actionsContainer: {
    gap: 20,
  },
  actionPrompt: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    gap: 16,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  completeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
  },
  completeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 32,
  },
  questionSubtext: {
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 22,
  },
  completeActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  completeButton: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 28,
    borderWidth: 2,
  },
  skipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  skipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  reasonsList: {
    marginBottom: 24,
    gap: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 14,
  },
  reasonIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonLabel: {
    fontSize: 17,
    flex: 1,
    fontWeight: '600',
  },
  reasonTextLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  reasonTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    padding: 18,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1.5,
    lineHeight: 22,
  },
  skipActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  failedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
  },
  failedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  failedTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 36,
  },
  failedSubtitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  tipsList: {
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  failedActions: {
    marginTop: 8,
  },
  failedButton: {
    width: '100%',
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  skippedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
  },
  completedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 36,
  },
  completedSubtitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  completedActions: {
    marginTop: 8,
  },
  completedButton: {
    width: '100%',
  },
  explanationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 24,
  },
  dateText: {
    fontSize: 14,
    marginTop: 8,
  },
  skippedActions: {
    marginTop: 8,
  },
  skippedButton: {
    width: '100%',
  },
});
