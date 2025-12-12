import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
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
  excerpt?: string;
  content?: string;
  view_count: number;
  helpful_count: number;
  track?: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  icon?: string;
}

export default function KnowledgeBaseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { isRTL, textAlign } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.q || '');

  // إخفاء الـ header
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation])
  );

  useEffect(() => {
    fetchData();
  }, [params.category]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesRes = await api.get<{ ok: boolean; data: Category[] }>(
        API_ENDPOINTS.SUPPORT_CATEGORIES
      );
      if (categoriesRes?.ok && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      // Fetch articles
      const params = new URLSearchParams();
      if (params.category) params.append('category', params.category);
      
      const articlesRes = await api.get<{ ok: boolean; data: Article[] }>(
        `${API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE}?${params.toString()}`
      );
      
      if (articlesRes?.ok && articlesRes.data) {
        setArticles(articlesRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length >= 2) {
      try {
        setLoading(true);
        const response = await api.get<{ ok: boolean; data: Article[] }>(
          `${API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE_SEARCH}?q=${encodeURIComponent(searchQuery)}`
        );
        if (response?.ok && response.data) {
          setArticles(response.data);
        }
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
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

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign }]}>قاعدة المعرفة</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        >
          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث في المقالات..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <MaterialIcons name="search" size={24} color="#0F1419" />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                <TouchableOpacity
                  style={[styles.categoryChip, !params.category && styles.categoryChipActive]}
                  onPress={() => router.push('/support/knowledge-base')}
                >
                  <Text style={[styles.categoryChipText, !params.category && styles.categoryChipTextActive]}>
                    الكل
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryChip, params.category === category.name && styles.categoryChipActive]}
                    onPress={() => router.push({
                      pathname: '/support/knowledge-base',
                      params: { category: category.name },
                    })}
                  >
                    <Text style={[styles.categoryChipText, params.category === category.name && styles.categoryChipTextActive]}>
                      {category.icon || '📁'} {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Articles */}
          {articles.length > 0 ? (
            <View style={styles.articlesList}>
              {articles.map((article) => (
                <TouchableOpacity
                  key={article.id}
                  style={styles.articleCard}
                  onPress={() => router.push(`/support/knowledge-base/${article.id}`)}
                >
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  {(article.excerpt || article.content) && (
                    <Text style={styles.articleExcerpt} numberOfLines={2}>
                      {article.excerpt || article.content?.substring(0, 120)}
                    </Text>
                  )}
                  <View style={styles.articleFooter}>
                    <Text style={styles.articleStat}>
                      <MaterialIcons name="visibility" size={14} color="#64748B" /> {article.view_count}
                    </Text>
                    <Text style={styles.articleStat}>
                      <MaterialIcons name="thumb-up" size={14} color="#64748B" /> {article.helpful_count}
                    </Text>
                    {article.track && (
                      <Text style={styles.articleStat}>
                        <MaterialIcons name="school" size={14} color="#64748B" /> {article.track.name}
                      </Text>
                    )}
                    <MaterialIcons name="chevron-left" size={20} color="#64748B" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="menu-book" size={64} color="rgba(255, 255, 255, 0.1)" />
              <Text style={styles.emptyStateTitle}>لا توجد مقالات</Text>
              <Text style={styles.emptyStateText}>جرب البحث بكلمات مختلفة</Text>
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
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#F8F9FA',
    fontSize: 16,
    fontFamily: 'Cairo',
  },
  searchButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 15,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  categoryChipText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#0F1419',
  },
  articlesList: {
    gap: 16,
  },
  articleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 12,
  },
  articleExcerpt: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  articleStat: {
    fontSize: 12,
    color: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

