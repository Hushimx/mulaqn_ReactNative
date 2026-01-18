import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AvatarDisplay } from '@/components/profile/AvatarDisplay';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInUp, FadeInDown, ZoomIn, BounceIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ParticipantResult {
  user_id: number;
  name: string;
  score: number;
  errors_count: number;
  percentage: number;
  avatar_shape?: string | null;
  avatar_color?: string | null;
}

interface Breakdown {
  category_name: string;
  user1_score: number;
  user2_score: number;
}

interface Results {
  winner: ParticipantResult;
  participants: ParticipantResult[];
  breakdown: Breakdown[];
  total_questions: number;
  completed_at: string;
}

export default function MultiplayerResultsScreen() {
  const router = useRouter();
  const { sessionId, reason } = useLocalSearchParams<{ sessionId: string; reason?: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Results | null>(null);

  const sessionIdNum = parseInt(sessionId || '0');
  const colors = getTrackColors(1) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };
  const currentUserId = user?.id || 0;

  useEffect(() => {
    fetchResults();
  }, [sessionIdNum]);

  const fetchResults = async () => {
    try {
      const response = await api.get<{
        ok: boolean;
        data: Results;
      }>(API_ENDPOINTS.MULTIPLAYER_RESULTS(sessionIdNum));

      if (response && response.ok && response.data) {
        setResults(response.data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/');
  };

  if (loading || !results) {
    return (
      <GradientBackground colors={colors.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const isWinner = results.winner.user_id === currentUserId;
  const myResult = results.participants.find((p) => p.user_id === currentUserId);
  const otherResult = results.participants.find((p) => p.user_id !== currentUserId);

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Winner Badge */}
        <Animated.View entering={ZoomIn.duration(800)} style={styles.winnerContainer}>
          {isWinner ? (
            <>
              <MaterialIcons name="emoji-events" size={80} color="#D4AF37" />
              <Text style={styles.winnerText}>🏆 فزت!</Text>
              {reason === 'timeout' && (
                <Text style={styles.winnerSubtext}>انقطع اتصال صديقك</Text>
              )}
            </>
          ) : (
            <>
              <MaterialIcons name="sentiment-dissatisfied" size={80} color="#94A3B8" />
              <Text style={styles.winnerText}>خسرت</Text>
              {reason === 'timeout' && (
                <Text style={styles.winnerSubtext}>انقطع اتصالك</Text>
              )}
            </>
          )}
        </Animated.View>

        {/* Results Comparison */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>النتائج</Text>

          {/* My Result */}
          {myResult && (
            <View
              style={[
                styles.resultCard,
                isWinner && { borderColor: '#D4AF37', borderWidth: 2 },
              ]}
            >
              <View style={styles.resultHeader}>
                <AvatarDisplay
                  shape={myResult.avatar_shape || undefined}
                  color={myResult.avatar_color || undefined}
                  size={48}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{myResult.name} (أنت)</Text>
                  <Text style={styles.resultScore}>
                    {myResult.score} / {results.total_questions}
                  </Text>
                </View>
                <Text style={[styles.resultPercentage, { color: colors.primary }]}>
                  {myResult.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}

          {/* Other Result */}
          {otherResult && (
            <View
              style={[
                styles.resultCard,
                !isWinner && { borderColor: '#D4AF37', borderWidth: 2 },
              ]}
            >
              <View style={styles.resultHeader}>
                <AvatarDisplay
                  shape={otherResult.avatar_shape || undefined}
                  color={otherResult.avatar_color || undefined}
                  size={48}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{otherResult.name}</Text>
                  <Text style={styles.resultScore}>
                    {otherResult.score} / {results.total_questions}
                  </Text>
                </View>
                <Text style={[styles.resultPercentage, { color: colors.primary }]}>
                  {otherResult.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Breakdown */}
        {results.breakdown && results.breakdown.length > 0 && (
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>التفاصيل حسب المادة</Text>
            {results.breakdown.map((item, index) => {
              const myScore = item.user1_score === (myResult?.score || 0) ? item.user1_score : item.user2_score;
              const otherScore = item.user1_score === (myResult?.score || 0) ? item.user2_score : item.user1_score;
              const myBetter = myScore > otherScore;

              return (
                <View key={index} style={styles.breakdownItem}>
                  <Text style={styles.breakdownCategory}>{item.category_name}</Text>
                  <View style={styles.breakdownScores}>
                    <View style={[styles.breakdownScore, myBetter && styles.breakdownScoreWinner]}>
                      <Text style={styles.breakdownScoreLabel}>أنت</Text>
                      <Text style={styles.breakdownScoreValue}>{myScore}</Text>
                    </View>
                    <View style={[styles.breakdownScore, !myBetter && styles.breakdownScoreWinner]}>
                      <Text style={styles.breakdownScoreLabel}>
                        {otherResult?.name || 'صديقك'}
                      </Text>
                      <Text style={styles.breakdownScoreValue}>{otherScore}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Home Button */}
        <Animated.View entering={FadeInUp.duration(600).delay(600)}>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: colors.primary }]}
            onPress={handleHome}
          >
            <MaterialIcons name="home" size={24} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  winnerText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  winnerSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  comparisonContainer: {
    marginBottom: 32,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  resultPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  breakdownContainer: {
    marginBottom: 32,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  breakdownItem: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  breakdownCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  breakdownScores: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownScore: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  breakdownScoreWinner: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  breakdownScoreLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  breakdownScoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  homeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

