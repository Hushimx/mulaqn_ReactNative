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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface AssessmentResult {
  attempt_id: number;
  assessment_id: number;
  assessment_name: string;
  track_id: number;
  raw_score: number;
  score_total: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_taken_min: number;
  lessons_breakdown?: Array<{
    lesson_name: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
}

export default function AssessmentResultsScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Get attempt details with full results
      const response = await api.get<{ ok: boolean; data: any }>(
        `/assessment-attempts/${attemptId}`
      );
      
      if (response && response.ok && response.data) {
        const attemptData = response.data;
        
        // Transform to match AssessmentResult interface
        const resultData: AssessmentResult = {
          attempt_id: attemptData.id,
          assessment_id: attemptData.assessment.id,
          assessment_name: attemptData.assessment.name,
          track_id: attemptData.assessment.track?.id || attemptData.assessment?.track_id || 1,
          raw_score: attemptData.raw_score || 0,
          score_total: attemptData.score_total || attemptData.assessment.items?.length || 0,
          percentage: attemptData.score_total > 0 
            ? Math.round((attemptData.raw_score / attemptData.score_total) * 100 * 10) / 10
            : 0,
          correct_count: attemptData.responses?.filter((r: any) => r.is_correct).length || 0,
          incorrect_count: attemptData.responses?.filter((r: any) => !r.is_correct && r.selected_option_id).length || 0,
          unanswered_count: (attemptData.assessment.items?.length || 0) - (attemptData.responses?.length || 0),
          time_taken_min: attemptData.time_spent_sec 
            ? Math.round(attemptData.time_spent_sec / 60) 
            : 0,
          lessons_breakdown: attemptData.breakdown || [], // Now returns lessons breakdown instead of skills
        };
        
        setResult(resultData);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = () => {
    router.push(`/assessments/${id}/review?attemptId=${attemptId}`);
  };

  const handleHome = () => {
    router.push('/(tabs)/');
  };

  if (loading || !result) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const trackColors = getTrackColors(result.track_id);
  const isPassed = result.percentage >= 50;

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            {isPassed ? (
              <View style={[styles.successIcon, { borderColor: '#10B981' }]}>
                <MaterialIcons name="check" size={80} color="#10B981" />
              </View>
            ) : (
              <View style={[styles.successIcon, { borderColor: '#F59E0B' }]}>
                <MaterialIcons name="error-outline" size={80} color="#F59E0B" />
              </View>
            )}
          </View>

          {/* Result Title */}
          <Text style={styles.resultTitle}>
            {isPassed ? '🎉 مبروك!' : '💪 استمر في المحاولة'}
          </Text>
          <Text style={styles.resultSubtitle}>{result.assessment_name}</Text>

          {/* Main Score */}
          <View style={[styles.scoreCard, { borderColor: trackColors.primary }]}>
            <Text style={styles.scoreLabel}>درجتك النهائية</Text>
            <Text style={[styles.scoreValue, { color: trackColors.primary }]}>
              {result.raw_score} / {result.score_total}
            </Text>
            <View style={[styles.percentageTag, { backgroundColor: `${trackColors.primary}20`, borderColor: trackColors.primary }]}>
              <Text style={[styles.percentageText, { color: trackColors.primary }]}>
                {result.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Statistics Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: '#10B981' }]}>
              <MaterialIcons name="check-circle" size={32} color="#10B981" />
              <Text style={styles.statValue}>{result.correct_count}</Text>
              <Text style={styles.statLabel}>إجابة صحيحة</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#EF4444' }]}>
              <MaterialIcons name="cancel" size={32} color="#EF4444" />
              <Text style={styles.statValue}>{result.incorrect_count}</Text>
              <Text style={styles.statLabel}>إجابة خاطئة</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
              <MaterialIcons name="help-outline" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{result.unanswered_count}</Text>
              <Text style={styles.statLabel}>غير محلولة</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#3B82F6' }]}>
              <MaterialIcons name="access-time" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{result.time_taken_min}</Text>
              <Text style={styles.statLabel}>دقيقة</Text>
            </View>
          </View>

          {/* Lessons Breakdown */}
          {result.lessons_breakdown && result.lessons_breakdown.length > 0 && (
            <>
              <Text style={[styles.sectionTitle]}>
                📊 تحليل الأداء حسب الدروس
              </Text>
              
              <View style={styles.skillsList}>
                {result.lessons_breakdown.map((lesson, index) => (
                  <View key={index} style={styles.skillCard}>
                    <View style={[styles.skillHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.skillName]}>
                        {lesson.lesson_name}
                      </Text>
                      <Text style={styles.skillPercentage}>{lesson.percentage.toFixed(0)}%</Text>
                    </View>
                    
                    <View style={styles.skillProgressBar}>
                      <View 
                        style={[
                          styles.skillProgressFill, 
                          { 
                            width: `${lesson.percentage}%`,
                            backgroundColor: lesson.percentage >= 70 ? '#10B981' : lesson.percentage >= 50 ? '#F59E0B' : '#EF4444',
                          }
                        ]} 
                      />
                    </View>
                    
                    <Text style={styles.skillDetails}>
                      {lesson.correct} صحيحة من {lesson.total}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: trackColors.primary }]}
              onPress={handleReview}
              activeOpacity={0.8}
            >
              <MaterialIcons name="rate-review" size={22} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>مراجعة الإجابات</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleHome}
              activeOpacity={0.8}
            >
              <MaterialIcons name="home" size={22} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>العودة للرئيسية</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  successIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  scoreCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 12,
  },
  percentageTag: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  skillsList: {
    gap: 12,
    marginBottom: 24,
  },
  skillCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  skillPercentage: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skillProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  skillProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  skillDetails: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
});

