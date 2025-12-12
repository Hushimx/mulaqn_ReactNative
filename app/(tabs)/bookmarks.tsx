import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { SavedQuestionCard } from '@/components/SavedQuestionCard';
import { QuestionPreviewSheet } from '@/components/QuestionPreviewSheet';
import { TagFilterBar } from '@/components/TagFilterBar';
import { TagManagerModal } from '@/components/TagManagerModal';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeIn } from 'react-native-reanimated';

interface QuestionOption {
  id: number;
  content: string;
  option_label?: string;
  option_order?: number;
}

interface Question {
  id: number;
  stem: string;
  explanation?: string;
  media_url?: string;
  options: QuestionOption[];
}

interface Lesson {
  id: number;
  title: string;
  track_id: number;
  track?: {
    id: number;
    name: string;
    code: string;
  };
  category?: {
    id: number;
    name: string;
    code: string;
  };
}

interface Tag {
  id: number;
  name: string;
  color: string;
  order: number;
  saved_questions_count?: number;
}

interface SavedQuestion {
  id: number;
  question_id: number;
  note?: string;
  created_at: string;
  question: Question & { lesson: Lesson };
  tags: Tag[];
}

export default function BookmarksScreen() {
  const router = useRouter();
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<SavedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SavedQuestion | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  // تحديث البيانات كل ما نرجع للصفحة
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    applyFilters();
  }, [savedQuestions, activeTagId, selectedTrackId]);

  const fetchData = async () => {
    await Promise.all([fetchSavedQuestions(), fetchTags()]);
  };

  const fetchSavedQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: SavedQuestion[] }>(
        API_ENDPOINTS.SAVED_QUESTIONS
      );
      
      if (response && response.ok && response.data) {
        console.log('Saved questions with tags:', response.data.map(q => ({ id: q.id, tagsCount: q.tags?.length || 0 })));
        setSavedQuestions(response.data);
      }
    } catch (error) {
      console.error('Error fetching saved questions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get<{ ok: boolean; data: Tag[] }>(
        API_ENDPOINTS.TAGS
      );
      
      if (response && response.ok && response.data) {
        setTags(response.data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...savedQuestions];

    // Apply tag filter
    if (activeTagId !== null) {
      filtered = filtered.filter(q => 
        q.tags.some(tag => tag.id === activeTagId)
      );
    }

    // Apply track filter
    if (selectedTrackId) {
      filtered = filtered.filter(q => q.question.lesson.track_id === selectedTrackId);
    }

    setFilteredQuestions(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getTrackColor = (trackId: number) => {
    switch (trackId) {
      case 1: return '#10B981'; // قدرات
      case 2: return '#3B82F6'; // تحصيلي
      case 3: return '#8B5CF6'; // STEP
      default: return '#D4AF37';
    }
  };

  const handleCardPress = (question: SavedQuestion) => {
    console.log('Selected question tags:', question.tags);
    setSelectedQuestion(question);
    setPreviewVisible(true);
  };

  const handleViewPress = () => {
    setPreviewVisible(false);
    if (selectedQuestion) {
      router.push(`/bookmarks/${selectedQuestion.id}/view` as any);
    }
  };

  const handlePracticePress = () => {
    setPreviewVisible(false);
    if (selectedQuestion) {
      router.push(`/bookmarks/${selectedQuestion.id}/practice` as any);
    }
  };

  const handleTagPress = (tagId: number | null) => {
    setActiveTagId(tagId);
  };

  const handleAddTag = () => {
    setEditingTag(null);
    setTagModalVisible(true);
  };

  const handleSaveTag = async (tagData: { name: string; color: string }) => {
    try {
      if (editingTag) {
        // Update existing tag
        await api.put<{ ok: boolean; data: Tag }>(
          API_ENDPOINTS.TAG(editingTag.id),
          {
            name: tagData.name,
            color: tagData.color,
          }
        );
      } else {
        // Create new tag
        await api.post<{ ok: boolean; data: Tag }>(
          API_ENDPOINTS.TAGS,
          tagData
        );
      }
      
      setTagModalVisible(false);
      setEditingTag(null);
      await fetchTags();
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء حفظ التصنيف');
    }
  };

  const handleUpdateQuestionTags = async (tagIds: number[]) => {
    if (!selectedQuestion) return;

    try {
      // تحديث محلي فوري (optimistic update)
      const updatedTags = (tags || []).filter(tag => tagIds.includes(tag.id));
      
      // تحديث selectedQuestion في الـ state
      const updatedSelectedQuestion = {
        ...selectedQuestion,
        tags: updatedTags,
      };
      setSelectedQuestion(updatedSelectedQuestion);

      // تحديث savedQuestions في الـ state
      const updatedSavedQuestions = savedQuestions.map(q => 
        q.id === selectedQuestion.id 
          ? { ...q, tags: updatedTags }
          : q
      );
      setSavedQuestions(updatedSavedQuestions);

      // تحديث في الـ API (في الخلفية بدون انتظار)
      api.put<{ ok: boolean; data: any }>(
        API_ENDPOINTS.UPDATE_SAVED_QUESTION(selectedQuestion.id),
        {
          tag_ids: tagIds,
        }
      ).catch(error => {
        // في حالة الخطأ، نعيد fetch للبيانات الصحيحة
        console.error('Error updating tags:', error);
        fetchSavedQuestions();
      });

    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تحديث التصنيفات');
      // في حالة الخطأ، نعيد fetch
      fetchSavedQuestions();
    }
  };

  const handleTagLongPress = (tag: Tag) => {
    Alert.alert(
      'إدارة التصنيف',
      `ماذا تريد أن تفعل مع "${tag.name}"؟`,
      [
        {
          text: 'تعديل',
          onPress: () => {
            setEditingTag(tag);
            setTagModalVisible(true);
          },
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => handleDeleteTag(tag),
        },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
  };

  const handleDeleteTag = async (tag: Tag) => {
    Alert.alert(
      'حذف التصنيف',
      `هل تريد حذف التصنيف "${tag.name}"؟`,
      [
        {
          text: 'حذف التصنيف فقط',
          onPress: async () => {
            try {
              await api.delete(API_ENDPOINTS.TAG(tag.id));
              await fetchTags();
            } catch (error: any) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء حذف التصنيف');
            }
          },
        },
        {
          text: 'حذف التصنيف والأسئلة',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`${API_ENDPOINTS.TAG(tag.id)}?delete_questions=true`);
              await fetchData();
            } catch (error: any) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء حذف التصنيف');
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
  };

  const getUniqueTrackIds = () => {
    const trackIds = new Set<number>();
    savedQuestions.forEach(q => {
      if (q.question.lesson.track_id) {
        trackIds.add(q.question.lesson.track_id);
      }
    });
    return Array.from(trackIds);
  };

  const getTrackName = (trackId: number) => {
    const question = savedQuestions.find(q => q.question.lesson.track_id === trackId);
    return question?.question.lesson.track?.name || 'تراك';
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const uniqueTrackIds = getUniqueTrackIds();

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>محفوظاتي</Text>
          <View style={styles.headerIcon}>
            <MaterialIcons name="bookmark" size={24} color="#D4AF37" />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D4AF37"
              colors={['#D4AF37']}
            />
          }
        >
          {savedQuestions.length === 0 ? (
            // Empty State
            <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="bookmark-border" size={80} color="#8FA4C0" />
              </View>
              <Text style={styles.emptyTitle}>لا توجد أسئلة محفوظة</Text>
              <Text style={styles.emptyDescription}>
                ابدأ بحفظ الأسئلة المهمة أثناء حل الاختبارات لمراجعتها لاحقاً
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Tag Filters */}
              <TagFilterBar
                tags={tags}
                activeTagId={activeTagId}
                onTagPress={handleTagPress}
                onAddPress={handleAddTag}
                onTagLongPress={handleTagLongPress}
              />

              {/* Track Filters */}
              {uniqueTrackIds.length > 1 && (
                <View style={styles.trackFiltersSection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.trackFiltersContainer}
                  >
                    <TouchableOpacity
                      style={[
                        styles.trackFilterChip,
                        selectedTrackId === null && styles.trackFilterChipActive,
                        { borderColor: '#D4AF37' },
                      ]}
                      onPress={() => setSelectedTrackId(null)}
                    >
                      <Text
                        style={[
                          styles.trackFilterText,
                          selectedTrackId === null && { color: '#D4AF37' },
                        ]}
                      >
                        جميع التراكز
                      </Text>
                    </TouchableOpacity>

                    {uniqueTrackIds.map(trackId => (
                      <TouchableOpacity
                        key={trackId}
                        style={[
                          styles.trackFilterChip,
                          selectedTrackId === trackId && styles.trackFilterChipActive,
                          { borderColor: getTrackColor(trackId) },
                        ]}
                        onPress={() => setSelectedTrackId(trackId)}
                      >
                        <Text
                          style={[
                            styles.trackFilterText,
                            selectedTrackId === trackId && { color: getTrackColor(trackId) },
                          ]}
                        >
                          {getTrackName(trackId)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Questions List */}
              <View style={styles.questionsList}>
                {filteredQuestions.length === 0 ? (
                  <View style={styles.noResultsContainer}>
                    <MaterialIcons name="search-off" size={48} color="#8FA4C0" />
                    <Text style={styles.noResultsText}>لا توجد نتائج</Text>
                  </View>
                ) : (
                  filteredQuestions.map((saved, index) => (
                    <SavedQuestionCard
                      key={saved.id}
                      id={saved.id}
                      stem={saved.question.stem}
                      lessonName={saved.question.lesson.title}
                      categoryName={saved.question.lesson.category?.name}
                      trackName={saved.question.lesson.track?.name}
                      trackColor={getTrackColor(saved.question.lesson.track_id)}
                      hasNote={!!saved.note}
                      tags={saved.tags}
                      createdAt={saved.created_at}
                      onPress={() => handleCardPress(saved)}
                      index={index}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Preview Sheet */}
        {selectedQuestion && (
          <QuestionPreviewSheet
            visible={previewVisible}
            questionStem={selectedQuestion.question.stem}
            lessonName={selectedQuestion.question.lesson.title}
            hasNote={!!selectedQuestion.note}
            tags={selectedQuestion.tags}
            allTags={tags}
            savedQuestionId={selectedQuestion.id}
            onClose={() => setPreviewVisible(false)}
            onViewPress={handleViewPress}
            onPracticePress={handlePracticePress}
            onTagsUpdate={handleUpdateQuestionTags}
          />
        )}

        {/* Tag Manager Modal */}
        <TagManagerModal
          visible={tagModalVisible}
          onClose={() => {
            setTagModalVisible(false);
            setEditingTag(null);
          }}
          onSave={handleSaveTag}
          editingTag={editingTag}
        />
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8FA4C0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 16,
  },
  emptyIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(143, 164, 192, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8FA4C0',
    textAlign: 'center',
    lineHeight: 24,
  },
  trackFiltersSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  trackFiltersContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  trackFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
  },
  trackFilterChipActive: {
    backgroundColor: 'rgba(18, 38, 57, 0.8)',
  },
  trackFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8FA4C0',
  },
  questionsList: {
    marginTop: 16,
  },
  noResultsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  noResultsText: {
    fontSize: 16,
    color: '#8FA4C0',
  },
});
