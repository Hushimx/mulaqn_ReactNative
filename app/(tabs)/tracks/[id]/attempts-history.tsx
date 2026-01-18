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
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';

interface AssessmentAttempt {
  id: number;
  assessment_id: number;
  assessment: {
    id: number;
    name: string;
    type: 'periodic' | 'diagnostic' | 'simulation';
  };
  raw_score: number;
  score_total: number;
  percentage: number;
  submitted_at: string;
  time_spent_sec: number;
  correct_answers_count: number;
}

export default function AttemptsHistoryScreen() {
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const trackId = parseInt(id);
  const colors = getTrackColors(trackId);

  useEffect(() => {
    fetchAttempts();
  }, [trackId]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ ok: boolean; data: AssessmentAttempt[] }>(
        API_ENDPOINTS.RECENT_ATTEMPTS(trackId)
      );

      if (response && response.ok && response.data) {
        setAttempts(response.data);
      } else {
        setError('فشل تحميل البيانات');
      }
    } catch (err) {
      logger.error('Error fetching attempts:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 70) return '#F59E0B';
    if (percentage >= 50) return '#F97316';
    return '#EF4444';
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'periodic': return '⚡';
      case 'diagnostic': return '🎯';
      case 'simulation': return '🏆';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons 
                name={isRTL ? "arrow-forward" : "arrow-back"} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>سجل الاختبارات</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground colors={colors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons 
                name={isRTL ? "arrow-forward" : "arrow-back"} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>سجل الاختبارات</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={fetchAttempts}
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
        <View style={[styles.header, { flexDirection }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>سجل الاختبارات</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {attempts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>لا توجد اختبارات مكتملة بعد</Text>
              <Text style={styles.emptySubtext}>
                ابدأ بحل الاختبارات لترى سجلك هنا
              </Text>
            </View>
          ) : (
            <View style={styles.attemptsList}>
              {attempts.map((attempt, index) => {
                const performanceColor = getPerformanceColor(attempt.percentage);
                
                return (
                  <Animated.View
                    key={attempt.id}
                    entering={FadeInUp.duration(500).delay(index * 100)}
                  >
                    <TouchableOpacity
                      style={[styles.attemptCard, { borderColor: `${performanceColor}40` }]}
                      onPress={() => {
                        router.push(`/assessments/${attempt.assessment_id}/review?attemptId=${attempt.id}`);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.attemptHeader}>
                        <View style={styles.attemptInfo}>
                          <Text style={styles.attemptIcon}>
                            {getAssessmentIcon(attempt.assessment.type)}
                          </Text>
                          <View style={styles.attemptTextContainer}>
                            <Text style={styles.attemptName} numberOfLines={2}>
                              {attempt.assessment.name}
                            </Text>
                            <Text style={styles.attemptDate}>
                              {new Date(attempt.submitted_at).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.attemptPercentage, { color: performanceColor }]}>
                          {attempt.percentage}%
                        </Text>
                      </View>
                      
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${attempt.percentage}%`,
                                backgroundColor: performanceColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      
                      <View style={styles.attemptStats}>
                        <View style={styles.attemptStatItem}>
                          <Text style={styles.attemptStatNumber}>{attempt.correct_answers_count}</Text>
                          <Text style={styles.attemptStatLabel}>صحيحة</Text>
                        </View>
                        <View style={styles.attemptStatItem}>
                          <Text style={styles.attemptStatNumber}>
                            {Math.floor(attempt.time_spent_sec / 60)}
                          </Text>
                          <Text style={styles.attemptStatLabel}>دقيقة</Text>
                        </View>
                        <View style={styles.attemptStatItem}>
                          <Text style={styles.attemptStatNumber}>{attempt.score_total}</Text>
                          <Text style={styles.attemptStatLabel}>إجمالي</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reviewButton}
                          onPress={() => {
                            router.push(`/assessments/${attempt.assessment_id}/review?attemptId=${attempt.id}`);
                          }}
                        >
                          <Text style={[styles.reviewButtonText, { color: '#D4AF37' }]}>
                            مراجعة →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  attemptsList: {
    gap: 12,
  },
  attemptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attemptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  attemptIcon: {
    fontSize: 32,
  },
  attemptTextContainer: {
    flex: 1,
  },
  attemptName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  attemptDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  attemptPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  attemptStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  attemptStatItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  attemptStatNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  attemptStatLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  reviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
