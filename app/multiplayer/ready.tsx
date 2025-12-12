import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInUp, FadeInDown, withRepeat, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Participant {
  user_id: number;
  name: string;
  is_ready: boolean;
}

export default function MultiplayerReadyScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const hasNavigated = useRef(false); // Prevent multiple navigations
  const gameStartTimeout = useRef<NodeJS.Timeout | null>(null);

  const sessionIdNum = parseInt(sessionId || '0');
  const colors = getTrackColors(1) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };

  // Animation for ready check pulse
  const pulseScale = useSharedValue(1);
  
  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.2, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    fetchStatus();
    startPolling();

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      if (gameStartTimeout.current) {
        clearTimeout(gameStartTimeout.current);
      }
    };
  }, [sessionIdNum]);

  const fetchStatus = async () => {
    try {
      const response = await api.get<{
        ok: boolean;
        data: {
          status: string;
          participants: Participant[];
        };
      }>(API_ENDPOINTS.MULTIPLAYER_STATUS(sessionIdNum));

      if (response && response.ok && response.data) {
        setParticipants(response.data.participants);
        const userReady = response.data.participants.find((p) => p.is_ready);
        setIsReady(!!userReady);
        
        // Check if all participants are ready
        const allReady = response.data.participants.length === 2 && 
                         response.data.participants.every(p => p.is_ready);

        // If both ready and status is ready, show message and wait before starting
        if (allReady && response.data.status === 'ready' && !gameStartTimeout.current) {
          setAllReady(true);
          
          // Wait 3 seconds to let users read, then start the game
          gameStartTimeout.current = setTimeout(async () => {
            try {
              await api.post(API_ENDPOINTS.MULTIPLAYER_READY(sessionIdNum));
              // Wait a bit then check status again
              setTimeout(() => {
                fetchStatus();
              }, 500);
            } catch (error) {
              console.error('Error starting game:', error);
            }
          }, 3000); // Wait 3 seconds before starting
        }

        // If both ready, wait a bit before navigating to game (give users time to read)
        if (response.data.status === 'in_progress' && !hasNavigated.current) {
          hasNavigated.current = true;
          
          // Clear any pending timeouts
          if (gameStartTimeout.current) {
            clearTimeout(gameStartTimeout.current);
            gameStartTimeout.current = null;
          }
          
          // Stop polling
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          
          setTimeout(() => {
            router.replace({
              pathname: '/multiplayer/game',
              params: { sessionId: sessionIdNum.toString() }
            });
          }, 3000); // Wait 3 seconds before navigating
        }

        // If session cancelled
        if (response.data.status === 'cancelled') {
          router.replace({
            pathname: '/multiplayer/disconnected',
            params: { reason: 'left', sessionId: sessionIdNum.toString() }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const startPolling = () => {
    pollingInterval.current = setInterval(() => {
      fetchStatus();
    }, 1500);
  };

  const handleReady = async () => {
    if (loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const response = await api.post<{
        ok: boolean;
        data: { status: string; all_ready: boolean };
      }>(API_ENDPOINTS.MULTIPLAYER_READY(sessionIdNum));

      if (response && response.ok && response.data) {
        setIsReady(true);
        setAllReady(response.data.all_ready);

        if (response.data.all_ready) {
          // Wait a bit before navigating to game (give users time to read)
          setTimeout(() => {
            router.replace({
              pathname: '/multiplayer/game',
              params: { sessionId: sessionIdNum.toString() }
            });
          }, 3000); // Wait 3 seconds before navigating
        }
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل تحديث الحالة');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    Alert.alert(
      'تأكيد الانسحاب',
      'إذا ضغطت استعد، ما تقدر تغيّر الإعدادات بعدين. هل أنت متأكد من رغبتك في مغادرة الجلسة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، مغادرة',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(API_ENDPOINTS.MULTIPLAYER_LEAVE(sessionIdNum));
              router.back();
            } catch (error: any) {
              Alert.alert('خطأ', error.message || 'فشل مغادرة الجلسة');
            }
          },
        },
      ]
    );
  };

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleLeave}
          >
            <MaterialIcons
              name={flexDirection === 'row-reverse' ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.title}>الاستعداد</Text>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.infoCard}>
            <MaterialIcons name="info" size={48} color={colors.primary} />
            <Text style={styles.infoText}>
              إذا ضغطت استعد، ما تقدر تغيّر الإعدادات بعدين
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.participantsContainer}>
            <Text style={styles.participantsTitle}>المشاركون</Text>
            {participants.map((participant) => (
              <View key={participant.user_id} style={styles.participantCard}>
                <View style={[styles.participantAvatar, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                </View>
                {participant.is_ready ? (
                  <Animated.View style={pulseStyle}>
                    <MaterialIcons name="check-circle" size={32} color={colors.primary} />
                  </Animated.View>
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={32} color="rgba(255, 255, 255, 0.3)" />
                )}
              </View>
            ))}
          </Animated.View>

          {allReady && (
            <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.startingCard}>
              <MaterialIcons name="play-circle-filled" size={48} color={colors.primary} />
              <Text style={styles.startingText}>
                كلاهما مستعد! سيبدأ الاختبار قريباً...
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.duration(600).delay(600)}>
            <TouchableOpacity
              style={[
                styles.readyButton,
                { backgroundColor: colors.primary },
                (isReady || loading) && styles.readyButtonDisabled,
              ]}
              onPress={handleReady}
              disabled={isReady || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.readyButtonText}>
                    {isReady ? 'مستعد' : 'استعد'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  infoCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 32,
  },
  infoText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  participantsContainer: {
    marginBottom: 32,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  readyButtonDisabled: {
    opacity: 0.6,
  },
  readyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  startingCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  startingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
  },
});

