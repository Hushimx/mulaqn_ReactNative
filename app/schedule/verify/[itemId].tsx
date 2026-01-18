import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GradientButton } from '@/components/ui/GradientButton';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInDown, FadeInUp, ZoomIn, BounceIn } from 'react-native-reanimated';

interface Question {
  id?: number;
  stem: string;
  options: Array<{ id?: number; text: string; order?: number; content?: string }>;
}

export default function VerifyQuestionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const itemId = parseInt(params.itemId as string);
  const trackId = params.trackId ? parseInt(params.trackId as string) : null;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hasSecondChance, setHasSecondChance] = useState(false);
  const [showFailureReason, setShowFailureReason] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  useEffect(() => {
    fetchQuestion();
  }, [itemId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      
      // محاولة جلب السؤال من params أولاً (إذا تم تمريره من صفحة completion)
      if (params.questionData) {
        try {
          const questionData = JSON.parse(params.questionData as string);
          if (questionData && questionData.question) {
            const q = questionData.question;
            setQuestion({
              id: q.id,
              stem: q.stem,
              options: q.options || [],
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing question data:', e);
        }
      }
      
      // إذا لم يكن السؤال في params، نحاول جلب السؤال من schedule item
      // (يجب أن يكون السؤال قد تم جلبه عند الضغط على "إتمام" في الصفحة السابقة)
      Alert.alert(
        'تنبيه', 
        'لم يتم العثور على سؤال التحقق. يرجى العودة والضغط على "إتمام" مرة أخرى.',
        [
          { text: 'حسناً', onPress: () => router.back() }
        ]
      );
    } catch (err: any) {
      console.error('Error fetching question:', err);
      Alert.alert('خطأ', err.message || 'فشل تحميل السؤال');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedOption === null) {
      Alert.alert('تنبيه', 'يرجى اختيار إجابة');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.post<{ 
        ok: boolean; 
        data: { 
          correct: boolean; 
          attempts: number; 
          has_second_chance: boolean;
          item: any;
        } 
      }>(
        API_ENDPOINTS.SCHEDULE_ITEM_VERIFY(itemId),
        { answer: selectedOption }
      );

      if (response && response.ok && response.data) {
        const result = response.data;
        const correct = result.correct;
        const newAttempts = result.attempts;
        const has_second_chance = result.has_second_chance;
        
        setAttempts(newAttempts);
        setHasSecondChance(has_second_chance);
        setIsCorrect(correct);

        if (correct) {
          setTimeout(() => {
            Alert.alert('✅ صح!', 'تم إتمام الدرس بنجاح', [
              { 
                text: 'حسناً', 
                onPress: () => {
                  // العودة لصفحة completion لعرض رسالة النجاح
                  router.back();
                }
              },
            ]);
          }, 500);
        } else if (has_second_chance) {
          Alert.alert('❌ خطأ', 'فرصة أخيرة', [
            { text: 'حسناً', onPress: () => {
              setSelectedOption(null);
              setIsCorrect(null);
            }},
          ]);
        } else {
          setShowFailureReason(true);
        }
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ أثناء التحقق');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFailureReason = async () => {
    if (!failureReason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة السبب');
      return;
    }

    try {
      Alert.alert('نجح', 'تم حفظ السبب', [
        { 
          text: 'حسناً', 
          onPress: () => {
            // العودة لصفحة completion لعرض رسالة الفشل
            router.back();
          }
        },
      ]);
    } catch (err: any) {
      Alert.alert('خطأ', 'فشل حفظ السبب');
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

  if (showFailureReason) {
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
            <Text style={[styles.headerTitle, { textAlign }]}>سبب الفشل</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <Animated.View entering={ZoomIn.duration(500)} style={[styles.failureContainer, { borderColor: `${trackColor}30` }]}>
              <View style={[styles.failureIconContainer, { backgroundColor: `${trackColor}20` }]}>
                <MaterialIcons name="error-outline" size={64} color="#EF4444" />
              </View>
              <Text style={[styles.failureTitle, { textAlign }]}>
                لم تتمكن من الإجابة بشكل صحيح
              </Text>
              <Text style={[styles.failureSubtitle, { textAlign }]}>
                اكتب لنا السبب وما تشعر أنك تحتاجه
              </Text>

              <TextInput
                style={[styles.failureInput, { textAlign, borderColor: `${trackColor}30` }]}
                placeholder="اكتب السبب..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={failureReason}
                onChangeText={setFailureReason}
                multiline
                numberOfLines={6}
              />

              <GradientButton
                title="حفظ"
                onPress={handleSaveFailureReason}
                style={styles.saveButton}
                colors={['#EF4444', '#DC2626']}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

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
          <Text style={[styles.headerTitle, { textAlign }]}>سؤال التحقق</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {question && (
            <>
              <Animated.View entering={FadeInDown.duration(500)} style={[styles.questionCard, { borderColor: `${trackColor}40` }]}>
                <View style={[styles.questionIconContainer, { backgroundColor: `${trackColor}20` }]}>
                  <MaterialIcons name="quiz" size={32} color={trackColor} />
                </View>
                <Text style={[styles.questionStem, { textAlign }]}>
                  {question.stem}
                </Text>
              </Animated.View>

              <View style={styles.optionsContainer}>
                {question.options.map((option, index) => {
                  const isSelected = selectedOption === (option.id || index);
                  const showCorrect = isCorrect === true && isSelected;
                  const showIncorrect = isCorrect === false && isSelected;
                  
                  return (
                    <Animated.View
                      key={option.id || index}
                      entering={FadeInUp.duration(400).delay(index * 100)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.optionCard,
                          isSelected && { 
                            backgroundColor: `${trackColor}20`,
                            borderColor: trackColor,
                            borderWidth: 2,
                          },
                          showCorrect && {
                            backgroundColor: '#10B98120',
                            borderColor: '#10B981',
                          },
                          showIncorrect && {
                            backgroundColor: '#EF444420',
                            borderColor: '#EF4444',
                          },
                          { flexDirection }
                        ]}
                        onPress={() => {
                          if (isCorrect === null) {
                            setSelectedOption(option.id || index);
                          }
                        }}
                        activeOpacity={0.7}
                        disabled={isCorrect !== null}
                      >
                        <View style={[
                          styles.optionRadio,
                          isSelected && { borderColor: trackColor },
                          showCorrect && { borderColor: '#10B981' },
                          showIncorrect && { borderColor: '#EF4444' },
                        ]}>
                          {isSelected && (
                            <Animated.View 
                              entering={BounceIn.duration(300)}
                              style={[
                                styles.optionRadioInner,
                                { backgroundColor: showCorrect ? '#10B981' : showIncorrect ? '#EF4444' : trackColor }
                              ]} 
                            />
                          )}
                        </View>
                        <Text style={[styles.optionText, { textAlign, flex: 1 }]}>
                          {option.text}
                        </Text>
                        {showCorrect && (
                          <MaterialIcons name="check-circle" size={24} color="#10B981" />
                        )}
                        {showIncorrect && (
                          <MaterialIcons name="cancel" size={24} color="#EF4444" />
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>

              {hasSecondChance && (
                <Animated.View entering={FadeInDown.duration(500)} style={styles.warningContainer}>
                  <MaterialIcons name="warning" size={24} color="#F59E0B" />
                  <Text style={[styles.warningText, { textAlign }]}>
                    هذه فرصتك الأخيرة
                  </Text>
                </Animated.View>
              )}

              {isCorrect === null && (
                <GradientButton
                  title="إرسال"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={selectedOption === null}
                  style={styles.submitButton}
                  colors={[trackColor, `${trackColor}CC`]}
                />
              )}
            </>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    alignItems: 'center',
  },
  questionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionStem: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    fontSize: 15,
    color: '#F59E0B',
    fontWeight: '600',
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
  failureContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
  },
  failureIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  failureTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
  },
  failureSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
    lineHeight: 24,
  },
  failureInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
  },
  saveButton: {
    width: '100%',
  },
});
