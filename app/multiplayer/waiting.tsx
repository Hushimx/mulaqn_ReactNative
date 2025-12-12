import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInUp, FadeInDown, withRepeat, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Participant {
  user_id: number;
  name: string;
  is_ready: boolean;
  role: string;
}

export default function MultiplayerWaitingScreen() {
  const router = useRouter();
  const { sessionId, sessionCode } = useLocalSearchParams<{ sessionId: string; sessionCode?: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('waiting');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [code, setCode] = useState<string>(sessionCode || '');
  const [isReady, setIsReady] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const sessionIdNum = parseInt(sessionId || '0');
  const colors = getTrackColors(1) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };

  // Animation for code pulse
  const pulseScale = useSharedValue(1);
  
  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.1, { duration: 2000 }),
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
    };
  }, [sessionIdNum]);

  const fetchStatus = async () => {
    try {
      const response = await api.get<{
        ok: boolean;
        data: {
          status: string;
          session_code?: string;
          participants: Participant[];
        };
      }>(API_ENDPOINTS.MULTIPLAYER_STATUS(sessionIdNum));

      if (response && response.ok && response.data) {
        setStatus(response.data.status);
        setParticipants(response.data.participants);

        // Check if current user is ready
        const currentUserParticipant = response.data.participants.find((p: Participant) => p.user_id === user?.id);
        setIsReady(currentUserParticipant?.is_ready || false);

        // Get session code from response if available
        if (response.data.session_code && !code) {
          setCode(response.data.session_code);
        } else if (sessionCode && !code) {
          setCode(sessionCode);
        }

        // Check if all participants are ready
        const allReady = participants.length === 2 && participants.every(p => p.is_ready);
        
        // If both ready, navigate to ready screen
        if (response.data.status === 'ready' || (allReady && response.data.status === 'waiting')) {
          router.replace({
            pathname: '/multiplayer/ready',
            params: { sessionId: sessionIdNum.toString() }
          });
          return; // Stop further processing
        }
        
        // If session started (in_progress), navigate directly to game
        if (response.data.status === 'in_progress') {
          router.replace({
            pathname: '/multiplayer/game',
            params: { sessionId: sessionIdNum.toString() }
          });
          return; // Stop further processing
        }

        // If session cancelled, navigate to disconnected
        if (response.data.status === 'cancelled') {
          router.replace({
            pathname: '/multiplayer/disconnected',
            params: { reason: 'left', sessionId: sessionIdNum.toString() }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    pollingInterval.current = setInterval(() => {
      fetchStatus();
    }, 1500);
  };

  const handleCopyCode = async () => {
    if (code) {
      await Clipboard.setString(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('تم النسخ', 'تم نسخ الكود بنجاح');
    }
  };

  const handleReady = async () => {
    if (loading || isReady) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const response = await api.post<{
        ok: boolean;
        data: { status: string; all_ready: boolean };
      }>(API_ENDPOINTS.MULTIPLAYER_READY(sessionIdNum));

      if (response && response.ok && response.data) {
        setIsReady(true);
        // If both ready, navigate to ready screen
        if (response.data.all_ready) {
          router.replace({
            pathname: '/multiplayer/ready',
            params: { sessionId: sessionIdNum.toString() }
          });
        } else {
          // Refresh status to show updated ready state
          fetchStatus();
        }
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل تحديث حالة الاستعداد');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    Alert.alert(
      'تأكيد الانسحاب',
      'هل أنت متأكد من رغبتك في مغادرة الجلسة؟',
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

  if (loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

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
          <Text style={styles.title}>في انتظار الصديق</Text>
        </Animated.View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Session Code */}
          {code && (
            <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.codeContainer}>
              <Text style={styles.codeLabel}>انسخ الكود وأرسله لصديقك</Text>
              <TouchableOpacity
                style={[styles.codeBox, { borderColor: colors.primary }]}
                onPress={handleCopyCode}
                activeOpacity={0.8}
              >
                <Animated.Text
                  style={[styles.codeText, { color: colors.primary }, pulseStyle]}
                >
                  {code}
                </Animated.Text>
                <MaterialIcons name="content-copy" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.codeHint}>ننتظر خويّك يدخل</Text>
            </Animated.View>
          )}

          {/* Participants */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.participantsContainer}>
            <Text style={styles.participantsTitle}>المشاركون</Text>
            {participants.map((participant) => (
              <View key={participant.user_id} style={styles.participantCard}>
                <View style={[styles.participantAvatar, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantRole}>
                    {participant.role === 'creator' ? 'منشئ الجلسة' : 'منضم'}
                  </Text>
                </View>
                {participant.is_ready && (
                  <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                )}
              </View>
            ))}
          </Animated.View>

          {/* Ready Button - Show when both participants joined */}
          {participants.length === 2 && (
            <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.readyContainer}>
              <Text style={styles.readyHint}>
                {participants.every(p => p.is_ready) 
                  ? 'كلاهما مستعد! في انتظار بدء اللعبة...' 
                  : 'اضغط استعد للبدء'}
              </Text>
              {!isReady && (
                <TouchableOpacity
                  style={[styles.readyButton, { backgroundColor: colors.primary }]}
                  onPress={handleReady}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <MaterialIcons name="check-circle" size={28} color="#FFFFFF" />
                  <Text style={styles.readyButtonText}>
                    {loading ? 'جاري التحميل...' : 'استعد'}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* Waiting Message */}
          {participants.length < 2 && (
            <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.waitingMessage}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.waitingText}>في انتظار انضمام صديقك...</Text>
            </Animated.View>
          )}
        </ScrollView>
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    gap: 12,
    minWidth: 200,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    textAlign: 'center',
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
    marginBottom: 4,
  },
  participantRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  waitingMessage: {
    alignItems: 'center',
    padding: 32,
  },
  waitingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    textAlign: 'center',
  },
  readyContainer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 16,
  },
  readyHint: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  readyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

