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
  Alert,
  Image,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GradientButton } from '@/components/ui/GradientButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { SkeletonLessonHeader, SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { parseHTMLToText } from '@/utils/htmlToText';

// Track colors will come from API (track.primary_color, track.gradient_colors)
// Fallback colors for backward compatibility
const TRACK_COLORS_FALLBACK: Record<number, { primary: string; bg: string; gradient: string[] }> = {
  1: { primary: '#10B981', bg: '#0A2E1F', gradient: ['#0F1419', '#0A2E1F', '#1B365D'] }, // قدرات - أخضر
  2: { primary: '#3B82F6', bg: '#0F1B2E', gradient: ['#0F1419', '#0F1B2E', '#1B365D'] }, // تحصيلي - أزرق
  3: { primary: '#8B5CF6', bg: '#1A1526', gradient: ['#0F1419', '#1A1526', '#1B365D'] }, // STEP - بنفسجي
};

interface ContentSection {
  id: number;
  section_type: string;
  icon?: string;
  title?: string;
  question_text?: string;
  question_image_url?: string;
  content: string;
  explanation_image_url?: string;
  image_url?: string; // دعم القديم
  metadata?: any;
  sort_order: number;
}

interface QuestionOption {
  id: number;
  option_label: string;
  content: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  stem: string;
  has_image?: boolean;
  image_path?: string;
  image_url?: string;
  explanation?: string;
  shuffled_options?: QuestionOption[];
}

interface Track {
  id: number;
  name: string;
  code: string;
  primary_color?: string;
  bg_color?: string;
  gradient_colors?: string[];
  icon_emoji?: string;
}

interface Lesson {
  id: number;
  title: string;
  summary?: string;
  difficulty?: string;
  track?: Track;
  category?: {
    id: number;
    name: string;
  };
  content_sections?: ContentSection[];
  questions?: Question[];
  example_question?: Question;
  questions_enabled?: boolean;
  bookmark?: {
    bookmarked: boolean;
    pinned: boolean;
    note: string | null;
  };
}

