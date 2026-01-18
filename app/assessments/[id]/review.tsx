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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  // skill_name and mastery_level removed - using lessons only
}

interface QuestionReview {
  question_id: number;
  stem: string;
  media_url?: string;
  has_image?: boolean;
  image_path?: string;
  image_url?: string;
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
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  
  const [review, setReview] = useState<AssessmentReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const navigatorScrollViewRef = useRef<ScrollView>(null);
  const itemLayoutsRef = useRef<Map<number, { x: number; width: number }>>(new Map());

  useEffect(() => {
    fetchReview();
    // Reset to first question when review is loaded
    setSelectedQuestionIndex(0);
  }, [attemptId]);

  // Scroll to first question when review is loaded (in RTL, first question is on the right)
  useEffect(() => {
    if (review && review.questions.length > 0 && navigatorScrollViewRef.current) {
      // Wait for layout to be measured, then scroll to first question (index 0)
      // Use the same logic as the scroll-to-current-question effect
      const scrollToFirst = () => {
        const screenWidth = Dimensions.get('window').width;
        const itemLayout = itemLayoutsRef.current.get(0); // First question (index 0)
        
        if (itemLayout) {
          // Use measured position for first question
          const centerOffset = screenWidth / 2 - itemLayout.width / 2;
          const scrollPosition = itemLayout.x - centerOffset;
          
          navigatorScrollViewRef.current?.scrollTo({
            x: Math.max(0, scrollPosition),
            animated: false,
          });
        } else {
          // Fallback: estimate position for first question
          const itemWidth = 60; // Estimated width
          const gap = 12;
          const firstQuestionPosition = 0; // First question starts at position 0
          const centerOffset = screenWidth / 2 - itemWidth / 2;
          const scrollPosition = firstQuestionPosition - centerOffset;
          
          navigatorScrollViewRef.current?.scrollTo({
            x: Math.max(0, scrollPosition),
            animated: false,
          });
        }
      };
      
      // Try multiple times to ensure layout is measured
      setTimeout(scrollToFirst, 100);
      setTimeout(scrollToFirst, 300);
      setTimeout(scrollToFirst, 500);
    }
  }, [review]);

