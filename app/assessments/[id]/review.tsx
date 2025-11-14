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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface QuestionOption {
  id: number;
  label?: string;
  content: string;
  option_text?: string;
  option_order?: number;
  is_correct: boolean;
}

interface SelectionReason {
  reason: 'unknown' | 'weak' | 'moderate' | 'strong';
  reason_text: string;
  lesson_name?: string;
  skill_name?: string;
  mastery_level?: string;
}

interface QuestionReview {
  question_id: number;
  stem: string;
  media_url?: string;
  explanation?: string;
  options: QuestionOption[];
  selected_option_id?: number;
  user_answer_id?: number;
  correct_answer_id?: number;
  is_correct: boolean;
  time_spent_sec?: number;
  selection_reason?: SelectionReason;
}

interface AssessmentReview {
  attempt_id: number;
  assessment_name: string;
  track_id: number;
  questions: QuestionReview[];
}

export default function AssessmentReviewScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  
  const [review, setReview] = useState<AssessmentReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  useEffect(() => {
    fetchReview();
  }, [attemptId]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: AssessmentReview }>(
        API_ENDPOINTS.ASSESSMENT_REVIEW(attemptId!)
      );
      
      if (response && response.ok && response.data) {
        setReview(response.data);
      }
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}ث`;
  };

  if (loading || !review) {
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

  const trackColors = getTrackColors(review.track_id);
  const currentQuestion = review.questions[selectedQuestionIndex];

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <MaterialIcons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>مراجعة الإجابات</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Question Navigator */}
        <View style={styles.navigatorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigatorContent}
          >
            {review.questions.map((q, index) => {
              const isActive = index === selectedQuestionIndex;
              const bgColor = q.is_correct ? '#10B981' : '#EF4444';
              
              return (
                <View key={q.question_id} style={styles.navItemWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      { 
                        backgroundColor: bgColor,
                        opacity: isActive ? 1 : 0.8,
                        borderColor: isActive ? '#FFFFFF' : 'transparent',
                        borderWidth: isActive ? 2.5 : 0,
                        transform: isActive ? [{ scale: 1.05 }] : [{ scale: 1 }],
                      }
                    ]}
                    onPress={() => setSelectedQuestionIndex(index)}
                  >
                    <Text style={[styles.navItemText, { fontWeight: isActive ? '700' : '600' }]}>{index + 1}</Text>
                    {q.is_correct ? (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    ) : (
                      <MaterialIcons name="close" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                  {q.time_spent_sec !== undefined && q.time_spent_sec > 0 && (
                    <View style={[styles.navTimeLabel, { borderColor: isActive ? trackColors.primary : 'rgba(255, 255, 255, 0.2)' }]}>
                      <Text style={styles.navTimeText}>{formatTime(q.time_spent_sec)}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Header */}
          <View style={styles.questionHeader}>
            <View style={styles.questionHeaderLeft}>
              <Text style={styles.questionNumber}>السؤال {selectedQuestionIndex + 1}</Text>
              {currentQuestion.time_spent_sec !== undefined && currentQuestion.time_spent_sec > 0 && (
                <View style={[
                  styles.timeBadge,
                  { backgroundColor: `${trackColors.primary}20`, borderColor: `${trackColors.primary}60` }
                ]}>
                  <MaterialIcons name="access-time" size={14} color={trackColors.primary} />
                  <Text style={[styles.timeText, { color: trackColors.primary }]}>
                    {formatTime(currentQuestion.time_spent_sec)}
                  </Text>
                </View>
              )}
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: currentQuestion.is_correct ? 'rgba(16, 185, 129, 0.2)' : '#EF444420', borderColor: currentQuestion.is_correct ? '#10B981' : '#EF4444' }
            ]}>
              <MaterialIcons 
                name={currentQuestion.is_correct ? "check-circle" : "cancel"} 
                size={16} 
                color={currentQuestion.is_correct ? '#10B981' : '#EF4444'} 
              />
              <Text style={[
                styles.statusText,
                { color: currentQuestion.is_correct ? '#10B981' : '#EF4444' }
              ]}>
                {currentQuestion.is_correct ? 'إجابة صحيحة' : 'إجابة خاطئة'}
              </Text>
            </View>
          </View>

          {/* Question Content */}
          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left', color: '#FFFFFF' }]}>
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

          {/* Options Review */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options
              .sort((a, b) => (a.option_order || 0) - (b.option_order || 0))
              .map((option, index) => {
                const userAnswerId = currentQuestion.selected_option_id || currentQuestion.user_answer_id;
                const isUserAnswer = option.id === userAnswerId;
                const isCorrectAnswer = option.is_correct === true;
                
                // Get option text
                const optionText = option.content || option.option_text || option.label || 'خيار غير متوفر';
                
                // Debug log
                console.log(`Option ${index + 1}:`, {
                  content: option.content,
                  option_text: option.option_text,
                  label: option.label,
                  text: optionText,
                  id: option.id,
                  isCorrect: option.is_correct,
                  isUserAnswer,
                  isCorrectAnswer
                });
                
                let borderColor = 'rgba(255, 255, 255, 0.4)';
                let bgColor = 'rgba(50, 50, 70, 0.4)';
                let iconName: any = null;
                let iconColor = '#FFFFFF';
                
                if (isCorrectAnswer) {
                  borderColor = '#10B981';
                  bgColor = 'rgba(16, 185, 129, 0.25)';
                  iconName = 'check-circle';
                  iconColor = '#10B981';
                } else if (isUserAnswer && !isCorrectAnswer) {
                  borderColor = '#EF4444';
                  bgColor = 'rgba(239, 68, 68, 0.25)';
                  iconName = 'cancel';
                  iconColor = '#EF4444';
                }
                
                return (
                  <View
                    key={option.id}
                      style={[
                      styles.optionCard,
                      { 
                        borderColor,
                        backgroundColor: bgColor,
                      },
                    ]}
                  >
                    <View style={[styles.optionContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
                        {option.label && (
                          <Text style={[styles.optionLabel, { color: '#D4AF37' }]}>
                            {option.label}.
                          </Text>
                        )}
                        <Text style={[
                          styles.optionText,
                          { 
                            flex: 1,
                            textAlign: isRTL ? 'right' : 'left',
                            color: '#FFFFFF',
                          }
                        ]}>
                          {option.content || optionText}
                        </Text>
                      </View>
                      
                      {iconName && (
                        <MaterialIcons name={iconName} size={26} color={iconColor} />
                      )}
                    </View>
                    
                    {isUserAnswer && !isCorrectAnswer && (
                      <View style={[styles.label, { backgroundColor: '#EF444420' }]}>
                        <Text style={[styles.labelText, { color: '#EF4444' }]}>
                          إجابتك
                        </Text>
                      </View>
                    )}
                    
                    {isCorrectAnswer && (
                      <View style={[styles.label, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                        <Text style={[styles.labelText, { color: '#10B981' }]}>
                          الإجابة الصحيحة
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>

          {/* Selection Reason - لماذا اخترنا هذا السؤال */}
          {currentQuestion.selection_reason && currentQuestion.selection_reason.reason_text && (
            <View style={[styles.selectionReasonCard, { borderColor: `${trackColors.primary}40`, backgroundColor: `${trackColors.primary}10` }]}>
              <View style={[styles.selectionReasonHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialIcons name="lightbulb-outline" size={22} color={trackColors.primary} />
                <Text style={[styles.selectionReasonTitle, { color: trackColors.primary }]}>{t('assessments.review.selectionReason.title')}</Text>
              </View>
              
              <Text style={[styles.selectionReasonText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {currentQuestion.selection_reason.reason_text}
              </Text>
            </View>
          )}

          {/* Explanation */}
          {currentQuestion.explanation && (
            <View style={[styles.explanationCard, { borderColor: `${trackColors.primary}40` }]}>
              <View style={[styles.explanationHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialIcons name="lightbulb" size={20} color={trackColors.primary} />
                <Text style={styles.explanationTitle}>شرح الإجابة</Text>
              </View>
              <Text style={[styles.explanationText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={[styles.navigationButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { 
                  backgroundColor: selectedQuestionIndex === 0 ? 'rgba(255, 255, 255, 0.1)' : `${trackColors.primary}80`,
                  borderColor: selectedQuestionIndex === 0 ? 'rgba(255, 255, 255, 0.2)' : trackColors.primary,
                },
                selectedQuestionIndex === 0 && styles.navButtonDisabled
              ]}
              onPress={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
              disabled={selectedQuestionIndex === 0}
            >
              <MaterialIcons 
                name={isRTL ? "arrow-forward" : "arrow-back"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.navButtonText}>السابق</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                { 
                  backgroundColor: selectedQuestionIndex === review.questions.length - 1 ? 'rgba(255, 255, 255, 0.1)' : trackColors.primary,
                  borderColor: selectedQuestionIndex === review.questions.length - 1 ? 'rgba(255, 255, 255, 0.2)' : trackColors.primary,
                },
                selectedQuestionIndex === review.questions.length - 1 && styles.navButtonDisabled
              ]}
              onPress={() => setSelectedQuestionIndex(Math.min(review.questions.length - 1, selectedQuestionIndex + 1))}
              disabled={selectedQuestionIndex === review.questions.length - 1}
            >
              <Text style={styles.navButtonText}>التالي</Text>
              <MaterialIcons 
                name={isRTL ? "arrow-back" : "arrow-forward"} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
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
  navigatorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  navigatorContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  navItemWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    justifyContent: 'center',
  },
  navItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  navTimeLabel: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navTimeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  questionNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: 'rgba(50, 50, 70, 0.5)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  questionImage: {
    width: '100%',
    height: 200,
    marginTop: 16,
    borderRadius: 12,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 2,
    minHeight: 70,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionLabel: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 30,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  label: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectionReasonCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  selectionReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  selectionReasonTitle: {
    color: '#D4AF37',
    fontSize: 17,
    fontWeight: '700',
  },
  lessonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  lessonBadgeText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  selectionReasonText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  explanationCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  explanationTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  explanationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 22,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});