export default function LessonShowScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleQuestion, setExampleQuestion] = useState<Question | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Animations for bubble entrance effects
  const headerAnim = useRef(new Animated.Value(0)).current;
  const noteSectionAnim = useRef(new Animated.Value(0)).current;
  const contentSectionsAnims = useRef<Animated.Value[]>([]).current;
  const exampleQuestionAnim = useRef(new Animated.Value(0)).current;
  
  // Track previous lesson ID to avoid animations when returning to same lesson
  const previousLessonId = useRef<string | null>(null);
  const shouldAnimate = useRef(true);

  // Get track colors from API data or fallback
  const getTrackColor = () => {
    if (lesson?.track?.primary_color && lesson.track.gradient_colors && lesson.track.gradient_colors.length >= 3) {
      return {
        primary: lesson.track.primary_color,
        bg: lesson.track.bg_color || lesson.track.primary_color,
        gradient: lesson.track.gradient_colors,
      };
    }
    const trackId = lesson?.track?.id || 1;
    return TRACK_COLORS_FALLBACK[trackId] || TRACK_COLORS_FALLBACK[1];
  };
  const trackColor = getTrackColor();

  useEffect(() => {
    if (id) {
      fetchLesson();
    }
  }, [id]);

  // Animate content when lesson is loaded
  useEffect(() => {
    if (lesson && !loading) {
      // تحقق إذا كان نفس الدرس (رجوع من صفحة أخرى)
      if (previousLessonId.current === id) {
        // نفس الدرس - لا animations
        shouldAnimate.current = false;
        
        // فقط نعرض المحتوى بدون animations
        headerAnim.setValue(1);
        noteSectionAnim.setValue(1);
        contentSectionsAnims.forEach(anim => anim.setValue(1));
        exampleQuestionAnim.setValue(1);
        return;
      }
      
      // درس جديد - نشغل animations
      shouldAnimate.current = true;
      previousLessonId.current = id;
      
      // Reset all animations
      headerAnim.setValue(0);
      noteSectionAnim.setValue(0);
      exampleQuestionAnim.setValue(0);
      contentSectionsAnims.forEach(anim => anim.setValue(0));

      // Calculate sections based on lesson content
      const hasIntro = lesson.content_sections?.some(s => s.section_type === 'introduction' || s.section_type === 'key_concept') || false;
      const hasExplanation = lesson.content_sections?.some(s => s.section_type === 'explanation') || false;
      const hasCommonMistake = lesson.content_sections?.some(s => s.section_type === 'common_mistake') || false;
      const hasSolutionSteps = lesson.content_sections?.some(s => s.section_type === 'solution_steps' || s.section_type === 'solved_example') || false;
      
      // Initialize animations for all sections (at least 4)
      const totalSections = 4; // intro, explanation, common_mistake, solution_steps
      while (contentSectionsAnims.length < totalSections) {
        contentSectionsAnims.push(new Animated.Value(0));
      }

      // Animate header (slower)
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Animate note section (slower)
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(noteSectionAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate content sections (bubbles effect) - sequentially and slower
      let delay = 400;
      let sectionIndex = 0;
      
      if (hasIntro && contentSectionsAnims[sectionIndex]) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(contentSectionsAnims[sectionIndex], {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        sectionIndex++;
        delay += 200;
      }

      if (hasExplanation && contentSectionsAnims[sectionIndex]) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(contentSectionsAnims[sectionIndex], {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        sectionIndex++;
        delay += 200;
      }

      if (hasCommonMistake && contentSectionsAnims[sectionIndex]) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(contentSectionsAnims[sectionIndex], {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        sectionIndex++;
        delay += 200;
      }

      if (hasCommonMistake && contentSectionsAnims[sectionIndex]) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(contentSectionsAnims[sectionIndex], {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        sectionIndex++;
        delay += 200;
      }

      if (hasSolutionSteps && contentSectionsAnims[sectionIndex]) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(contentSectionsAnims[sectionIndex], {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        sectionIndex++;
        delay += 200;
      }

      // Animate example question if exists (slower)
      if (exampleQuestion) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(exampleQuestionAnim, {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [lesson, loading, exampleQuestion]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ ok: boolean; data: Lesson }>(
        API_ENDPOINTS.LESSON(id)
      );

      if (response && response.ok && response.data) {
        const lessonData = response.data;
        setLesson(lessonData);
        setIsBookmarked(lessonData.bookmark?.bookmarked || false);
        setUserNote(lessonData.bookmark?.note || '');
        
        // Debug: Log content sections
        if (lessonData.content_sections) {
          console.log('Content sections received:', lessonData.content_sections.length);
          lessonData.content_sections.forEach((section: ContentSection, index: number) => {
            console.log(`Section ${index + 1}:`, {
              type: section.section_type,
              hasTitle: !!section.title,
              hasQuestionText: !!section.question_text,
              hasQuestionImage: !!section.question_image_url,
              hasContent: !!section.content,
              hasExplanationImage: !!section.explanation_image_url || !!section.image_url,
            });
          });
        } else {
          console.warn('No content_sections in lesson data');
        }
        
        // استخدام example_question من API مباشرة (إذا كان questions_enabled = true)
        if (lessonData.questions_enabled && lessonData.example_question) {
          console.log('Example question received:', {
            id: lessonData.example_question.id,
            hasStem: !!lessonData.example_question.stem,
            hasImage: !!lessonData.example_question.image_url,
            hasOptions: !!lessonData.example_question.shuffled_options?.length,
          });
          setExampleQuestion(lessonData.example_question);
        } else if (lessonData.questions && lessonData.questions.length > 0) {
          // Fallback: استخدام selectRandomQuestion للأنواع القديمة
          selectRandomQuestion(lessonData.questions);
        } else {
          console.warn('No example question available');
          setExampleQuestion(null);
        }
      }
    } catch (err) {
      console.error('Error fetching lesson:', err);
      setError(err instanceof Error ? err.message : t('lessons.errorLoading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectRandomQuestion = (questions: Question[]) => {
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];
    
    if (question.shuffled_options && question.shuffled_options.length > 0) {
      // Get correct option
      const correctOption = question.shuffled_options.find(opt => opt.is_correct);
      const wrongOptions = question.shuffled_options.filter(opt => !opt.is_correct);
      
      // Ensure we have a correct option
      if (!correctOption) {
        console.warn('No correct option found in question');
        setExampleQuestion(question);
        setSelectedOptionId(null);
        setShowExplanation(false);
        return;
      }
      
      // Shuffle wrong options to randomize selection
      const shuffledWrong = [...wrongOptions].sort(() => Math.random() - 0.5);
      
      // Take exactly 3 wrong options (never more than 3)
      const selectedWrong = shuffledWrong.slice(0, 3);
      
      // Combine: correct (1) + wrong (3) = exactly 4 options
      // Filter to remove any undefined/null values, then shuffle
      const selectedOptions = [correctOption, ...selectedWrong]
        .filter(Boolean)
        .sort(() => Math.random() - 0.5); // Shuffle randomly to prevent position-based guessing
      
      // Ensure we have at least 2 options (correct + at least 1 wrong)
      if (selectedOptions.length < 2) {
        console.warn('Not enough options to display');
        setExampleQuestion(question);
        setSelectedOptionId(null);
        setShowExplanation(false);
        return;
      }
      
      // Always limit to exactly 4 options maximum (should already be 4, but ensure it)
      const finalOptions = selectedOptions.slice(0, 4);
      
      setExampleQuestion({
        ...question,
        shuffled_options: finalOptions, // Exactly 4 options (or less if not enough)
      });
    } else {
      setExampleQuestion(question);
    }
    
    // Reset selection state
    setSelectedOptionId(null);
    setShowExplanation(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLesson();
  };

  const refreshExampleQuestion = async () => {
    if (!lesson) return;
    
    try {
      // إعادة جلب الدرس من API للحصول على example_question جديد
      const response = await api.get<{ ok: boolean; data: Lesson }>(
        API_ENDPOINTS.LESSON(lesson.id)
      );
      
      if (response && response.ok && response.data) {
        const lessonData = response.data;
        
        // استخدام example_question الجديد من API
        if (lessonData.questions_enabled && lessonData.example_question) {
          console.log('Refreshed example question:', {
            id: lessonData.example_question.id,
            hasStem: !!lessonData.example_question.stem,
            hasOptions: !!lessonData.example_question.shuffled_options?.length,
          });
          setExampleQuestion(lessonData.example_question);
          setSelectedOptionId(null);
          setShowExplanation(false);
        } else {
          console.warn('No example question available after refresh');
        }
      }
    } catch (err) {
      console.error('Error refreshing example question:', err);
      Alert.alert(t('common.error'), 'فشل في تحديث المثال');
    }
  };

  const handleOptionSelect = (optionId: number, isCorrect: boolean) => {
    if (selectedOptionId !== null) return; // Already answered
    
    setSelectedOptionId(optionId);
    if (isCorrect) {
      // Show explanation after a short delay
      setTimeout(() => setShowExplanation(true), 500);
    } else {
      // Show correct answer and explanation
      setTimeout(() => setShowExplanation(true), 500);
    }
  };

  const toggleBookmark = async () => {
    if (!lesson) return;

    try {
      const response = await api.post<{ ok: boolean; data: { bookmarked: boolean } }>(
        API_ENDPOINTS.LESSON_BOOKMARK(lesson.id)
      );

      if (response && response.ok && response.data) {
        setIsBookmarked(response.data.bookmarked);
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      Alert.alert(t('common.error'), 'فشل في تحديث الحفظ');
    }
  };

  const saveNote = async () => {
    if (!lesson) return;
    
    try {
      setSavingNote(true);
      const response = await api.post<{ ok: boolean; data: { note: string | null; pinned: boolean; bookmarked: boolean } }>(
        API_ENDPOINTS.LESSON_NOTE(lesson.id), 
        { note: userNote }
      );
      
      if (response && response.ok && response.data) {
        // تحديث حالة bookmark مع الحفاظ على pinned الحالي
        setIsBookmarked(response.data.bookmarked);
        Alert.alert('نجح', 'تم حفظ الملاحظة بنجاح');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      Alert.alert(t('common.error'), 'فشل في حفظ الملاحظة');
    } finally {
      setSavingNote(false);
    }
  };

  const getContentByType = () => {
    if (!lesson?.content_sections) return {};
    
    const grouped: Record<string, ContentSection[]> = {};
    lesson.content_sections.forEach(section => {
      if (!grouped[section.section_type]) {
        grouped[section.section_type] = [];
      }
      grouped[section.section_type].push(section);
    });
    
    return grouped;
  };

  const renderContentSection = (type: string, title: string, icon: string) => {
    const contentByType = getContentByType();
    const sections = contentByType[type] || [];
    
    if (sections.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={icon as any} size={24} color={trackColor.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        
        {sections.map((section, index) => (
          <View key={section.id} style={styles.contentCard}>
            {section.title && (
              <Text style={styles.contentCardTitle}>{section.title}</Text>
            )}
            
            {/* نص السؤال (للشرح فقط) */}
            {type === 'explanation' && section.question_text && (
              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>السؤال:</Text>
                <Text style={styles.questionText}>{section.question_text}</Text>
              </View>
            )}
            
            {/* صورة السؤال */}
            {type === 'explanation' && section.question_image_url && (
              <Image
                source={{ uri: section.question_image_url }}
                style={styles.contentImage}
                resizeMode="contain"
              />
            )}
            
            {/* نص الشرح */}
            <Text style={styles.contentText}>{section.content}</Text>
            
            {/* صورة الشرح */}
            {(section.explanation_image_url || section.image_url) && (
              <Image
                source={{ uri: section.explanation_image_url || section.image_url }}
                style={styles.contentImage}
                resizeMode="contain"
              />
            )}
            
            {/* Solved example metadata */}
            {type === 'solved_example' && section.metadata?.answer && (
              <View style={styles.solutionBox}>
                <Text style={styles.solutionLabel}>الحل:</Text>
                <Text style={styles.solutionText}>{section.metadata.answer}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading && !lesson) {
    return (
      <GradientBackground colors={trackColor.gradient as any}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <SkeletonLoader width="50%" height={20} borderRadius={6} />
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SkeletonLessonHeader />
            <View style={styles.section}>
              <SkeletonLoader width="40%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="95%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="90%" height={14} borderRadius={6} />
            </View>
            <View style={styles.section}>
              <SkeletonLoader width="50%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="98%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="85%" height={14} borderRadius={6} />
            </View>
            <View style={[styles.section, { height: 200 }]}>
              <SkeletonLoader width="60%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={120} borderRadius={12} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error || !lesson) {
    return (
      <GradientBackground colors={trackColor.gradient as any}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={[styles.errorText, { textAlign }]}>{error || t('lessons.errorNotFound')}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchLesson}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const contentByType = getContentByType();

  // إخفاء المحتوى أثناء loading
  const contentOpacity = loading ? 0 : 1;

  return (
    <GradientBackground colors={trackColor.gradient as any}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
            {
              opacity: loading ? 0 : headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
                {
                  scale: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>{lesson.title}</Text>
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={toggleBookmark}
          >
            <MaterialIcons
              name={isBookmarked ? 'star' : 'star-border'}
              size={24}
              color={isBookmarked ? '#D4AF37' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FFFFFF"
            />
          }
        >
          {/* إخفاء المحتوى أثناء loading */}
          <Animated.View
            style={{
              opacity: loading ? 0 : 1,
            }}
          >
          {/* Lesson Meta */}
          <Animated.View
            style={[
              styles.lessonMeta,
              { flexDirection },
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {lesson.track && (
              <View style={[styles.metaBadge, { backgroundColor: trackColor.primary + '30', flexDirection }]}>
                <MaterialIcons name="folder" size={16} color={trackColor.primary} />
                <Text style={[styles.metaText, { color: trackColor.primary, textAlign }]}>
                  {lesson.track.name}
                </Text>
              </View>
            )}
            {lesson.category && (
              <View style={[styles.metaBadge, { flexDirection }]}>
                <MaterialIcons name="category" size={16} color="#FFFFFF" />
                <Text style={[styles.metaText, { textAlign }]}>{lesson.category.name}</Text>
              </View>
            )}
          </Animated.View>

          {/* Note Section */}
          <Animated.View
            style={[
              styles.noteSection,
              {
                opacity: noteSectionAnim,
                transform: [
                  {
                    translateY: noteSectionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                  {
                    scale: noteSectionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.noteSectionTitleContainer, { flexDirection }]}>
              <MaterialIcons name="note" size={20} color={trackColor.primary} />
              <Text style={[styles.noteSectionTitle, { textAlign }]}>ملاحظاتي الخاصة</Text>
                </View>
            <View style={styles.noteInputContainer}>
              <TextInput
                style={[styles.noteInput, { textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                multiline
                placeholder="أضف ملاحظاتك الخاصة هنا..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={userNote}
                onChangeText={setUserNote}
              />
            </View>
            <TouchableOpacity
              style={[styles.saveNoteButton, { backgroundColor: trackColor.primary, flexDirection }]}
              onPress={saveNote}
              disabled={savingNote}
            >
              {savingNote ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="#FFFFFF" />
                  <Text style={[styles.saveNoteText, { textAlign }]}>حفظ الملاحظة</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* 1. تعريف الدرس */}
          {(contentByType.introduction?.length > 0 || contentByType.key_concept?.length > 0) && (
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: contentSectionsAnims[0] || headerAnim,
                  transform: [
                    {
                      translateY: (contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    {
                      scale: (contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="info" size={24} color={trackColor.primary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>تعريف الدرس</Text>
              </View>
              
              {contentByType.introduction?.map((intro) => (
                <View key={intro.id} style={styles.contentCard}>
                  <View style={{ marginBottom: 8 }}>
                    {parseHTMLToText(intro.content, { ...styles.contentText, textAlign })}
                  </View>
                </View>
              ))}
              
              {!contentByType.introduction?.length && contentByType.key_concept?.slice(0, 1).map((concept) => (
                <View key={concept.id} style={styles.contentCard}>
                  {concept.title && (
                    <Text style={[styles.contentCardTitle, { textAlign }]}>{concept.title}</Text>
                  )}
                  <Text style={[styles.contentText, { textAlign }]}>
                    {parseHTMLToText(concept.content, styles.contentText)}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* 2. الشرح التفصيلي (explanation) */}
          {contentByType.explanation?.length > 0 && (
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim,
                  transform: [
                    {
                      translateY: (contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    {
                      scale: (contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="menu-book" size={24} color={trackColor.primary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>شرح للدرس مع مثال</Text>
              </View>
              
              {contentByType.explanation.map((section) => (
                <View key={section.id} style={styles.contentCard}>
                  {section.title && (
                    <Text style={[styles.contentCardTitle, { textAlign }]}>{section.title}</Text>
                  )}
                  
                  {/* نص السؤال */}
                  {section.question_text && (
                    <View style={styles.questionBox}>
                      <Text style={[styles.questionLabel, { textAlign }]}>السؤال:</Text>
                      <Text style={[styles.questionText, { textAlign }]}>
                        {parseHTMLToText(section.question_text, styles.questionText)}
                      </Text>
                    </View>
                  )}
                  
                  {/* صورة السؤال */}
                  {section.question_image_url && (
                    <Image
                      source={{ uri: section.question_image_url }}
                      style={styles.contentImage}
                      resizeMode="contain"
                    />
                  )}
                  
                  {/* نص الشرح */}
                  <View style={{ marginBottom: 8 }}>
                    {parseHTMLToText(section.content, { ...styles.contentText, textAlign })}
                  </View>
                  
                  {/* صورة الشرح */}
                  {(section.explanation_image_url || section.image_url) && (
                    <Image
                      source={{ uri: section.explanation_image_url || section.image_url }}
                      style={styles.contentImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
              ))}
            </Animated.View>
          )}

          {/* 3. الأخطاء الشائعة (common_mistake) */}
          {contentByType.common_mistake?.length > 0 && (
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: contentSectionsAnims[2] || contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim,
                  transform: [
                    {
                      translateY: (contentSectionsAnims[2] || contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    {
                      scale: (contentSectionsAnims[2] || contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="warning" size={24} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { textAlign }]}>الأخطاء الشائعة</Text>
              </View>
              
              {contentByType.common_mistake.map((mistake) => (
                <View key={mistake.id} style={[styles.contentCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                  {mistake.title && (
                    <Text style={[styles.contentCardTitle, { textAlign, color: '#F59E0B' }]}>{mistake.title}</Text>
                  )}
                  
                  {/* عرض المحتوى مع دعم HTML */}
                  <View style={{ marginBottom: 8 }}>
                    {parseHTMLToText(mistake.content, { ...styles.contentText, textAlign })}
                  </View>
                  
                  {/* عرض metadata إذا كان موجوداً */}
                  {mistake.metadata && (mistake.metadata.mistake || mistake.metadata.correction) && (
                    <View style={{ marginTop: 12 }}>
                      {mistake.metadata.mistake && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={[styles.questionLabel, { textAlign, color: '#EF4444' }]}>
                            <MaterialIcons name="error" size={16} color="#EF4444" /> خطأ شائع:
                          </Text>
                          <Text style={[styles.contentText, { textAlign }]}>
                            {parseHTMLToText(mistake.metadata.mistake, styles.contentText)}
                          </Text>
                        </View>
                      )}
                      {mistake.metadata.correction && (
                        <View>
                          <Text style={[styles.questionLabel, { textAlign, color: '#10B981' }]}>
                            <MaterialIcons name="check-circle" size={16} color="#10B981" /> الحل الصحيح:
                          </Text>
                          <Text style={[styles.contentText, { textAlign }]}>
                            {parseHTMLToText(mistake.metadata.correction, styles.contentText)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </Animated.View>
          )}

          {/* 4. الشرح العام + مثال محلول (للأنواع القديمة) */}
          {(contentByType.solution_steps?.length > 0 || contentByType.solved_example?.length > 0) && (
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: contentSectionsAnims[2] || contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim,
                  transform: [
                    {
                      translateY: (contentSectionsAnims[2] || contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    {
                      scale: (contentSectionsAnims[2] || contentSectionsAnims[1] || contentSectionsAnims[0] || headerAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="menu-book" size={24} color={trackColor.primary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>الشرح العام</Text>
              </View>
              
              {/* Solution Steps */}
              {contentByType.solution_steps?.map((step, index) => (
                <View key={step.id} style={styles.contentCard}>
                  <Text style={[styles.contentCardTitle, { textAlign }]}>
                    الخطوة {index + 1}: {step.title || ''}
                  </Text>
                  <Text style={[styles.contentText, { textAlign }]}>
                    {parseHTMLToText(step.content, styles.contentText)}
                  </Text>
            </View>
              ))}
              
              {/* Solved Example */}
              {contentByType.solved_example?.slice(0, 1).map((example) => (
                <View key={example.id} style={[styles.contentCard, styles.solvedExampleCard]}>
                  <View style={[styles.exampleHeader, { flexDirection }]}>
                    <MaterialIcons name="check-circle" size={20} color={trackColor.primary} />
                    <Text style={[styles.exampleTitle, { textAlign }]}>مثال محلول</Text>
                  </View>
                  <View style={styles.exampleProblem}>
                    <Text style={[styles.exampleLabel, { textAlign }]}>السؤال:</Text>
                    <Text style={[styles.contentText, { textAlign }]}>
                      {parseHTMLToText(example.content, styles.contentText)}
                    </Text>
                    </View>
                  {example.metadata?.answer && (
                    <View style={styles.solutionBox}>
                      <Text style={[styles.solutionLabel, { textAlign }]}>الحل:</Text>
                      <Text style={[styles.solutionText, { textAlign }]}>{example.metadata.answer}</Text>
                    </View>
                  )}
                </View>
              ))}
            </Animated.View>
          )}

          {/* 4. مثال سؤال تفاعلي */}
          {exampleQuestion && (
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: exampleQuestionAnim,
                  transform: [
                    {
                      translateY: exampleQuestionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    {
                      scale: exampleQuestionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sectionDivider} />
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="help" size={24} color={trackColor.primary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>مثال سؤال</Text>
              </View>
              
              <View style={styles.exampleQuestionCard}>
                <Text style={[styles.questionText, { textAlign }]}>{exampleQuestion.stem}</Text>
                
                {exampleQuestion.has_image && exampleQuestion.image_url && (
                  <Image
                    source={{ uri: exampleQuestion.image_url }}
                    style={styles.questionImage}
                    resizeMode="contain"
                  />
                )}
                
                <View style={styles.optionsList}>
                  {exampleQuestion.shuffled_options?.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const isCorrect = option.is_correct;
                    const showCorrect = selectedOptionId !== null && isCorrect;
                    const showWrong = isSelected && !isCorrect;
                    
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionItem,
                          { flexDirection },
                          showCorrect && styles.optionCorrect,
                          showWrong && styles.optionWrong,
                          selectedOptionId !== null && !isSelected && styles.optionDisabled,
                        ]}
                        onPress={() => handleOptionSelect(option.id, isCorrect)}
                        disabled={selectedOptionId !== null}
                      >
                        <View style={[styles.optionLetter, { backgroundColor: trackColor.primary + '30' }]}>
                          <Text style={[styles.optionLetterText, { color: trackColor.primary }]}>
                            {option.option_label}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, { textAlign }]}>{option.content}</Text>
                        {isSelected && (
                          <MaterialIcons
                            name={isCorrect ? 'check-circle' : 'cancel'}
                            size={24}
                            color={isCorrect ? '#10B981' : '#EF4444'}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {showExplanation && exampleQuestion.explanation && (
                  <View style={styles.explanationBox}>
                    <View style={[styles.explanationHeader, { flexDirection }]}>
                      <MaterialIcons name="lightbulb" size={20} color={trackColor.primary} />
                      <Text style={[styles.explanationTitle, { textAlign }]}>الشرح</Text>
                    </View>
                    <Text style={[styles.explanationText, { textAlign }]}>
                      {parseHTMLToText(exampleQuestion.explanation || '', styles.explanationText)}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={[styles.refreshButton, { borderColor: trackColor.primary, flexDirection }]}
                  onPress={refreshExampleQuestion}
                >
                  <MaterialIcons name="refresh" size={20} color={trackColor.primary} />
                  <Text style={[styles.refreshButtonText, { color: trackColor.primary, textAlign }]}>
                    تحديث المثال
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 12,
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  lessonMeta: {
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  metaBadge: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noteSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  noteSectionTitleContainer: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noteSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  noteInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 80,
  },
  noteInput: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  saveNoteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveNoteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  contentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  questionBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  questionLabel: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  solvedExampleCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  exampleHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  exampleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  exampleProblem: {
    marginBottom: 12,
  },
  exampleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  solutionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  solutionLabel: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  solutionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  exampleQuestionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 24,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionItem: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  explanationBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  explanationHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  explanationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  explanationText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  refreshButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