  // Scroll to current question in navigator
  useEffect(() => {
    if (review && review.questions.length > 0 && navigatorScrollViewRef.current) {
      const screenWidth = Dimensions.get('window').width;
      
      // Try to use measured layout if available
      const itemLayout = itemLayoutsRef.current.get(selectedQuestionIndex);
      
      if (itemLayout) {
        // Use measured position
        const centerOffset = screenWidth / 2 - itemLayout.width / 2;
        const scrollPosition = itemLayout.x - centerOffset;
        
        setTimeout(() => {
          navigatorScrollViewRef.current?.scrollTo({
            x: Math.max(0, scrollPosition),
            animated: true,
          });
        }, 100);
      } else {
        // Fallback to estimated position
        const itemWidth = 50;
        const gap = 12;
        const itemPosition = selectedQuestionIndex * (itemWidth + gap);
        const centerOffset = screenWidth / 2 - itemWidth / 2;
        const scrollPosition = itemPosition - centerOffset;
        
        setTimeout(() => {
          navigatorScrollViewRef.current?.scrollTo({
            x: Math.max(0, scrollPosition),
            animated: true,
          });
        }, 150);
      }
    }
  }, [selectedQuestionIndex, review]);

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
        <View style={styles.navigatorContainer} collapsable={false}>
          <ScrollView
            ref={navigatorScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.navigatorContent, { paddingTop: 8, paddingBottom: 8 }]}
            style={{ overflow: 'visible' }}
            onContentSizeChange={() => {
              // When content size changes, scroll to first question
              if (review && review.questions.length > 0 && selectedQuestionIndex === 0) {
                setTimeout(() => {
                  const screenWidth = Dimensions.get('window').width;
                  const itemLayout = itemLayoutsRef.current.get(0);
                  
                  if (itemLayout) {
                    const centerOffset = screenWidth / 2 - itemLayout.width / 2;
                    const scrollPosition = itemLayout.x - centerOffset;
                    navigatorScrollViewRef.current?.scrollTo({
                      x: Math.max(0, scrollPosition),
                      animated: false,
                    });
                  }
                }, 100);
              }
            }}
          >
            {review.questions.map((q, index) => {
              const isActive = index === selectedQuestionIndex;
              const borderColor = q.is_correct ? '#10B981' : '#EF4444';
              const innerBgColor = q.is_correct ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
              const questionNumber = index + 1;
              
              return (
                <View 
                  key={q.question_id} 
                  style={styles.navItemWrapper}
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    itemLayoutsRef.current.set(index, { x, width });
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      { 
                        backgroundColor: innerBgColor,
                        borderColor: borderColor,
                        borderWidth: 2.5,
                        transform: isActive ? [{ scale: 1.08 }] : [{ scale: 1 }],
                        shadowColor: borderColor,
                        shadowOpacity: isActive ? 0.7 : 0.2,
                        shadowRadius: isActive ? 15 : 4,
                        shadowOffset: { width: 0, height: isActive ? 6 : 2 },
                        elevation: isActive ? 12 : 4,
                        marginTop: isActive ? 8 : 0,
                        marginBottom: isActive ? 8 : 0,
                      }
                    ]}
                    onPress={() => setSelectedQuestionIndex(index)}
                  >
                    <Text style={[styles.navItemText, { 
                      fontWeight: isActive ? '700' : '600',
                      color: borderColor,
                      zIndex: 1,
                    }]}>{questionNumber}</Text>
                    {q.is_correct ? (
                      <MaterialIcons name="check" size={16} color={borderColor} style={{ zIndex: 1 }} />
                    ) : (
                      <MaterialIcons name="close" size={16} color={borderColor} style={{ zIndex: 1 }} />
                    )}
                  </TouchableOpacity>
                  {q.time_spent_sec !== undefined && q.time_spent_sec > 0 && (
                    <View style={[styles.navTimeLabel, { borderColor: isActive ? '#D4AF37' : 'rgba(255, 255, 255, 0.2)' }]}>
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
              <View style={[styles.questionNumberBadge, { backgroundColor: `${trackColors.primary}25`, borderColor: trackColors.primary }]}>
                <Text style={[styles.questionNumber, { color: trackColors.primary }]}>
                  {selectedQuestionIndex + 1}
                </Text>
              </View>
              <View>
                <Text style={styles.questionNumberLabel}>السؤال رقم</Text>
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
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: currentQuestion.is_correct ? 'rgba(16, 185, 129, 0.2)' : '#EF444420', borderColor: currentQuestion.is_correct ? '#10B981' : '#EF4444' }
            ]}>
              <MaterialIcons 
                name={currentQuestion.is_correct ? "check-circle" : "cancel"} 
                size={18} 
                color={currentQuestion.is_correct ? '#10B981' : '#EF4444'} 
              />
              <Text style={[
                styles.statusText,
                { color: currentQuestion.is_correct ? '#10B981' : '#EF4444' }
              ]}>
                {currentQuestion.is_correct ? 'إجابة صحيحة' : currentQuestion.selected_option_id ? 'إجابة خاطئة' : 'غير مجاب'}
              </Text>
            </View>
          </View>

          {/* Question Content */}
          <View style={styles.questionCard}>
            <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left', color: '#FFFFFF' }]}>
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
                
                let borderColor = 'rgba(255, 255, 255, 0.4)';
                let bgColor = 'rgba(50, 50, 70, 0.4)';
                
                if (isCorrectAnswer) {
                  borderColor = '#10B981';
                  bgColor = 'rgba(16, 185, 129, 0.2)';
                } else if (isUserAnswer && !isCorrectAnswer) {
                  borderColor = '#EF4444';
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                }
                
                return (
                  <View
                    key={option.id}
                    style={[
                      styles.optionCardWrapper,
                      isUserAnswer && styles.optionCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.optionCard,
                        { 
                          borderColor,
                          backgroundColor: bgColor,
                        },
                      ]}
                    >
                    <View style={[styles.optionContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
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
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {isUserAnswer && isCorrectAnswer && (
                          <View style={[styles.answerBadge, { 
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: '#10B981',
                          }]}>
                            <MaterialIcons name="check-circle" size={16} color="#10B981" />
                            <Text style={[styles.answerBadgeText, { color: '#10B981' }]}>
                              إجابتك
                            </Text>
                          </View>
                        )}
                        {isUserAnswer && !isCorrectAnswer && (
                          <View style={[styles.answerBadge, { 
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            borderColor: '#EF4444',
                          }]}>
                            <MaterialIcons name="close" size={16} color="#EF4444" />
                            <Text style={[styles.answerBadgeText, { color: '#EF4444' }]}>
                              إجابتك
                            </Text>
                          </View>
                        )}
                        {!isUserAnswer && isCorrectAnswer && (
                          <View style={[styles.answerBadge, { 
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: '#10B981',
                          }]}>
                            <MaterialIcons name="check-circle" size={16} color="#10B981" />
                            <Text style={[styles.answerBadgeText, { color: '#10B981' }]}>
                              الإجابة الصحيحة
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
                );
              })}
          </View>

          {/* Explanation - شرح الإجابة أولاً */}
          {currentQuestion.explanation && (
            <View style={[styles.explanationCard, { borderColor: `${trackColors.primary}40` }]}>
              <View style={[styles.explanationHeader, { flexDirection: isRTL ? 'row' : 'row' }]}>
                <MaterialIcons name="lightbulb" size={20} color={trackColors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.explanationTitle, { textAlign: textAlign }]}>شرح الإجابة</Text>
                </View>
              </View>
              <View style={{ width: '100%' }}>
                <Text style={[styles.explanationText, { 
                  textAlign: textAlign,
                }]}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            </View>
          )}

          {/* Selection Reason - لماذا اخترنا هذا السؤال */}
          {currentQuestion.selection_reason && currentQuestion.selection_reason.reason_text && (
            <View style={[styles.selectionReasonCard, { borderColor: `${trackColors.primary}40`, backgroundColor: `${trackColors.primary}10` }]}>
              <View style={[styles.selectionReasonHeader, { flexDirection: isRTL ? 'row' : 'row' }]}>
                <MaterialIcons name="lightbulb-outline" size={22} color={trackColors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectionReasonTitle, { color: trackColors.primary, textAlign: textAlign }]}>{t('assessments.review.selectionReason.title')}</Text>
                </View>
              </View>
              
              <View style={{ width: '100%' }}>
                <Text style={[styles.selectionReasonText, { 
                  textAlign: textAlign,
                }]}>
                  {currentQuestion.selection_reason.reason_text}
                </Text>
              </View>
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
                name={isRTL ? "arrow-back" : "arrow-forward"} 
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
                name={isRTL ? "arrow-forward" : "arrow-back"} 
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
    overflow: 'visible',
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
    overflow: 'visible',
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
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 12,
    marginBottom: 4,
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
  },
  navigatorBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navigatorContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  navItemWrapper: {
    alignItems: 'center',
    gap: 4,
    overflow: 'visible',
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
    borderWidth: 2.5,
    position: 'relative',
    overflow: 'visible',
  },
  navItemText: {
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
  questionNumberBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  questionNumberLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 4,
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
  optionCardWrapper: {
    borderRadius: 14,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    borderRadius: 14,
    padding: 0,
  },
  optionCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
  inlineLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  answerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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

