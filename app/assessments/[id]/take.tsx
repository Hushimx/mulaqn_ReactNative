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
  Modal,
  TextInput,
  Alert,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

interface QuestionOption {
  id: number;
  label?: string;
  option_label?: string;
  content: string;
  option_order?: number;
}

interface Question {
  id: number;
  stem: string;
  media_url?: string;
  has_image?: boolean;
  image_path?: string;
  image_url?: string;
  hint?: string;
  points: string;
  options: QuestionOption[];
}

interface AssessmentItem {
  id: number;
  question_id: number;
  question: Question;
  sort_order: number;
}

interface AssessmentAttempt {
  id: number;
  assessment_id: number;
  user_id: number;
  status: string;
  started_at: string;
  time_remaining_sec?: number;
  assessment: {
    id: number;
    name: string;
    track_id?: number;
    total_time_min: number;
    items?: AssessmentItem[];
    total_questions?: number;
  };
  questions?: Question[];
  responses?: Array<{
    question_id: number;
    selected_option_id: number;
    is_flagged: boolean;
  }>;
}

export default function TakeAssessmentScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const insets = useSafeAreaInsets();
  
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSaveModal, setSaveModal] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showNavigationBar, setShowNavigationBar] = useState(false);
  const [feedbackData, setFeedbackData] = useState<Record<number, { is_correct: boolean }>>({});
  const [assessmentType, setAssessmentType] = useState<string>('simulation');
  const [pendingFeedback, setPendingFeedback] = useState<Set<number>>(new Set());

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerPulseAnim = useRef(new Animated.Value(1)).current;
  const nextButtonPulse = useRef(new Animated.Value(1)).current;
  const previousIndexRef = useRef(0);
  const screenWidth = Dimensions.get('window').width;
  
  // Sound refs
  const successSound = useRef<Audio.Sound | null>(null);
  const errorSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    fetchAttempt();
    loadSounds();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      unloadSounds();
    };
  }, [attemptId]);
  
  // تحميل الأصوات
  const loadSounds = async () => {
    try {
      const { sound: success } = await Audio.Sound.createAsync(
        require('@/assets/sounds/success.mp3')
      );
      successSound.current = success;
      
      const { sound: error } = await Audio.Sound.createAsync(
        require('@/assets/sounds/error.mp3')
      );
      errorSound.current = error;
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };
  
  // تفريغ الأصوات من الذاكرة
  const unloadSounds = async () => {
    try {
      if (successSound.current) {
        await successSound.current.unloadAsync();
      }
      if (errorSound.current) {
        await errorSound.current.unloadAsync();
      }
    } catch (error) {
      console.error('Error unloading sounds:', error);
    }
  };
  
  // تشغيل الصوت
  const playSound = async (isCorrect: boolean) => {
    try {
      const sound = isCorrect ? successSound.current : errorSound.current;
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining]);

  // Timer pulse animation عند اقتراب انتهاء الوقت (أقل من 5 دقائق)
  useEffect(() => {
    if (timeRemaining <= 300 && timeRemaining > 0) { // 5 minutes or less
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(timerPulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      timerPulseAnim.setValue(1);
    }
  }, [timeRemaining]);

  // Next button pulse animation في diagnostic/periodic mode عند تفعيله
  useEffect(() => {
    if (!attempt || (assessmentType !== 'diagnostic' && assessmentType !== 'periodic')) return;
    
    const currentQuestionId = attempt.assessment.items?.[currentQuestionIndex]?.question.id;
    if (currentQuestionId && selectedOptions[currentQuestionId]) {
      // الزر أصبح متاحاً - عمل pulse واحد للفت الانتباه
      Animated.sequence([
        Animated.timing(nextButtonPulse, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(nextButtonPulse, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedOptions, currentQuestionIndex, assessmentType]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      
      // جلب المحاولة النشطة
      const response = await api.get<{ ok: boolean; data: { active_attempt: any } }>(
        API_ENDPOINTS.ASSESSMENT_ACTIVE
      );
      
      if (response && response.ok && response.data && response.data.active_attempt) {
        const attemptData = response.data.active_attempt;
        
        // تحويل البيانات إلى الشكل المتوقع
        const transformedAttempt: AssessmentAttempt = {
          id: attemptData.id,
          assessment_id: attemptData.assessment?.id || parseInt(id!),
          user_id: attemptData.user_id || 0,
          status: 'in_progress',
          started_at: attemptData.started_at,
          time_remaining_sec: attemptData.time_remaining_sec,
          assessment: {
            id: attemptData.assessment?.id || parseInt(id!),
            name: attemptData.assessment?.name || 'اختبار',
            track_id: attemptData.assessment?.track?.id || attemptData.assessment?.track_id || 1,
            total_time_min: attemptData.assessment?.total_time_min || 15,
            items: attemptData.questions ? attemptData.questions.map((q: any, index: number) => ({
              id: index + 1,
              question_id: q.id,
              question: q,
              sort_order: index + 1,
            })) : [],
          },
          responses: attemptData.saved_answers ? Object.entries(attemptData.saved_answers).map(([qId, data]: [string, any]) => ({
            question_id: parseInt(qId),
            selected_option_id: data.selected_option_id,
            is_flagged: data.flagged || false,
          })) : [],
        };
        
        setAttempt(transformedAttempt);
        setTimeRemaining(attemptData.time_remaining_sec || transformedAttempt.assessment.total_time_min * 60);
        
        // حفظ نوع الاختبار - مع fallback من الاسم
        let type = attemptData.assessment?.type;
        
        // إذا ما كان موجود، نحدد من الاسم
        if (!type) {
          const assessmentName = (attemptData.assessment?.name || '').toLowerCase();
          if (assessmentName.includes('سريع') || assessmentName.includes('تشخيصي') || assessmentName.includes('diagnostic')) {
            type = 'diagnostic';
          } else {
            type = 'simulation';
          }
        }
        
        console.log('Setting assessment type:', type, 'from API or name:', attemptData.assessment?.name);
        setAssessmentType(type);
        
        // تحميل الإجابات المحفوظة
        if (attemptData.saved_answers) {
          const savedAnswers: Record<number, number> = {};
          const flagged = new Set<number>();
          let lastAnsweredIndex = -1;
          
          Object.entries(attemptData.saved_answers).forEach(([qId, data]: [string, any]) => {
            const questionId = parseInt(qId);
            savedAnswers[questionId] = data.selected_option_id;
            if (data.flagged) {
              flagged.add(questionId);
            }
            
            // إيجاد آخر سؤال تم الإجابة عليه
            const questionIndex = transformedAttempt.assessment.items?.findIndex(
              item => item.question.id === questionId
            );
            if (questionIndex !== undefined && questionIndex > lastAnsweredIndex) {
              lastAnsweredIndex = questionIndex;
            }
          });
          
          setSelectedOptions(savedAnswers);
          setFlaggedQuestions(flagged);
          
          // تحديد السؤال الحالي: إما آخر سؤال تم الإجابة عليه أو السؤال التالي له
          if (lastAnsweredIndex >= 0) {
            // إذا كان آخر سؤال تم الإجابة عليه ليس الأخير، انتقل للسؤال التالي
            const nextIndex = lastAnsweredIndex + 1;
            const totalQuestions = transformedAttempt.assessment.items?.length || 0;
            const resumeIndex = nextIndex < totalQuestions ? nextIndex : lastAnsweredIndex;
            setCurrentQuestionIndex(resumeIndex);
            
            // تهيئة progress animation
            const initialProgress = ((resumeIndex + 1) / totalQuestions) * 100;
            progressAnim.setValue(initialProgress);
            
            // إعلام الطالب بموقعه
            setTimeout(() => {
              Alert.alert(
                '✅ تم استئناف الاختبار',
                `تم استعادة ${Object.keys(savedAnswers).length} إجابة محفوظة.\nستبدأ من السؤال ${resumeIndex + 1} من ${totalQuestions}.`,
                [{ text: 'حسناً', style: 'default' }]
              );
            }, 500);
          }
        }
      } else {
        Alert.alert('خطأ', 'لم يتم العثور على محاولة نشطة');
        router.replace('/(tabs)/' as any);
      }
    } catch (error) {
      console.error('Error fetching attempt:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الاختبار');
      router.replace('/(tabs)/' as any);
    } finally {
      setLoading(false);
    }
  };

  // Slide animation عند تغيير السؤال
  useEffect(() => {
    if (!attempt || !attempt.assessment.items) return;
    
    // تحديد اتجاه الـ slide بناءً على الحركة (للأمام أو للخلف)
    const isMovingForward = currentQuestionIndex > previousIndexRef.current;
    const slideDirection = isRTL 
      ? (isMovingForward ? screenWidth : -screenWidth) // RTL: من اليسار
      : (isMovingForward ? -screenWidth : screenWidth); // LTR: من اليمين
    
    // Reset position
    slideAnim.setValue(slideDirection);
    fadeAnim.setValue(0);
    
    // Calculate progress percentage
    const totalQuestions = attempt.assessment.items.length;
    const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    
    // Animate to center
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progressPercentage,
        duration: 400,
        useNativeDriver: false, // width animation لا يدعم native driver
      }),
    ]).start();
    
    // حفظ الـ index الحالي للمرة القادمة
    previousIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex, attempt]);

  // تتبع الوقت المستغرق على كل سؤال
  useEffect(() => {
    if (!attempt || !attempt.assessment.items) return;
    
    const currentQuestionId = attempt.assessment.items[currentQuestionIndex]?.question.id;
    if (!currentQuestionId) return;
    
    // حفظ الوقت المستغرق على السؤال السابق
    const now = Date.now();
    const timeSpent = Math.floor((now - questionStartTime) / 1000);
    
    if (timeSpent > 0) {
      setQuestionTimeSpent((prev) => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent,
      }));
    }
    
    // بدء توقيت السؤال الجديد
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const saveAnswer = async (questionId: number, optionId: number, flagged: boolean = false) => {
    try {
      // حساب الوقت المستغرق حتى الآن على هذا السؤال
      const now = Date.now();
      const additionalTime = Math.floor((now - questionStartTime) / 1000);
      const totalTimeSpent = (questionTimeSpent[questionId] || 0) + additionalTime;
      
      // تحديد ما إذا كنا ننتظر feedback (في diagnostic/periodic mode فقط)
      const willShowFeedback = (assessmentType === 'diagnostic' || assessmentType === 'periodic');
      
      // إضافة للـ pending feedback إذا كنا ننتظر feedback
      if (willShowFeedback) {
        setPendingFeedback((prev) => new Set(prev).add(questionId));
      }
      
      // Update immediately for smooth UX
      setSelectedOptions((prev) => ({
        ...prev,
        [questionId]: optionId,
      }));
      
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.ASSESSMENT_SAVE_RESPONSE(attemptId!), 
        {
          question_id: questionId,
          selected_option_id: optionId,
          flagged: flagged,
          time_spent_sec: totalTimeSpent,
        }
      );
      
      // إظهار feedback إذا كان النوع diagnostic أو periodic
      console.log('Assessment Type:', assessmentType);
      console.log('Response:', response);
      
      if (response && response.data && response.data.show_feedback) {
        console.log('Showing feedback - is_correct:', response.data.is_correct);
        
        // تشغيل الصوت
        playSound(response.data.is_correct);
        
        setFeedbackData((prev) => ({
          ...prev,
          [questionId]: {
            is_correct: response.data.is_correct,
          },
        }));
        
        // إزالة من pending feedback
        setPendingFeedback((prev) => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
      } else {
        console.log('No feedback to show');
        // إزالة من pending feedback حتى لو لم يكن هناك feedback
        setPendingFeedback((prev) => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
      }
      
      // تحديث الوقت المحفوظ
      setQuestionTimeSpent((prev) => ({
        ...prev,
        [questionId]: totalTimeSpent,
      }));
      
      // إعادة تعيين وقت البدء
      setQuestionStartTime(Date.now());
    } catch (error: any) {
      console.error('Error saving answer:', error);
      
      // عرض رسالة خطأ واضحة للمستخدم
      const errorMessage = error?.message || error?.response?.data?.error?.message || 'حدث خطأ في حفظ الإجابة';
      Alert.alert('خطأ', errorMessage);
      
      // إزالة من pending feedback في حالة الخطأ
      setPendingFeedback((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const toggleFlag = async (questionId: number) => {
    try {
      const newFlagged = new Set(flaggedQuestions);
      const isFlagged = newFlagged.has(questionId);
      
      if (isFlagged) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      setFlaggedQuestions(newFlagged);
      
      // حفظ الحالة في الـ API
      await saveAnswer(questionId, selectedOptions[questionId], !isFlagged);
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const handleSaveQuestion = async () => {
    try {
      const currentQuestion = attempt?.assessment.items?.[currentQuestionIndex]?.question;
      if (!currentQuestion?.id) {
        Alert.alert('خطأ', 'لا يمكن حفظ السؤال');
        return;
      }

      await api.post(API_ENDPOINTS.SAVE_QUESTION, {
        question_id: currentQuestion.id,
        note: saveNote || undefined,
        assessment_attempt_id: attemptId,
        // importance removed - field no longer exists
      });
      
      Alert.alert('✅ تم الحفظ', 'تم حفظ السؤال في مكتبتك الشخصية');
      setSaveModal(false);
      setSaveNote('');
    } catch (error: any) {
      console.error('Error saving question:', error);
      
      // Handle specific error messages
      let errorMessage = 'حدث خطأ في حفظ السؤال';
      if (error?.message?.includes('already saved') || error?.message?.includes('ALREADY_SAVED')) {
        errorMessage = 'هذا السؤال محفوظ مسبقاً في مكتبتك';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('خطأ', errorMessage);
    }
  };

  const handleNext = () => {
    if (attempt && attempt.assessment.items && currentQuestionIndex < attempt.assessment.items.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowNavigationBar(false);
  };

  const handleAutoSubmit = async () => {
    Alert.alert('انتهى الوقت', 'تم تسليم الاختبار تلقائياً');
    await handleSubmit();
  };

  const handleSubmit = async () => {
    try {
      // إغلاق أي modals مفتوحة
      setShowNavigationBar(false);
      
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.ASSESSMENT_SUBMIT(attemptId!),
        {}
      );
      
      if (response && response.ok) {
        // تنظيف الـ timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        router.replace(`/assessments/${id}/results?attemptId=${attemptId}`);
      }
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      
      // تنظيف الـ timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // إذا كانت المحاولة غير نشطة، نرجع للـ dashboard
      const errorMessage = error?.response?.data?.error?.message || error?.message || '';
      if (errorMessage.includes('نشط') || errorMessage.includes('active')) {
        Alert.alert(
          'انتهت المحاولة',
          'هذه المحاولة انتهت بالفعل. سيتم نقلك للصفحة الرئيسية.',
          [
            {
              text: 'حسناً',
              onPress: () => {
                const trackId = attempt?.assessment.track_id;
                if (trackId) {
                  router.replace(`/(tabs)/tracks/${trackId}` as any);
                } else {
                  router.replace('/(tabs)/' as any);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('خطأ', 'حدث خطأ في تسليم الاختبار');
      }
    }
  };

  const handleExit = async () => {
    // إغلاق الـ Modal أولاً
    setShowExitModal(false);
    
    // تنظيف الـ timer قبل الخروج
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      await api.post(API_ENDPOINTS.ASSESSMENT_CANCEL(attemptId!), {});
    } catch (error) {
      console.error('Error canceling assessment:', error);
    } finally {
      // الانتقال للـ dashboard بغض النظر عن نتيجة الـ API
      const trackId = attempt?.assessment.track_id;
      
      // استخدام replace لتدمير الـ screen بالكامل ومنع العودة
      if (trackId) {
        router.replace(`/(tabs)/tracks/${trackId}` as any);
      } else {
        router.replace('/(tabs)/' as any);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !attempt) {
    const trackColors = getTrackColors(null);
    return (
      <GradientBackground colors={trackColors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          {/* Header - Icons Row Skeleton */}
          <View style={[styles.headerIconsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={40} height={40} borderRadius={20} />
          </View>

          {/* Header - Content Skeleton */}
          <View style={styles.headerContent}>
            <SkeletonLoader width={120} height={48} borderRadius={16} />
          </View>

          {/* Progress Bar Skeleton */}
          <View style={styles.progressSection}>
            <SkeletonLoader width={60} height={13} borderRadius={6} style={{ marginBottom: 6, alignSelf: isRTL ? 'flex-start' : 'flex-end' }} />
            <View style={[styles.progressBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <SkeletonLoader width="45%" height={5} borderRadius={8} />
            </View>
          </View>

          {/* Content Skeleton */}
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>

            {/* Question Card Skeleton */}
            <View style={styles.questionCard}>
              <SkeletonLoader width="100%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="95%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="85%" height={16} borderRadius={6} />
            </View>

            {/* Options Skeleton */}
            <View style={styles.optionsContainer}>
              <SkeletonLoader width="100%" height={56} borderRadius={12} />
              <SkeletonLoader width="100%" height={56} borderRadius={12} />
              <SkeletonLoader width="100%" height={56} borderRadius={12} />
              <SkeletonLoader width="100%" height={56} borderRadius={12} />
            </View>
          </View>

          {/* Bottom Navigation Skeleton */}
          <BlurView intensity={90} tint="dark" style={styles.bottomNavBlur}>
            <View style={[styles.bottomNavContainer, { paddingBottom: Math.max(insets.bottom, 20), flexDirection }]}>
              <SkeletonLoader width={52} height={52} borderRadius={26} />
              <SkeletonLoader width={52} height={52} borderRadius={26} />
              <View style={styles.centerButtonContainer}>
                <SkeletonLoader width={64} height={64} borderRadius={32} />
              </View>
              <SkeletonLoader width={52} height={52} borderRadius={26} />
              <SkeletonLoader width={52} height={52} borderRadius={26} />
            </View>
          </BlurView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // التحقق من وجود الأسئلة
  if (!attempt.assessment.items || attempt.assessment.items.length === 0) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <MaterialIcons name="error-outline" size={48} color="#FF6B9D" />
            <Text style={styles.errorText}>لا توجد أسئلة في هذا الاختبار</Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const currentItem = attempt.assessment.items[currentQuestionIndex];
  if (!currentItem || !currentItem.question) {
    console.error('Current item or question is undefined', { 
      currentQuestionIndex, 
      itemsLength: attempt.assessment.items.length,
      currentItem 
    });
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <MaterialIcons name="error-outline" size={48} color="#FF6B9D" />
            <Text style={styles.errorText}>خطأ في تحميل السؤال</Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const currentQuestion = currentItem.question;
  const trackColors = getTrackColors(attempt.assessment.track_id || null);
  const totalQuestions = attempt.assessment.items.length;
  const answeredCount = Object.keys(selectedOptions).length;

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header - Icons Row */}
        <View style={[styles.headerIconsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => setSaveModal(true)} style={styles.headerButton}>
            <MaterialIcons name="bookmark-outline" size={24} color="#D4AF37" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowExitModal(true)} style={styles.headerButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Header - Content */}
        <View style={styles.headerContent}>
          <Animated.View 
            style={[
              styles.timerContainer, 
              { 
                flexDirection: isRTL ? 'row-reverse' : 'row',
                transform: [{ scale: timerPulseAnim }],
              }
            ]}
          >
            <View style={[
              styles.timerIconContainer,
              timeRemaining <= 300 && styles.timerIconContainerWarning
            ]}>
              <MaterialIcons 
                name="access-time" 
                size={20} 
                color={timeRemaining <= 300 ? "#EF4444" : "#D4AF37"} 
              />
            </View>
            <Text style={[
              styles.timerText,
              timeRemaining <= 300 && styles.timerTextWarning
            ]}>
              {formatTime(timeRemaining)}
            </Text>
            <Text style={[
              styles.timerLabel,
              timeRemaining <= 300 && styles.timerLabelWarning
            ]}>
              دقيقة
            </Text>
          </Animated.View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={[styles.progressText, { textAlign }]}>
            {currentQuestionIndex + 1} / {totalQuestions}
          </Text>
          <View style={[styles.progressBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: '#10B981',
                }
              ]} 
            />
          </View>
        </View>

        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateX: slideAnim }],
            opacity: fadeAnim,
            paddingHorizontal: 16,
          }}
        >
          {/* Question Tabs - إزالة التبويبات الثابتة غير المفيدة */}

          {/* Question Content */}
          <ScrollView 
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentScrollContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={true}
            scrollEnabled={true}
          >
            <View style={styles.questionCard}>
              <Text style={[styles.questionText, { textAlign }]}>
                {currentQuestion.stem}
              </Text>
              
              {(currentQuestion.has_image && currentQuestion.image_url) ? (
                <Image
                  source={{ uri: currentQuestion.image_url }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              ) : currentQuestion.media_url ? (
                <Image
                  source={{ uri: currentQuestion.media_url }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options
                .sort((a, b) => (a.option_order || 0) - (b.option_order || 0))
                .map((option) => {
                  const isSelected = selectedOptions[currentQuestion.id] === option.id;
                  const hasFeedback = feedbackData[currentQuestion.id] !== undefined && (assessmentType === 'diagnostic' || assessmentType === 'periodic');
                  const isCorrect = feedbackData[currentQuestion.id]?.is_correct;
                  const isPending = pendingFeedback.has(currentQuestion.id);
                  
                  // تحديد الألوان والأيقونات بناءً على feedback
                  let iconName: any = null;
                  let iconColor: string | undefined = undefined;
                  const optionStyles: any[] = [styles.optionButton, { flexDirection }];
                  
                  if (hasFeedback && isSelected) {
                    if (isCorrect) {
                      optionStyles.push(styles.optionButtonCorrect);
                      iconName = 'check-circle';
                      iconColor = '#10B981';
                    } else {
                      optionStyles.push(styles.optionButtonWrong);
                      iconName = 'cancel';
                      iconColor = '#EF4444';
                    }
                  } else if (isSelected && !isPending) {
                    // فقط أظهر selected state إذا لم نكن ننتظر feedback
                    optionStyles.push(styles.optionButtonSelected);
                  }
                  
                  return (
                    <Animated.View
                      key={option.id}
                      style={{
                        transform: [{ scale: isSelected ? 1 : 0.98 }],
                      }}
                    >
                      <TouchableOpacity
                        style={optionStyles}
                        onPress={() => saveAnswer(currentQuestion.id, option.id)}
                        activeOpacity={0.7}
                        disabled={hasFeedback}
                      >
                        <View style={[
                          styles.radioButton,
                          isSelected && !isPending && styles.radioButtonSelected,
                          hasFeedback && isCorrect && isSelected && { borderColor: '#10B981', backgroundColor: '#10B981' },
                          hasFeedback && !isCorrect && isSelected && { borderColor: '#EF4444', backgroundColor: '#EF4444' },
                        ]}>
                          {isSelected && !hasFeedback && !isPending && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        <Text style={[
                          styles.optionFullText,
                          isSelected && styles.optionFullTextSelected,
                          { textAlign }
                        ]}>
                          {(option.label || option.option_label) && `${option.label || option.option_label}. `}
                          {option.content}
                        </Text>
                        {iconName && (
                          <MaterialIcons name={iconName} size={24} color={iconColor} style={{ marginStart: 8 }} />
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Bottom Navigation - Different for Diagnostic/Periodic vs Simulation */}
        {(assessmentType === 'diagnostic' || assessmentType === 'periodic') ? (
          /* Diagnostic/Periodic: Next Button Only - Luxurious Design */
          <BlurView intensity={90} tint="dark" style={styles.bottomNavBlur}>
            <View style={[styles.diagnosticBottomContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <Animated.View style={{ transform: [{ scale: nextButtonPulse }] }}>
                <TouchableOpacity
                  style={[
                    styles.luxuryNextButton,
                    { backgroundColor: trackColors.primary },
                    !selectedOptions[currentQuestion.id] && styles.luxuryNextButtonDisabled
                  ]}
                  onPress={() => {
                    if (currentQuestionIndex >= totalQuestions - 1) {
                      // آخر سؤال - تسليم مباشر
                      handleSubmit();
                    } else {
                      // الانتقال للسؤال التالي
                      handleNext();
                    }
                  }}
                  disabled={!selectedOptions[currentQuestion.id]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.luxuryNextButtonContent, { flexDirection }]}>
                    <Text 
                      style={styles.luxuryNextButtonText}
                      allowFontScaling={false}
                      numberOfLines={1}
                    >
                      {currentQuestionIndex >= totalQuestions - 1 ? 'إنهاء الاختبار' : 'التالي'}
                    </Text>
                    <View style={styles.luxuryNextButtonIcon}>
                      <MaterialIcons 
                        name={currentQuestionIndex >= totalQuestions - 1 ? "check-circle" : "arrow-back"}
                        size={28} 
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  {!selectedOptions[currentQuestion.id] && (
                    <View style={styles.luxuryButtonOverlay}>
                      <MaterialIcons name="lock" size={26} color="rgba(255,255,255,0.6)" />
                      <Text 
                        style={styles.luxuryButtonOverlayText}
                        allowFontScaling={false}
                        numberOfLines={1}
                      >
                        اختر إجابة أولاً
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </BlurView>
        ) : (
          /* Simulation: Full Navigation */
          <BlurView intensity={90} tint="dark" style={styles.bottomNavBlur}>
            <View style={[styles.bottomNavContainer, { paddingBottom: Math.max(insets.bottom, 20), flexDirection }]}>
              {/* Previous Button - Left */}
              <TouchableOpacity
                style={[
                  styles.bottomNavButton,
                  currentQuestionIndex === 0 && styles.bottomNavButtonDisabled
                ]}
                onPress={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <MaterialIcons 
                  name="arrow-forward" 
                  size={26} 
                  color={currentQuestionIndex === 0 ? "#666" : "#FFFFFF"}
                />
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.bottomNavButton}
                onPress={() => setSaveModal(true)}
              >
                <MaterialIcons name="bookmark-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Navigation Grid Toggle - CENTER - Elevated */}
              <View style={styles.centerButtonContainer}>
                <TouchableOpacity
                  style={[styles.bottomNavButtonCenter, { backgroundColor: trackColors.primary }]}
                  onPress={() => setShowNavigationBar(!showNavigationBar)}
                >
                  <MaterialIcons name="apps" size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Flag Button */}
              <TouchableOpacity
                style={[
                  styles.bottomNavButton,
                  flaggedQuestions.has(currentQuestion.id) && { backgroundColor: '#F59E0B' }
                ]}
                onPress={() => toggleFlag(currentQuestion.id)}
              >
                <MaterialIcons 
                  name={flaggedQuestions.has(currentQuestion.id) ? "flag" : "outlined-flag"} 
                  size={26} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>

              {/* Next/Submit Button - Right */}
              <TouchableOpacity
                style={[
                  styles.bottomNavButton,
                  currentQuestionIndex >= totalQuestions - 1 && styles.bottomNavButtonSubmit
                ]}
                onPress={currentQuestionIndex >= totalQuestions - 1 ? () => {
                  if (answeredCount < totalQuestions) {
                    Alert.alert(
                      '⚠️ تنبيه',
                      `يجب الإجابة على جميع الأسئلة قبل التسليم.\nلديك ${answeredCount} من ${totalQuestions} إجابة.\nالمتبقي: ${totalQuestions - answeredCount} سؤال.`,
                      [{ text: 'حسناً', style: 'default' }]
                    );
                    return;
                  }
                  
                  Alert.alert(
                    'إنهاء الاختبار',
                    `لديك ${answeredCount} من ${totalQuestions} إجابة. هل تريد التسليم؟`,
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'تسليم', onPress: handleSubmit, style: 'destructive' },
                    ]
                  );
                } : handleNext}
              >
                <MaterialIcons 
                  name={currentQuestionIndex >= totalQuestions - 1 ? "check" : "arrow-back"} 
                  size={26} 
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </BlurView>
        )}

        {/* Navigation Bar - Only for Simulation Mode */}
        {showNavigationBar && assessmentType !== 'diagnostic' && assessmentType !== 'periodic' && (
          <BlurView 
            intensity={80} 
            tint="dark"
            style={[
              styles.navigationBar,
              {
                backgroundColor: `${trackColors.primary}20`,
                borderTopColor: `${trackColors.primary}60`,
              }
            ]}
          >
            {/* Close Button */}
            <View style={[styles.navHeader, { flexDirection }]}>
              <Text style={styles.navHeaderTitle}>الأسئلة</Text>
              <TouchableOpacity
                style={[styles.closeNavButton, { backgroundColor: `${trackColors.primary}30`, borderColor: `${trackColors.primary}60` }]}
                onPress={() => setShowNavigationBar(false)}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.navigationContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.navigationGrid, { flexDirection }]}>
                {attempt.assessment.items!.map((item, index) => {
                  const isAnswered = selectedOptions[item.question.id] !== undefined;
                  const isFlagged = flaggedQuestions.has(item.question.id);
                  const isCurrent = index === currentQuestionIndex;
                  
                  let bgColor = 'rgba(255, 255, 255, 0.1)';
                  if (isCurrent) bgColor = trackColors.primary;
                  else if (isFlagged) bgColor = '#F59E0B';
                  else if (isAnswered) bgColor = '#10B981';
                  
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.navButton, { backgroundColor: bgColor }]}
                      onPress={() => handleQuestionSelect(index)}
                    >
                      <Text style={styles.navButtonText}>{index + 1}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={[styles.navLegend, { flexDirection }]}>
                <View style={[styles.legendItem, { flexDirection }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>محلول ({answeredCount})</Text>
                </View>
                <View style={[styles.legendItem, { flexDirection }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>معلّم ({flaggedQuestions.size})</Text>
                </View>
                <View style={[styles.legendItem, { flexDirection }]}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                  <Text style={styles.legendText}>متبقي ({totalQuestions - answeredCount})</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: answeredCount < totalQuestions ? '#666666' : '#EF4444' },
                  answeredCount < totalQuestions && { opacity: 0.5 }
                ]}
                onPress={() => {
                  // التحقق من أن جميع الأسئلة تم الإجابة عليها
                  if (answeredCount < totalQuestions) {
                    Alert.alert(
                      '⚠️ تنبيه',
                      `يجب الإجابة على جميع الأسئلة قبل التسليم.\nلديك ${answeredCount} من ${totalQuestions} إجابة.\nالمتبقي: ${totalQuestions - answeredCount} سؤال.`,
                      [{ text: 'حسناً', style: 'default' }]
                    );
                    return;
                  }
                  
                  // إغلاق navigation bar أولاً
                  setShowNavigationBar(false);
                  
                  Alert.alert(
                    'تسليم الاختبار',
                    `لديك ${answeredCount} من ${totalQuestions} إجابة. هل تريد التسليم؟`,
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'تسليم', onPress: handleSubmit, style: 'destructive' },
                    ]
                  );
                }}
                disabled={answeredCount < totalQuestions}
              >
                <Text style={[
                  styles.submitButtonText,
                  answeredCount < totalQuestions && { color: '#999999' }
                ]}>
                  إنهاء الاختبار {answeredCount < totalQuestions && `(${totalQuestions - answeredCount} متبقي)`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        )}

        {/* Save Modal */}
        <Modal visible={showSaveModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setSaveModal(false)}
            />
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
              <View style={[styles.modalHeader, { flexDirection }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: `${trackColors.primary}30` }]}>
                  <MaterialIcons name="bookmark" size={28} color={trackColors.primary} />
                </View>
                <Text style={styles.modalTitle}>حفظ السؤال</Text>
                <TouchableOpacity 
                  onPress={() => setSaveModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#8FA4C0" />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.modalLabel, { textAlign }]}>أضف ملاحظة (اختياري):</Text>
              <TextInput
                style={[styles.modalInput, { textAlign }]}
                placeholder="اكتب ملاحظتك هنا..."
                placeholderTextColor="#8FA4C0"
                value={saveNote}
                onChangeText={setSaveNote}
                multiline
                numberOfLines={4}
                textAlign={isRTL ? 'right' : 'left'}
              />
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: trackColors.primary, flexDirection }]}
                onPress={handleSaveQuestion}
              >
                <MaterialIcons name="save" size={22} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>حفظ السؤال</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>

        {/* Exit Modal */}
        <Modal visible={showExitModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setShowExitModal(false)}
            />
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
              <View style={[styles.modalHeader, { flexDirection }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <MaterialIcons name="warning" size={28} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>تحذير</Text>
                <TouchableOpacity 
                  onPress={() => setShowExitModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#8FA4C0" />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.modalMessage, { textAlign: 'center' }]}>
                الخروج من الاختبار سيؤدي إلى إلغاء المحاولة. هل أنت متأكد؟
              </Text>
              
              <View style={[styles.modalActions, { flexDirection }]}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalActionButtonSecondary, { flexDirection }]}
                  onPress={() => setShowExitModal(false)}
                >
                  <Text style={styles.modalActionText}>إلغاء</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalActionButtonDanger, { flexDirection }]}
                  onPress={handleExit}
                >
                  <MaterialIcons name="exit-to-app" size={20} color="#FFFFFF" />
                  <Text style={styles.modalActionText}>تأكيد الخروج</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  timerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerIconContainerWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  timerText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerTextWarning: {
    color: '#EF4444',
  },
  timerLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  timerLabelWarning: {
    color: 'rgba(239, 68, 68, 0.8)',
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 6,
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  contentScrollView: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabActive: {
    backgroundColor: '#10B981',
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextInactive: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  questionCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  questionImage: {
    width: '100%',
    height: 140,
    marginTop: 12,
    borderRadius: 10,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    minHeight: 56,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
    borderWidth: 2.5,
  },
  optionButtonCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderColor: '#10B981',
    borderWidth: 3,
  },
  optionButtonWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
    borderWidth: 3,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  optionLabel: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 25,
  },
  optionText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  optionFullText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  optionFullTextSelected: {
    fontWeight: '600',
  },
  bottomNavBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  bottomNavButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  centerButtonContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomNavButtonCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomNavButtonDisabled: {
    opacity: 0.3,
  },
  bottomNavButtonSubmit: {
    backgroundColor: '#10B981',
  },
  navigationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 2,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  navHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navigationContent: {
    paddingBottom: 20,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'flex-start',
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  navLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  modalLabel: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: 'rgba(143, 164, 192, 0.15)',
    borderRadius: 14,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#666666',
  },
  disabledButtonText: {
    color: '#999999',
    fontWeight: '600',
  },
  modalMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 28,
  },
  modalActions: {
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalActionButtonSecondary: {
    backgroundColor: 'rgba(143, 164, 192, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(143, 164, 192, 0.5)',
  },
  modalActionButtonDanger: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#1B365D',
    fontSize: 16,
    fontWeight: '700',
  },
  // Diagnostic Mode - Luxury Next Button Styles
  diagnosticBottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  luxuryNextButton: {
    width: '100%',
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  luxuryNextButtonDisabled: {
    shadowOpacity: 0.2,
  },
  luxuryNextButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  luxuryNextButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  luxuryNextButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  luxuryButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  luxuryButtonOverlayText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

