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
import { BlurView } from 'expo-blur';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

interface QuestionOption {
  id: number;
  content: string;
  option_label?: string;
  option_order?: number;
  is_correct: boolean;
}

interface Question {
  id: number;
  stem: string;
  explanation?: string;
  media_url?: string;
  options: QuestionOption[];
}

interface SavedQuestion {
  id: number;
  question_id: number;
  question: Question & {
    lesson: {
      id: number;
      title: string;
      track_id: number;
    };
  };
}

export default function PracticeQuestionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [savedQuestion, setSavedQuestion] = useState<SavedQuestion | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: SavedQuestion }>(
        API_ENDPOINTS.SAVED_QUESTION(id!)
      );
      
      if (response && response.ok && response.data) {
        setSavedQuestion(response.data);
        // Shuffle options
        const shuffled = [...response.data.question.options].sort(() => Math.random() - 0.5);
        setShuffledOptions(shuffled);
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل السؤال');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionId: number) => {
    if (answered) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption) {
      Alert.alert('تنبيه', 'الرجاء اختيار إجابة');
      return;
    }
    setAnswered(true);
  };

  const handleTryAgain = () => {
    setSelectedOption(null);
    setAnswered(false);
    // Re-shuffle options
    const shuffled = [...savedQuestion!.question.options].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
  };

  const getTrackColor = (trackId: number) => {
    switch (trackId) {
      case 1: return '#10B981';
      case 2: return '#3B82F6';
      case 3: return '#8B5CF6';
      default: return '#D4AF37';
    }
  };

  const isCorrectAnswer = (optionId: number) => {
    const option = shuffledOptions.find(opt => opt.id === optionId);
    return option?.is_correct || false;
  };

  if (loading || !savedQuestion) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const trackColor = getTrackColor(savedQuestion.question.lesson.track_id);
  const selectedIsCorrect = selectedOption ? isCorrectAnswer(selectedOption) : false;

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تدرب على السؤال</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Lesson Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <BlurView intensity={20} tint="dark" style={styles.lessonCard}>
              <View style={[styles.lessonBadge, { backgroundColor: `${trackColor}20`, borderColor: trackColor }]}>
                <MaterialIcons name="school" size={18} color={trackColor} />
                <Text style={[styles.lessonText, { color: trackColor }]}>
                  {savedQuestion.question.lesson.title}
                </Text>
              </View>
            </BlurView>
          </Animated.View>

          {/* Question */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <BlurView intensity={20} tint="dark" style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <MaterialIcons name="psychology" size={24} color="#3B82F6" />
                <Text style={styles.questionLabel}>اختبر نفسك</Text>
              </View>
              <Text style={styles.questionText}>{savedQuestion.question.stem}</Text>
            </BlurView>
          </Animated.View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedOption === option.id;
              const showCorrect = answered && option.is_correct;
              const showWrong = answered && isSelected && !option.is_correct;

              return (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.duration(400).delay(300 + index * 100)}
                >
                  <TouchableOpacity
                    onPress={() => handleOptionSelect(option.id)}
                    disabled={answered}
                    activeOpacity={0.7}
                  >
                    <BlurView
                      intensity={20}
                      tint="dark"
                      style={[
                        styles.optionCard,
                        isSelected && !answered && styles.optionCardSelected,
                        showCorrect && styles.optionCardCorrect,
                        showWrong && styles.optionCardWrong,
                      ]}
                    >
                      <View style={styles.optionContent}>
                        <View style={[
                          styles.optionCircle,
                          isSelected && !answered && styles.optionCircleSelected,
                          showCorrect && styles.optionCircleCorrect,
                          showWrong && styles.optionCircleWrong,
                        ]}>
                          {showCorrect ? (
                            <MaterialIcons name="check" size={20} color="#FFFFFF" />
                          ) : showWrong ? (
                            <MaterialIcons name="close" size={20} color="#FFFFFF" />
                          ) : (
                            <Text style={[
                              styles.optionLabel,
                              isSelected && !answered && styles.optionLabelSelected,
                            ]}>
                              {String.fromCharCode(65 + index)}
                            </Text>
                          )}
                        </View>
                        <Text style={[
                          styles.optionText,
                          (showCorrect || (isSelected && !answered)) && styles.optionTextHighlight,
                        ]}>
                          {option.content}
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Result Card */}
          {answered && (
            <Animated.View entering={ZoomIn.duration(500).springify()}>
              <BlurView
                intensity={30}
                tint="dark"
                style={[
                  styles.resultCard,
                  selectedIsCorrect ? styles.resultCardCorrect : styles.resultCardWrong,
                ]}
              >
                <View style={[
                  styles.resultIcon,
                  { backgroundColor: selectedIsCorrect ? '#10B981' : '#EF4444' },
                ]}>
                  <MaterialIcons
                    name={selectedIsCorrect ? 'check-circle' : 'cancel'}
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.resultTitle}>
                  {selectedIsCorrect ? 'أحسنت! إجابة صحيحة' : 'إجابة خاطئة'}
                </Text>
                <Text style={styles.resultDescription}>
                  {selectedIsCorrect
                    ? 'لقد أجبت بشكل صحيح، استمر في التقدم!'
                    : 'راجع الشرح أدناه لفهم الإجابة الصحيحة'}
                </Text>
              </BlurView>
            </Animated.View>
          )}

          {/* Explanation (only shown after answering) */}
          {answered && savedQuestion.question.explanation && (
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <BlurView intensity={20} tint="dark" style={styles.explanationCard}>
                <View style={styles.explanationHeader}>
                  <MaterialIcons name="lightbulb" size={24} color="#F59E0B" />
                  <Text style={styles.explanationLabel}>الشرح</Text>
                </View>
                <Text style={styles.explanationText}>{savedQuestion.question.explanation}</Text>
              </BlurView>
            </Animated.View>
          )}

          {/* Action Buttons */}
          {!answered ? (
            <TouchableOpacity
              style={[styles.submitButton, !selectedOption && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedOption}
            >
              <MaterialIcons name="send" size={22} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>تأكيد الإجابة</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
                <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>حاول مرة أخرى</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
                <MaterialIcons name="home" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>العودة</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  lessonCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
  },
  lessonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  lessonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    gap: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  questionText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#FFFFFF',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(143, 164, 192, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
  },
  optionCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  optionCardCorrect: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  optionCardWrong: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCircleSelected: {
    backgroundColor: '#3B82F6',
  },
  optionCircleCorrect: {
    backgroundColor: '#10B981',
  },
  optionCircleWrong: {
    backgroundColor: '#EF4444',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  optionTextHighlight: {
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 12,
  },
  resultCardCorrect: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  resultCardWrong: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 15,
    color: '#8FA4C0',
    textAlign: 'center',
    lineHeight: 22,
  },
  explanationCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    gap: 16,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  explanationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(143, 164, 192, 0.3)',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tryAgainButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  backHomeButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

