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
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Article {
  id: number;
  title: string;
  excerpt?: string;
  view_count: number;
  helpful_count: number;
}

interface Category {
  id: number;
  name: string;
  icon?: string;
}

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  status: string;
  created_at: string;
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch popular articles
      try {
        const articlesRes = await api.get<{ ok: boolean; data: Article[] }>(
          API_ENDPOINTS.SUPPORT_KNOWLEDGE_BASE_POPULAR
        );
        if (articlesRes?.ok && articlesRes.data) {
          setPopularArticles(articlesRes.data.slice(0, 6));
        }
      } catch (err) {
        console.log('Articles not available');
      }

      // Fetch categories
      try {
        const categoriesRes = await api.get<{ ok: boolean; data: Category[] }>(
          API_ENDPOINTS.SUPPORT_CATEGORIES
        );
        if (categoriesRes?.ok && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
      } catch (err) {
        console.log('Categories not available');
      }

      // Fetch recent tickets
      try {
        const ticketsRes = await api.get<{ ok: boolean; data: Ticket[] }>(
          API_ENDPOINTS.SUPPORT_TICKETS
        );
        if (ticketsRes?.ok && ticketsRes.data) {
          setRecentTickets(ticketsRes.data.slice(0, 5));
        }
      } catch (err) {
        console.log('Tickets not available');
      }
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
      router.push({
        pathname: '/support/knowledge-base',
        params: { q: searchQuery },
      });
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Developer Tools Button (Development Only) */}
          {__DEV__ && (
            <View style={styles.developerToolsContainer}>
              <TouchableOpacity
                style={styles.developerToolsBtn}
                onPress={() => setShowDeveloperTools(true)}
              >
                <MaterialIcons name="code" size={20} color="#D4AF37" />
                <Text style={styles.developerToolsText}>المطور</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>مركز المساعدة</Text>
            <Text style={styles.description}>كيف يمكننا مساعدتك اليوم؟</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث في قاعدة المعرفة..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <MaterialIcons name="search" size={24} color="#0F1419" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/support/tickets/create')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(212, 175, 55, 0.2)' }]}>
                <MaterialIcons name="add-circle" size={32} color="#D4AF37" />
              </View>
              <Text style={styles.quickActionTitle}>إنشاء تذكرة جديدة</Text>
              <Text style={styles.quickActionDescription}>أبلغنا عن مشكلة أو استفسار</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/support/tickets')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <MaterialIcons name="list" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionTitle}>تذاكري</Text>
              <Text style={styles.quickActionDescription}>عرض ومتابعة جميع تذاكري</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/support/knowledge-base')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <MaterialIcons name="menu-book" size={32} color="#10B981" />
              </View>
              <Text style={styles.quickActionTitle}>قاعدة المعرفة</Text>
              <Text style={styles.quickActionDescription}>مقالات وأسئلة شائعة</Text>
            </TouchableOpacity>
          </View>

          {/* Popular Articles */}
          {popularArticles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="local-fire-department" size={24} color="#D4AF37" /> مقالات شائعة
              </Text>
              <View style={styles.articlesGrid}>
                {popularArticles.map((article) => (
                  <TouchableOpacity
                    key={article.id}
                    style={styles.articleCard}
                    onPress={() => router.push(`/support/knowledge-base/${article.id}`)}
                  >
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    {article.excerpt && (
                      <Text style={styles.articleExcerpt} numberOfLines={2}>
                        {article.excerpt}
                      </Text>
                    )}
                    <View style={styles.articleStats}>
                      <Text style={styles.articleStat}>
                        <MaterialIcons name="visibility" size={14} color="#64748B" /> {article.view_count}
                      </Text>
                      <Text style={styles.articleStat}>
                        <MaterialIcons name="thumb-up" size={14} color="#64748B" /> {article.helpful_count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="folder" size={24} color="#D4AF37" /> الفئات
              </Text>
              <View style={styles.categoriesGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => router.push({
                      pathname: '/support/knowledge-base',
                      params: { category: category.name },
                    })}
                  >
                    <Text style={styles.categoryIcon}>{category.icon || '📁'}</Text>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Recent Tickets */}
          {recentTickets.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="schedule" size={24} color="#D4AF37" /> تذاكري الأخيرة
              </Text>
              <View style={styles.ticketsList}>
                {recentTickets.map((ticket) => (
                  <TouchableOpacity
                    key={ticket.id}
                    style={styles.ticketCard}
                    onPress={() => router.push(`/support/tickets/${ticket.id}`)}
                  >
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
                      <View style={[
                        styles.ticketStatus,
                        ticket.status === 'open' && styles.ticketStatusOpen,
                        ticket.status === 'resolved' && styles.ticketStatusResolved,
                        ticket.status === 'closed' && styles.ticketStatusClosed,
                      ]}>
                        <Text style={styles.ticketStatusText}>
                          {ticket.status === 'open' ? 'مفتوحة' : 
                           ticket.status === 'resolved' ? 'محلولة' : 'مغلقة'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                    <MaterialIcons name="chevron-left" size={20} color="#64748B" style={styles.ticketArrow} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/support/tickets')}
              >
                <Text style={styles.viewAllButtonText}>عرض جميع التذاكر</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Developer Tools Modal */}
        {__DEV__ && (
          <Modal
            visible={showDeveloperTools}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDeveloperTools(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    <MaterialIcons name="code" size={24} color="#D4AF37" /> أدوات المطور
                  </Text>
                  <TouchableOpacity onPress={() => setShowDeveloperTools(false)}>
                    <MaterialIcons name="close" size={24} color="#F8F9FA" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  {/* Debug Login Buttons */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🔧 حسابات تجريبية</Text>
                    <TouchableOpacity
                      style={[styles.debugButton, user?.email === 'student@mulaqn.test' && styles.debugButtonActive]}
                      onPress={async () => {
                        try {
                          await login('student@mulaqn.test', 'password');
                          Alert.alert('✅', 'تم تسجيل الدخول كطالب مشترك بكل المسارات');
                          setShowDeveloperTools(false);
                          router.push('/(tabs)');
                        } catch (error) {
                          Alert.alert('❌', 'فشل تسجيل الدخول');
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading && user?.email === 'student@mulaqn.test' ? (
                        <ActivityIndicator color="#D4AF37" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle" size={20} color={user?.email === 'student@mulaqn.test' ? '#D4AF37' : '#FFFFFF'} />
                          <Text style={[styles.debugButtonText, user?.email === 'student@mulaqn.test' && styles.debugButtonTextActive]}>
                            مشترك بكل المسارات
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.debugButton, user?.email === 'student.nosub@mulaqn.test' && styles.debugButtonActive]}
                      onPress={async () => {
                        try {
                          await login('student.nosub@mulaqn.test', 'password');
                          Alert.alert('✅', 'تم تسجيل الدخول كطالب غير مشترك');
                          setShowDeveloperTools(false);
                          router.push('/(tabs)');
                        } catch (error) {
                          Alert.alert('❌', 'فشل تسجيل الدخول');
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading && user?.email === 'student.nosub@mulaqn.test' ? (
                        <ActivityIndicator color="#D4AF37" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="cancel" size={20} color={user?.email === 'student.nosub@mulaqn.test' ? '#D4AF37' : '#FFFFFF'} />
                          <Text style={[styles.debugButtonText, user?.email === 'student.nosub@mulaqn.test' && styles.debugButtonTextActive]}>
                            غير مشترك
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.debugButton, user?.email === 'student.qudrat@mulaqn.test' && styles.debugButtonActive]}
                      onPress={async () => {
                        try {
                          await login('student.qudrat@mulaqn.test', 'password');
                          Alert.alert('✅', 'تم تسجيل الدخول كطالب مشترك بقدرات فقط');
                          setShowDeveloperTools(false);
                          router.push('/(tabs)');
                        } catch (error) {
                          Alert.alert('❌', 'فشل تسجيل الدخول');
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading && user?.email === 'student.qudrat@mulaqn.test' ? (
                        <ActivityIndicator color="#D4AF37" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="star" size={20} color={user?.email === 'student.qudrat@mulaqn.test' ? '#D4AF37' : '#FFFFFF'} />
                          <Text style={[styles.debugButtonText, user?.email === 'student.qudrat@mulaqn.test' && styles.debugButtonTextActive]}>
                            مشترك بقدرات فقط
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.debugButton, user?.email === 'osamahparadox@gmail.com' && styles.debugButtonActive]}
                      onPress={async () => {
                        try {
                          await login('osamahparadox@gmail.com', 'password');
                          Alert.alert('✅', 'تم تسجيل الدخول بالحساب الرسمي');
                          setShowDeveloperTools(false);
                          router.push('/(tabs)');
                        } catch (error) {
                          Alert.alert('❌', 'فشل تسجيل الدخول');
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading && user?.email === 'osamahparadox@gmail.com' ? (
                        <ActivityIndicator color="#D4AF37" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="verified" size={20} color={user?.email === 'osamahparadox@gmail.com' ? '#D4AF37' : '#FFFFFF'} />
                          <Text style={[styles.debugButtonText, user?.email === 'osamahparadox@gmail.com' && styles.debugButtonTextActive]}>
                            حساب رسمي (للإيميلات)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Quick Links */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🔗 روابط سريعة</Text>
                    <TouchableOpacity
                      style={styles.quickLink}
                      onPress={() => {
                        setShowDeveloperTools(false);
                        router.push('/login');
                      }}
                    >
                      <MaterialIcons name="login" size={20} color="#D4AF37" />
                      <Text style={styles.quickLinkText}>تسجيل الدخول</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickLink}
                      onPress={() => {
                        setShowDeveloperTools(false);
                        router.push('/register');
                      }}
                    >
                      <MaterialIcons name="person-add" size={20} color="#D4AF37" />
                      <Text style={styles.quickLinkText}>تسجيل حساب جديد</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickLink}
                      onPress={() => {
                        setShowDeveloperTools(false);
                        router.push('/welcome');
                      }}
                    >
                      <MaterialIcons name="school" size={20} color="#D4AF37" />
                      <Text style={styles.quickLinkText}>Onboarding</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
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
  developerToolsContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  developerToolsBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  developerToolsText: {
    color: '#D4AF37',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
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
  quickActions: {
    gap: 16,
    marginBottom: 32,
  },
  quickActionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
  },
  quickActionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  articlesGrid: {
    gap: 12,
  },
  articleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  articleStats: {
    flexDirection: 'row',
    gap: 16,
  },
  articleStat: {
    fontSize: 12,
    color: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  ticketsList: {
    gap: 12,
    marginBottom: 16,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ticketNumber: {
    backgroundColor: '#D4AF37',
    color: '#0F1419',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontWeight: '700',
    fontSize: 12,
  },
  ticketStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  ticketStatusOpen: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3B82F6',
  },
  ticketStatusResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
  },
  ticketStatusClosed: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    color: '#64748B',
  },
  ticketStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 8,
  },
  ticketArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  viewAllButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#0F1419',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#102A43',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  debugButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButtonTextActive: {
    color: '#D4AF37',
  },
  quickLink: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  quickLinkText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '600',
  },
});

