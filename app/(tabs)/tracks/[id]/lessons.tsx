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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useTrack, getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { SubscriptionRequiredScreen } from '@/components/SubscriptionRequiredScreen';

interface Lesson {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  difficulty?: string;
  lesson_order: number;
  questions_count?: number;
  category?: {
    id: number;
    name: string;
  };
  user_progress?: {
    attempts_count: number;
    last_score: number;
    best_score: number;
    avg_score: number;
    last_attempt_at: string;
    error_rate: number;
    performance_level: string;
  };
  bookmark?: {
    bookmarked: boolean;
    pinned: boolean;
    note?: string;
  };
}

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export default function LessonsListScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setCurrentTrack } = useTrack();
  
  const [track, setTrack] = useState<Track | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [togglingPin, setTogglingPin] = useState<number | null>(null);

  const trackId = parseInt(id || '0');
  const colors = getTrackColors(trackId);

  useEffect(() => {
    if (id) {
      setCurrentTrack(trackId);
      checkSubscription();
    }
  }, [id]);

  useEffect(() => {
    if (hasSubscription !== null && hasSubscription) {
      fetchTrackData();
      fetchLessons();
    }
  }, [hasSubscription, trackId]);

  // إعادة تحميل البيانات عند فتح الصفحة (للمزامنة مع الموقع)
  useFocusEffect(
    React.useCallback(() => {
      if (hasSubscription !== null && hasSubscription) {
        fetchLessons();
      }
    }, [hasSubscription, trackId])
  );

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const response = await api.get<{ ok: boolean; data: { subscribed: boolean } }>(
        API_ENDPOINTS.CHECK_TRACK_SUBSCRIPTION(trackId)
      );
      if (response && response.ok && response.data) {
        setHasSubscription(response.data.subscribed);
      } else {
        setHasSubscription(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setHasSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchTrackData = async () => {
    try {
      const trackResponse = await api.get<{ ok: boolean; data: Track }>(
        API_ENDPOINTS.TRACK(trackId)
      );
      if (trackResponse && trackResponse.ok && trackResponse.data) {
        setTrack(trackResponse.data);
      }
    } catch (err) {
      console.error('Error fetching track:', err);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ ok: boolean; data: Lesson[] }>(
        API_ENDPOINTS.LESSONS(trackId)
      );

      if (response && response.ok && response.data) {
        // Log for debugging
        const bookmarkedLessons = response.data.filter(l => l.bookmark?.bookmarked);
        console.log(`[Lessons] Loaded ${response.data.length} lessons, ${bookmarkedLessons.length} bookmarked`);
        
        // ترتيب الدروس: المثبتة/المحفوظة أولاً، ثم حسب الترتيب
        // المثبت = محفوظ (نفس التأثيرات)
        const sortedLessons = [...response.data].sort((a, b) => {
          const aPinned = (a.bookmark?.pinned || a.bookmark?.bookmarked) ? 0 : 1;
          const bPinned = (b.bookmark?.pinned || b.bookmark?.bookmarked) ? 0 : 1;
          if (aPinned !== bPinned) return aPinned - bPinned;
          return a.lesson_order - b.lesson_order;
        });
        
        setLessons(sortedLessons);
      }
    } catch (err: any) {
      console.error('Error fetching lessons:', err);
      if (err?.message?.includes('NO_SUBSCRIPTION') || err?.message?.includes('403')) {
        setHasSubscription(false);
      } else {
        setError(err instanceof Error ? err.message : 'حدث خطأ في جلب الدروس');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLessonPress = (lesson: Lesson) => {
    router.push(`/lessons/${lesson.id}`);
  };

  const handleTogglePin = async (lesson: Lesson, e: any) => {
    e.stopPropagation();
    try {
      setTogglingPin(lesson.id);
      const response = await api.post<{ ok: boolean; data: { pinned: boolean } }>(
        API_ENDPOINTS.LESSON_PIN(lesson.id)
      );
      
      if (response && response.ok && response.data) {
        setLessons(prevLessons =>
          prevLessons.map(l =>
            l.id === lesson.id
              ? {
                  ...l,
                  bookmark: {
                    ...l.bookmark,
                    pinned: response.data.pinned,
                    bookmarked: response.data.bookmarked ?? true,
                  } as Lesson['bookmark'],
                }
              : l
          ).sort((a, b) => {
            // ترتيب: المثبتة/المحفوظة أولاً (نفس التأثيرات)
            const aPinned = (a.bookmark?.pinned || a.bookmark?.bookmarked) ? 0 : 1;
            const bPinned = (b.bookmark?.pinned || b.bookmark?.bookmarked) ? 0 : 1;
            if (aPinned !== bPinned) return aPinned - bPinned;
            return a.lesson_order - b.lesson_order;
          })
        );
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
    } finally {
      setTogglingPin(null);
    }
  };

  const handleOpenNoteModal = (lesson: Lesson, e: any) => {
    e.stopPropagation();
    setSelectedLesson(lesson);
    setNoteText(lesson.bookmark?.note || '');
    setNoteModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!selectedLesson) return;
    
    try {
      setSavingNote(true);
      const response = await api.post<{ ok: boolean; data: { note: string } }>(
        API_ENDPOINTS.LESSON_NOTE(selectedLesson.id),
        { note: noteText }
      );
      
      if (response && response.ok && response.data) {
        setLessons(prevLessons =>
          prevLessons.map(l =>
            l.id === selectedLesson.id
              ? {
                  ...l,
                  bookmark: {
                    ...l.bookmark,
                    note: response.data.note,
                    bookmarked: response.data.bookmarked ?? true,
                    pinned: response.data.pinned ?? l.bookmark?.pinned ?? false,
                  } as Lesson['bookmark'],
                }
              : l
          )
        );
        setNoteModalVisible(false);
        setSelectedLesson(null);
        setNoteText('');
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'hard':
        return '#EF4444';
      default:
        return colors.primary;
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return 'سهل';
      case 'medium':
        return 'متوسط';
      case 'hard':
        return 'صعب';
      default:
        return 'غير محدد';
    }
  };

  const getPerformanceLevel = (lesson: Lesson): { label: string; color: string } => {
    if (!lesson.user_progress || lesson.user_progress.attempts_count === 0) {
      return {
        label: 'تحتاج أن تختبر أولاً',
        color: 'rgba(255, 255, 255, 0.5)',
      };
    }

    const level = lesson.user_progress.performance_level;
    switch (level) {
      case 'full_mark':
        return { label: 'فل مارك', color: '#D4AF37' };
      case 'excellent':
        return { label: 'ممتاز', color: '#10B981' };
      case 'very_good':
        return { label: 'جيد جداً', color: '#3B82F6' };
      case 'good':
        return { label: 'جيد', color: '#60A5FA' };
      case 'average':
        return { label: 'متوسط', color: '#F59E0B' };
      case 'needs_improvement':
        return { label: 'يحتاج تحسين', color: '#EF4444' };
      default:
        return { label: 'غير محدد', color: 'rgba(255, 255, 255, 0.5)' };
    }
  };

  if (checkingSubscription || loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { textAlign }]}>الدروس</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.skeletonContainer}>
              {[1, 2, 3, 4, 5].map((item) => (
                <SkeletonLoader
                  key={item}
                  width="100%"
                  height={120}
                  borderRadius={16}
                  style={{ marginBottom: 16 }}
                />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!hasSubscription && track) {
    return (
      <SubscriptionRequiredScreen
        trackName={track.name}
        trackId={trackId}
        trackColor={colors.primary}
      />
    );
  }

  if (error && !lessons.length) {
    return (
      <GradientBackground colors={colors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { textAlign }]}>الدروس</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color={colors.primary} />
            <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchLessons}
            >
              <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>الدروس</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Track Header */}
          {track && (
            <Animated.View
              entering={FadeInDown.duration(600)}
              style={styles.trackHeader}
            >
              <Animated.Text
                entering={ZoomIn.duration(800).delay(200)}
                style={styles.trackEmoji}
              >
                🤖
              </Animated.Text>
              <Text style={[styles.trackTitle, { textAlign }]}>{track.name}</Text>
              <Text style={[styles.trackSubtitle, { textAlign }]}>استكشف جميع الدروس المتاحة</Text>
            </Animated.View>
          )}

          {/* Lessons Count */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(300)}
            style={[styles.countContainer, { flexDirection }]}
          >
            <MaterialIcons name="menu-book" size={20} color={colors.primary} />
            <Text style={[styles.countText, { color: colors.primary }]}>
              {lessons.length} {lessons.length === 1 ? 'درس' : 'درس'}
            </Text>
          </Animated.View>

          {/* Lessons List */}
          <View style={styles.lessonsContainer}>
            {lessons.map((lesson, index) => (
              <Animated.View
                key={lesson.id}
                entering={FadeInUp.duration(500).delay(400 + index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.lessonCard,
                    (lesson.bookmark?.pinned || lesson.bookmark?.bookmarked) ? styles.lessonCardPinned : { borderColor: `${colors.primary}40` },
                  ]}
                  onPress={() => handleLessonPress(lesson)}
                  activeOpacity={0.8}
                >
                  {/* Header with Pin and Note Buttons */}
                  <View style={[styles.lessonCardTop, { flexDirection }]}>
                    <View style={[styles.lessonHeader, { flexDirection }]}>
                      <View style={[styles.lessonNumber, { backgroundColor: `${colors.primary}20` }]}>
                        <Text style={[styles.lessonNumberText, { color: colors.primary }]}>
                          {lesson.lesson_order}
                        </Text>
                      </View>
                      
                      {lesson.difficulty && (
                        <View
                          style={[
                            styles.difficultyBadge,
                            { backgroundColor: `${getDifficultyColor(lesson.difficulty)}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.difficultyText,
                              { color: getDifficultyColor(lesson.difficulty) },
                            ]}
                          >
                            {getDifficultyLabel(lesson.difficulty)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={[styles.actionButtons, { flexDirection }]}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => handleTogglePin(lesson, e)}
                        disabled={togglingPin === lesson.id}
                        accessibilityLabel={(lesson.bookmark?.pinned || lesson.bookmark?.bookmarked) ? "إلغاء تثبيت الدرس" : "تثبيت الدرس"}
                      >
                        <MaterialIcons
                          name={(lesson.bookmark?.pinned || lesson.bookmark?.bookmarked) ? "bookmark" : "bookmark-border"}
                          size={24}
                          color={(lesson.bookmark?.pinned || lesson.bookmark?.bookmarked) ? '#D4AF37' : 'rgba(255, 255, 255, 0.6)'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => handleOpenNoteModal(lesson, e)}
                      >
                        <MaterialIcons
                          name={lesson.bookmark?.note ? "note" : "note-add"}
                          size={22}
                          color={lesson.bookmark?.note ? colors.primary : 'rgba(255, 255, 255, 0.6)'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.lessonTitle, { textAlign }]}>{lesson.title}</Text>

                  {lesson.summary && (
                    <Text style={[styles.lessonSummary, { textAlign }]} numberOfLines={2}>
                      {lesson.summary}
                    </Text>
                  )}

                  {/* Note Display */}
                  {lesson.bookmark?.note && (
                    <View style={[styles.noteContainer, { backgroundColor: `${colors.primary}15`, flexDirection }]}>
                      <MaterialIcons name="note" size={16} color={colors.primary} />
                      <Text style={[styles.noteText, { color: 'rgba(255, 255, 255, 0.9)', textAlign }]} numberOfLines={2}>
                        {lesson.bookmark.note}
                      </Text>
                    </View>
                  )}

                  {/* Performance Level */}
                  {(() => {
                    const performance = getPerformanceLevel(lesson);
                    return (
                      <View style={[styles.performanceContainer, { flexDirection }]}>
                        <Text style={[styles.performanceLabel, { color: performance.color }]}>
                          {performance.label}
                        </Text>
                        {lesson.user_progress && lesson.user_progress.error_rate !== null && (
                          <Text style={styles.errorRateText}>
                            نسبة الخطأ: {lesson.user_progress.error_rate.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    );
                  })()}

                  <View style={[styles.lessonFooter, { flexDirection }]}>
                    {lesson.category && (
                      <View style={[styles.categoryContainer, { flexDirection }]}>
                        <MaterialIcons
                          name="label"
                          size={16}
                          color="rgba(255, 255, 255, 0.7)"
                        />
                        <Text style={styles.categoryText}>{lesson.category.name}</Text>
                      </View>
                    )}

                    <View style={[styles.questionsContainer, { flexDirection }]}>
                      <MaterialIcons
                        name="help-outline"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={[styles.questionsText, { color: colors.primary }]}>
                        {lesson.questions_count || 0} سؤال
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.lessonArrow, { [isRTL ? 'right' : 'left']: 20 }]}>
                    <MaterialIcons
                      name={isRTL ? "arrow-back" : "arrow-forward"}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {lessons.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="book" size={64} color="rgba(255, 255, 255, 0.3)" />
              <Text style={[styles.emptyText, { textAlign }]}>لا توجد دروس متاحة حالياً</Text>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Note Modal */}
        <Modal
          visible={noteModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setNoteModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setNoteModalVisible(false);
                setSelectedLesson(null);
                setNoteText('');
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={[styles.modalContent, { backgroundColor: colors.gradient[0] }]}
              >
                <View style={[styles.modalHeader, { flexDirection }]}>
                  <Text style={[styles.modalTitle, { textAlign }]}>ملاحظة على الدرس</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNoteModalVisible(false);
                      setSelectedLesson(null);
                      setNoteText('');
                    }}
                  >
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {selectedLesson && (
                  <Text style={[styles.modalLessonTitle, { textAlign }]}>
                    {selectedLesson.title}
                  </Text>
                )}

                <TextInput
                  style={[styles.noteInput, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                  placeholder="اكتب ملاحظتك هنا..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <View style={[styles.modalActions, { flexDirection }]}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setNoteModalVisible(false);
                      setSelectedLesson(null);
                      setNoteText('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleSaveNote}
                    disabled={savingNote}
                  >
                    {savingNote ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>حفظ</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  skeletonContainer: {
    gap: 16,
  },
  trackHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trackEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  trackSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  countContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '700',
  },
  lessonsContainer: {
    gap: 16,
  },
  lessonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    position: 'relative',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    fontSize: 18,
    fontWeight: '700',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lessonTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right', // RTL للعربية
  },
  lessonSummary: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'right', // RTL للعربية
  },
  lessonFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  questionsContainer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  questionsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lessonArrow: {
    position: 'absolute',
    bottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
  lessonCardPinned: {
    borderWidth: 3,
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  lessonCardTop: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionButtons: {
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  noteContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right', // RTL للعربية
  },
  performanceContainer: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  performanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right', // RTL للعربية
  },
  errorRateText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right', // RTL للعربية
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right', // RTL للعربية
  },
  modalLessonTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right', // RTL للعربية
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

