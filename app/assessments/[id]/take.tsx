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
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';

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
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  
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

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerPulseAnim = useRef(new Animated.Value(1)).current;
  const previousIndexRef = useRef(0);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetchAttempt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attemptId]);

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
      ? (isMovingForward ? -screenWidth : screenWidth) // RTL: عكس الاتجاه
      : (isMovingForward ? screenWidth : -screenWidth); // LTR: عادي
    
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
      
      // Update immediately for smooth UX
      setSelectedOptions((prev) => ({
        ...prev,
        [questionId]: optionId,
      }));
      
      await api.post(API_ENDPOINTS.ASSESSMENT_SAVE_RESPONSE(attemptId!), {
        question_id: questionId,
        selected_option_id: optionId,
        flagged: flagged,
        time_spent_sec: totalTimeSpent,
      });
      
      // تحديث الوقت المحفوظ
      setQuestionTimeSpent((prev) => ({
        ...prev,
        [questionId]: totalTimeSpent,
      }));
      
      // إعادة تعيين وقت البدء
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Error saving answer:', error);
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
      await api.post(API_ENDPOINTS.SAVE_QUESTION, {
        question_id: currentQuestion?.id,
        note: saveNote,
        assessment_attempt_id: attemptId,
        importance: 'med',
      });
      
      Alert.alert('✅ تم الحفظ', 'تم حفظ السؤال في مكتبتك الشخصية');
      setSaveModal(false);
      setSaveNote('');
    } catch (error) {
      console.error('Error saving question:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ السؤال');
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
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.ASSESSMENT_SUBMIT(attemptId!),
        {}
      );
      
      if (response && response.ok) {
        router.replace(`/assessments/${id}/results?attemptId=${attemptId}`);
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      Alert.alert('خطأ', 'حدث خطأ في تسليم الاختبار');
    }
  };

  const handleExit = async () => {
    try {
      await api.post(API_ENDPOINTS.ASSESSMENT_CANCEL(attemptId!), {});
      const trackId = attempt?.assessment.track_id;
      if (trackId) {
        router.push(`/(tabs)/tracks/${trackId}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error canceling assessment:', error);
      const trackId = attempt?.assessment.track_id;
      if (trackId) {
        router.push(`/(tabs)/tracks/${trackId}`);
      } else {
        router.back();
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
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
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
          <TouchableOpacity onPress={() => {}} style={styles.headerButton}>
            <MaterialIcons name="lightbulb-outline" size={24} color="#FFD700" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowExitModal(true)} style={styles.headerButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Header - Content */}
        <View style={styles.headerContent}>
          {/* Exam Icon */}
          <Image 
            source={require('@/assets/images/exam_photo.png')}
            style={styles.examIcon}
            resizeMode="contain"
          />
          
          <Text style={styles.headerTitle}>{attempt.assessment.name}</Text>
          <Animated.View 
            style={[
              styles.timerContainer, 
              { 
                flexDirection: isRTL ? 'row-reverse' : 'row',
                transform: [{ scale: timerPulseAnim }],
              }
            ]}
          >
            <MaterialIcons name="access-time" size={16} color={timeRemaining <= 300 ? "#EF4444" : "#FFFFFF"} />
            <Text style={[
              styles.timerText,
              timeRemaining <= 300 && { color: '#EF4444', fontWeight: '700' }
            ]}>
              {formatTime(timeRemaining)} دقيقة
            </Text>
          </Animated.View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {totalQuestions}
          </Text>
          <View style={styles.progressBar}>
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
          {/* Question Tabs */}
          <View style={[styles.tabsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabText}>سؤال {currentQuestionIndex + 1}</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabTextInactive}>English Grammar</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabTextInactive}>اختيار من متعدد</Text>
            </View>
          </View>

          {/* Question Content */}
          <ScrollView 
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.questionCard}>
              <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {currentQuestion.stem}
              </Text>
              
              {currentQuestion.media_url && (
                <Image
                  source={{ uri: currentQuestion.media_url }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options
                .sort((a, b) => (a.option_order || 0) - (b.option_order || 0))
                .map((option) => {
                  const isSelected = selectedOptions[currentQuestion.id] === option.id;
                  return (
                    <Animated.View
                      key={option.id}
                      style={{
                        transform: [{ scale: isSelected ? 1 : 0.98 }],
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                        onPress={() => saveAnswer(currentQuestion.id, option.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.radioButton,
                          isSelected && styles.radioButtonSelected,
                        ]}>
                          {isSelected && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        <Text style={[
                          styles.optionFullText,
                          isSelected && styles.optionFullTextSelected,
                        ]}>
                          {(option.label || option.option_label) && `${option.label || option.option_label}. `}
                          {option.content}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={() => setSaveModal(true)}
          >
            <MaterialIcons name="bookmark-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>حفظ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.flagButton,
              flaggedQuestions.has(currentQuestion.id) && { backgroundColor: '#F59E0B' }
            ]}
            onPress={() => toggleFlag(currentQuestion.id)}
          >
            <MaterialIcons 
              name={flaggedQuestions.has(currentQuestion.id) ? "flag" : "outlined-flag"} 
              size={18} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {flaggedQuestions.has(currentQuestion.id) ? 'معلّم' : 'تعليم'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.nextButton, 
              { backgroundColor: trackColors.primary },
              (currentQuestionIndex >= totalQuestions - 1 && answeredCount < totalQuestions) && styles.disabledButton
            ]}
            onPress={currentQuestionIndex >= totalQuestions - 1 ? () => {
              // التحقق من أن جميع الأسئلة تم الإجابة عليها
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
            disabled={currentQuestionIndex >= totalQuestions - 1 && answeredCount < totalQuestions}
          >
            <Text style={[
              styles.actionButtonText,
              (currentQuestionIndex >= totalQuestions - 1 && answeredCount < totalQuestions) && styles.disabledButtonText
            ]}>
              {currentQuestionIndex >= totalQuestions - 1 ? 'إنهاء الاختبار' : 'التالي'}
            </Text>
            <MaterialIcons 
              name={currentQuestionIndex >= totalQuestions - 1 ? "check" : "arrow-back"} 
              size={18} 
              color={(currentQuestionIndex >= totalQuestions - 1 && answeredCount < totalQuestions) ? "#999" : "#FFFFFF"}
              style={currentQuestionIndex >= totalQuestions - 1 ? {} : { transform: [{ scaleX: -1 }] }} 
            />
          </TouchableOpacity>
        </View>

        {/* Navigation Bar Toggle */}
        <TouchableOpacity
          style={[styles.navToggle, { backgroundColor: trackColors.primary }]}
          onPress={() => setShowNavigationBar(!showNavigationBar)}
        >
          <MaterialIcons name="apps" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Navigation Bar */}
        {showNavigationBar && (
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
            <View style={styles.navHeader}>
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
              <View style={styles.navigationGrid}>
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
              
              <View style={styles.navLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>محلول ({answeredCount})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>معلّم ({flaggedQuestions.size})</Text>
                </View>
                <View style={styles.legendItem}>
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <MaterialIcons name="bookmark" size={24} color={trackColors.primary} />
                <Text style={styles.modalTitle}>حفظ السؤال</Text>
                <TouchableOpacity onPress={() => setSaveModal(false)}>
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalLabel}>أضف ملاحظة (اختياري):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="اكتب ملاحظتك هنا..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={saveNote}
                onChangeText={setSaveNote}
                multiline
                numberOfLines={4}
                textAlign={isRTL ? 'right' : 'left'}
              />
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: trackColors.primary }]}
                onPress={handleSaveQuestion}
              >
                <MaterialIcons name="save" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Exit Modal */}
        <Modal visible={showExitModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <MaterialIcons name="warning" size={24} color="#EF4444" />
                <Text style={styles.modalTitle}>تحذير</Text>
                <TouchableOpacity onPress={() => setShowExitModal(false)}>
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.modalMessage, { textAlign: 'center' }]}>
                الخروج من الاختبار سيؤدي إلى إلغاء المحاولة. هل أنت متأكد؟
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => setShowExitModal(false)}
                >
                  <Text style={styles.modalActionText}>إلغاء</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]}
                  onPress={handleExit}
                >
                  <Text style={styles.modalActionText}>تأكيد الخروج</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingBottom: 6,
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
  examIcon: {
    width: 70,
    height: 70,
    marginBottom: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
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
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'right',
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
    paddingBottom: 16,
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
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    minHeight: 56,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
    borderWidth: 2.5,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: 12,
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
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flagButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButton: {
    // backgroundColor set dynamically
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  navToggle: {
    position: 'absolute',
    bottom: 85,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(27, 54, 93, 0.95)',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  modalLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
});

