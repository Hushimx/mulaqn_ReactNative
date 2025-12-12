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
import { GradientButton } from '@/components/ui/GradientButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface QuestionOption {
  id: number;
  option_text: string;
  option_order?: number;
}

interface Question {
  id: number;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  order_index?: number;
  options: QuestionOption[];
  user_response?: {
    selected_option_id?: number;
    selected_option_ids?: number[];
  };
}

interface LessonAttempt {
  id: number;
  lesson_id: number;
  lesson?: {
    id: number;
    title: string;
    questions_count: number;
  };
  status: 'in_progress' | 'completed' | 'abandoned';
  questions: Question[];
  current_question_index?: number;
  answered_count?: number;
}

export default function LessonAttemptScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [attempt, setAttempt] = useState<LessonAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number | number[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchAttempt();
    }
  }, [id]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      setError(null);

      // في الواقع، نحتاج endpoint للحصول على attempt details
      // لكن في Laravel API الحالي ليس موجود، لذا نستخدم lesson details
      // وننشئ attempt جديد
      
      // هذا workaround - في الواقع يجب أن يكون هناك GET /lesson-attempts/{id}
      setAttempt({
        id: parseInt(id),
        lesson_id: 0,
        status: 'in_progress',
        questions: [],
      });
      
    } catch (err) {
      console.error('Error fetching attempt:', err);
      setError(err instanceof Error ? err.message : t('lessons.errorLoadingAttempt'));
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId: number, optionId: number, isMultiple: boolean) => {
    if (isMultiple) {
      const current = (selectedOptions[questionId] as number[]) || [];
      const index = current.indexOf(optionId);
      
      if (index > -1) {
        // إزالة الاختيار
        setSelectedOptions({
          ...selectedOptions,
          [questionId]: current.filter(id => id !== optionId),
        });
      } else {
        // إضافة الاختيار
        setSelectedOptions({
          ...selectedOptions,
          [questionId]: [...current, optionId],
        });
      }
    } else {
      // Single choice
      setSelectedOptions({
        ...selectedOptions,
        [questionId]: optionId,
      });
    }
  };

  const saveResponse = async (question: Question) => {
    try {
      const selectedOption = selectedOptions[question.id];
      if (!selectedOption) return;

      const payload = question.question_type === 'multiple_choice'
        ? { question_id: question.id, selected_option_ids: selectedOption as number[] }
        : { question_id: question.id, selected_option_id: selectedOption as number };

      await api.post(
        API_ENDPOINTS.LESSON_ATTEMPT_RESPONSES(id),
        payload
      );
    } catch (err) {
      console.error('Error saving response:', err);
      throw err;
    }
  };

  const handleNext = async () => {
    if (!attempt) return;

    const currentQuestion = attempt.questions[currentQuestionIndex];
    const hasAnswer = selectedOptions[currentQuestion.id];

    if (!hasAnswer) {
      Alert.alert(
        t('common.error'),
        t('lessons.pleaseSelectAnswer')
      );
      return;
    }

    try {
      // حفظ الإجابة
      await saveResponse(currentQuestion);

      // الانتقال للسؤال التالي
      if (currentQuestionIndex < attempt.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('lessons.errorSavingAnswer')
      );
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (!attempt) return;

    const answeredCount = Object.keys(selectedOptions).length;
    const totalQuestions = attempt.questions.length;

    if (answeredCount < totalQuestions) {
      Alert.alert(
        t('lessons.incompleteAttempt'),
        t('lessons.incompleteAttemptMessage', { answered: answeredCount, total: totalQuestions }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('lessons.submitAnyway'),
            onPress: submitAttempt,
          },
        ]
      );
    } else {
      Alert.alert(
        t('lessons.submitConfirm'),
        t('lessons.submitConfirmMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('lessons.submit'),
            onPress: submitAttempt,
          },
        ]
      );
    }
  };

  const submitAttempt = async () => {
    try {
      setSubmitting(true);

      // حفظ الإجابة الحالية أولاً
      const currentQuestion = attempt?.questions[currentQuestionIndex];
      if (currentQuestion && selectedOptions[currentQuestion.id]) {
        await saveResponse(currentQuestion);
      }

      // تسليم المحاولة
      const response = await api.post<{
        ok: boolean;
        data: {
          raw_score: number;
          score_percentage: number;
          total_questions: number;
          correct_answers: number;
        };
      }>(API_ENDPOINTS.LESSON_ATTEMPT_SUBMIT(id));

      if (response && response.ok && response.data) {
        // الانتقال إلى صفحة النتائج
        Alert.alert(
          t('lessons.attemptCompleted'),
          t('lessons.yourScore', { score: response.data.score_percentage }),
          [
            {
              text: t('common.ok'),
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (err) {
      console.error('Error submitting attempt:', err);
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('lessons.errorSubmitting')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error || !attempt || !attempt.questions || attempt.questions.length === 0) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>
              {error || t('lessons.noQuestionsAvailable')}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>{t('common.goBack')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / attempt.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === attempt.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => {
              Alert.alert(
                t('lessons.exitAttempt'),
                t('lessons.exitAttemptMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('lessons.exit'), onPress: () => router.back() },
                ]
              );
            }}
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.questionCounter}>
              {t('lessons.questionCount', {
                current: currentQuestionIndex + 1,
                total: attempt.questions.length,
              })}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.exitButton} onPress={handleSubmit}>
            <MaterialIcons name="check" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card */}
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberText}>{currentQuestionIndex + 1}</Text>
              </View>
              <View style={styles.questionTypebadge}>
                <Text style={styles.questionTypeText}>
                  {currentQuestion.question_type === 'multiple_choice'
                    ? t('lessons.multipleChoice')
                    : t('lessons.singleChoice')}
                </Text>
              </View>
            </View>

            <Text style={[styles.questionText]}>
              {currentQuestion.question_text}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected =
                currentQuestion.question_type === 'multiple_choice'
                  ? (selectedOptions[currentQuestion.id] as number[] || []).includes(option.id)
                  : selectedOptions[currentQuestion.id] === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() =>
                    handleOptionSelect(
                      currentQuestion.id,
                      option.id,
                      currentQuestion.question_type === 'multiple_choice'
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                      {isSelected && (
                        <MaterialIcons name="check" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.optionText]}>
                      {option.option_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomContainer}>
          <View style={[styles.navigationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.navButton, isFirstQuestion && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={isFirstQuestion}
            >
              <MaterialIcons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={24}
                color={isFirstQuestion ? '#6b7280' : '#FFFFFF'}
              />
              <Text style={[styles.navButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                {t('lessons.previous')}
              </Text>
            </TouchableOpacity>

            {isLastQuestion ? (
              <GradientButton
                title={t('lessons.submit')}
                onPress={handleSubmit}
                loading={submitting}
                style={styles.submitButton}
                icon={<MaterialIcons name="check-circle" size={24} color="#FFFFFF" />}
              />
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>{t('lessons.next')}</Text>
                <MaterialIcons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  questionCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 4,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  questionNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  questionTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  questionTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: '#D4AF37',
  },
  optionContent: {
    alignItems: 'center',
    gap: 12,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  optionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(27, 54, 93, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navigationRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#6b7280',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
  },
});

