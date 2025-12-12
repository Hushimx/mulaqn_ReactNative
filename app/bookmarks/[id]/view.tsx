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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
  note?: string;
  pinned: boolean;
  importance: 'low' | 'med' | 'high';
  created_at: string;
  question: Question & {
    lesson: {
      id: number;
      title: string;
      track_id: number;
      track?: { name: string; };
    };
  };
}

export default function ViewQuestionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [savedQuestion, setSavedQuestion] = useState<SavedQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [editNoteVisible, setEditNoteVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

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
        setNoteText(response.data.note || '');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل السؤال');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      setSaving(true);
      await api.put(API_ENDPOINTS.UPDATE_SAVED_QUESTION(id!), {
        note: noteText,
      });
      
      if (savedQuestion) {
        setSavedQuestion({
          ...savedQuestion,
          note: noteText,
        });
      }
      
      setEditNoteVisible(false);
      Alert.alert('تم', 'تم حفظ الملاحظة بنجاح');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الملاحظة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'حذف السؤال',
      'هل أنت متأكد من حذف هذا السؤال من المحفوظات؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(API_ENDPOINTS.DELETE_SAVED_QUESTION(id!));
              Alert.alert('تم', 'تم حذف السؤال بنجاح');
              router.back();
            } catch (error) {
              console.error('Error deleting question:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف السؤال');
            }
          },
        },
      ]
    );
  };

  const getTrackColor = (trackId: number) => {
    switch (trackId) {
      case 1: return '#10B981';
      case 2: return '#3B82F6';
      case 3: return '#8B5CF6';
      default: return '#D4AF37';
    }
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
  const correctOption = savedQuestion.question.options.find(opt => opt.is_correct);

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>عرض السؤال</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <MaterialIcons name="delete" size={24} color="#EF4444" />
          </TouchableOpacity>
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
                <MaterialIcons name="help-outline" size={24} color="#D4AF37" />
                <Text style={styles.questionLabel}>السؤال</Text>
              </View>
              <Text style={styles.questionText}>{savedQuestion.question.stem}</Text>
            </BlurView>
          </Animated.View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {savedQuestion.question.options
              .sort((a, b) => (a.option_order || 0) - (b.option_order || 0))
              .map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.duration(400).delay(300 + index * 100)}
                >
                  <BlurView
                    intensity={20}
                    tint="dark"
                    style={[
                      styles.optionCard,
                      option.is_correct && styles.optionCardCorrect,
                    ]}
                  >
                    <View style={styles.optionContent}>
                      <View style={[
                        styles.optionCircle,
                        option.is_correct && styles.optionCircleCorrect,
                      ]}>
                        {option.is_correct ? (
                          <MaterialIcons name="check" size={20} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.optionLabel}>
                            {option.option_label || String.fromCharCode(65 + index)}
                          </Text>
                        )}
                      </View>
                      <Text style={[
                        styles.optionText,
                        option.is_correct && styles.optionTextCorrect,
                      ]}>
                        {option.content}
                      </Text>
                    </View>
                    {option.is_correct && (
                      <View style={styles.correctBadge}>
                        <Text style={styles.correctBadgeText}>الإجابة الصحيحة</Text>
                      </View>
                    )}
                  </BlurView>
                </Animated.View>
              ))}
          </View>

          {/* Explanation */}
          {savedQuestion.question.explanation && (
            <Animated.View entering={FadeInDown.duration(400).delay(600)}>
              <BlurView intensity={20} tint="dark" style={styles.explanationCard}>
                <View style={styles.explanationHeader}>
                  <MaterialIcons name="lightbulb" size={24} color="#F59E0B" />
                  <Text style={styles.explanationLabel}>الشرح</Text>
                </View>
                <Text style={styles.explanationText}>{savedQuestion.question.explanation}</Text>
              </BlurView>
            </Animated.View>
          )}

          {/* Note Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(700)}>
            <BlurView intensity={20} tint="dark" style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={styles.noteHeaderLeft}>
                  <MaterialIcons name="note" size={24} color="#D4AF37" />
                  <Text style={styles.noteLabel}>ملاحظتي</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditNoteVisible(true)}
                  style={styles.editButton}
                >
                  <MaterialIcons name="edit" size={20} color="#D4AF37" />
                </TouchableOpacity>
              </View>
              {savedQuestion.note ? (
                <Text style={styles.noteText}>{savedQuestion.note}</Text>
              ) : (
                <Text style={styles.noNoteText}>لا توجد ملاحظة</Text>
              )}
            </BlurView>
          </Animated.View>
        </ScrollView>

        {/* Edit Note Modal */}
        <Modal
          visible={editNoteVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditNoteVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setEditNoteVisible(false)}
              activeOpacity={1}
            />
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>تعديل الملاحظة</Text>
                <TouchableOpacity onPress={() => setEditNoteVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#8FA4C0" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="اكتب ملاحظتك هنا..."
                placeholderTextColor="#8FA4C0"
                multiline
                textAlign="right"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveNote}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>حفظ</Text>
                  </>
                )}
              </TouchableOpacity>
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
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
    color: '#D4AF37',
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
  optionCardCorrect: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
  optionCircleCorrect: {
    backgroundColor: '#10B981',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  optionTextCorrect: {
    fontWeight: '600',
  },
  correctBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  correctBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  noteCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    gap: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  noNoteText: {
    fontSize: 15,
    color: '#8FA4C0',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    overflow: 'hidden',
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noteInput: {
    backgroundColor: 'rgba(143, 164, 192, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

