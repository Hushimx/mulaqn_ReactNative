import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Article {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  track?: {
    id: number;
    name: string;
  };
}

interface RelatedArticle {
  id: number;
  title: string;
  excerpt?: string;
}

export default function ArticleDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isRTL, textAlign } = useLanguage();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // إخفاء الـ header
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation])
  );

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: Article }>(
        API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE_ARTICLE(Number(id))
      );
      
      if (response?.ok && response.data) {
        setArticle(response.data);
        // Fetch related articles
        fetchRelatedArticles(response.data.title);
      } else {
        Alert.alert('خطأ', 'المقال غير موجود');
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching article:', error);
      // Check if it's a 404 error
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        Alert.alert('خطأ', 'المقال غير موجود');
      } else {
      Alert.alert('خطأ', 'فشل تحميل المقال');
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedArticles = async (title: string) => {
    try {
      const response = await api.get<{ ok: boolean; data: RelatedArticle[] }>(
        `${API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE_SUGGEST}?q=${encodeURIComponent(title)}`
      );
      if (response?.ok && response.data) {
        setRelatedArticles(response.data.filter(a => a.id !== Number(id)).slice(0, 5));
      }
    } catch (error) {
      console.log('Related articles not available');
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (feedbackSent) {
      Alert.alert('تنبيه', 'لقد قمت بتقييم هذا المقال مسبقاً');
      return;
    }

    try {
      const endpoint = isHelpful
        ? API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE_HELPFUL(Number(id))
        : API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE_NOT_HELPFUL(Number(id));
      
      await api.post(endpoint);
      setFeedbackSent(true);
      Alert.alert('شكراً لك', 'تم تسجيل تقييمك بنجاح');
      fetchArticle();
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل إرسال التقييم');
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!article) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#EF4444" />
            <Text style={styles.errorText}>لم يتم العثور على المقال</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign }]}>المقال</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Article Content */}
          <View style={styles.articleContent}>
            <Text style={styles.articleTitle}>{article.title}</Text>
            
            <View style={styles.articleMeta}>
              <Text style={styles.articleMetaText}>
                <MaterialIcons name="visibility" size={14} color="#64748B" /> {article.view_count} مشاهدة
              </Text>
              <Text style={styles.articleMetaText}>
                <MaterialIcons name="thumb-up" size={14} color="#64748B" /> {article.helpful_count} مفيد
              </Text>
              {article.track && (
                <Text style={styles.articleMetaText}>
                  <MaterialIcons name="school" size={14} color="#64748B" /> {article.track.name}
                </Text>
              )}
            </View>

            <Text style={styles.articleBody}>{article.content}</Text>
          </View>

          {/* Feedback */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackTitle}>هل كانت هذه المقالة مفيدة؟</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.feedbackButtonHelpful]}
                onPress={() => handleFeedback(true)}
                disabled={feedbackSent}
              >
                <MaterialIcons name="thumb-up" size={20} color="#10B981" />
                <Text style={styles.feedbackButtonText}>نعم، مفيدة</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.feedbackButtonNotHelpful]}
                onPress={() => handleFeedback(false)}
                disabled={feedbackSent}
              >
                <MaterialIcons name="thumb-down" size={20} color="#EF4444" />
                <Text style={styles.feedbackButtonText}>لا، غير مفيدة</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>مقالات ذات صلة</Text>
              {relatedArticles.map((related) => (
                <TouchableOpacity
                  key={related.id}
                  style={styles.relatedCard}
                  onPress={() => router.push(`/support/knowledge-base/${related.id}`)}
                >
                  <Text style={styles.relatedCardTitle}>{related.title}</Text>
                  {related.excerpt && (
                    <Text style={styles.relatedCardExcerpt} numberOfLines={2}>
                      {related.excerpt}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#F8F9FA',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  articleContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  articleTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 16,
    lineHeight: 36,
  },
  articleMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    flexWrap: 'wrap',
  },
  articleMetaText: {
    fontSize: 14,
    color: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articleBody: {
    fontSize: 16,
    color: '#F8F9FA',
    lineHeight: 28,
  },
  feedbackSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 16,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackButtonHelpful: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackButtonNotHelpful: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  feedbackButtonText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '600',
  },
  relatedSection: {
    marginTop: 24,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 16,
  },
  relatedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  relatedCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 8,
  },
  relatedCardExcerpt: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
});

