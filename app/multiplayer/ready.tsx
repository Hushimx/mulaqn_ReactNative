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
import { websocket } from '@/utils/websocket';
import { logger } from '@/utils/logger';
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
  const isWebSocketConnectedRef = useRef(false); // ✅ Track WebSocket connection state
  const initialFetchDoneRef = useRef(false); // ✅ Track if initial fetch is done

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
    logger.log('[READY] 🎯 useEffect triggered for session:', sessionIdNum);
    
    if (!sessionIdNum || sessionIdNum <= 0) {
      logger.error('[READY] ❌ Invalid sessionIdNum:', sessionIdNum);
      return;
    }

    // ✅ Try WebSocket first, fallback to polling
    const tryWebSocket = async () => {
      logger.log('[READY] 🔌 Attempting WebSocket connection for session:', sessionIdNum);
      
      // ✅ CRITICAL: Stop any existing polling BEFORE attempting WebSocket
      if (pollingInterval.current) {
        logger.log('[READY] 🛑 Stopping existing polling before WebSocket attempt');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // ✅ Ensure WebSocket state is reset
      isWebSocketConnectedRef.current = false;
      initialFetchDoneRef.current = false;
      
      try {
        await websocket.connect(sessionIdNum, {
          onSessionUpdated: (data) => {
            logger.log('[READY] 📨 Session updated via WebSocket:', data);
            const eventData = data.data || data;
            
            // ✅ Update state from WebSocket data
            if (eventData.participants) {
              setParticipants(eventData.participants);
              
              // Check if current user is ready
              const userReady = eventData.participants.find((p: Participant) => p.is_ready);
              setIsReady(!!userReady);
              
              // Check if all participants are ready
              const allReadyCheck = eventData.participants.length === 2 && 
                                   eventData.participants.every((p: Participant) => p.is_ready);
              setAllReady(allReadyCheck);
              
              logger.log('[READY] Participants updated via WebSocket:', eventData.participants.length, 'allReady:', allReadyCheck);
            }
            
            // ✅ Handle navigation based on status
            if (eventData.status === 'in_progress' && !hasNavigated.current) {
              handleGameStart();
            }
            
            if (eventData.status === 'cancelled') {
              router.replace({
                pathname: '/multiplayer/disconnected',
                params: { reason: 'left', sessionId: sessionIdNum.toString() }
              });
            }
          },
          onParticipantReady: (data) => {
            logger.log('[READY] 📨 Participant ready via WebSocket:', data);
            const eventData = data.data || data;
            
            // ✅ Update all_ready state
            if (eventData.all_ready !== undefined) {
              setAllReady(eventData.all_ready);
              logger.log('[READY] All ready updated via WebSocket:', eventData.all_ready);
            }
          },
          onConnected: () => {
            logger.log('[READY] ✅ WebSocket connected');
            isWebSocketConnectedRef.current = true;
            
            // ✅ Stop polling if active
            if (pollingInterval.current) {
              logger.log('[READY] ✅ Stopping polling - WebSocket connected');
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
            
            // ✅ Fetch initial status once after WebSocket connection
            if (!initialFetchDoneRef.current) {
              initialFetchDoneRef.current = true;
              fetchStatus(true); // Allow fetch even if WebSocket is connected (initial fetch)
            }
          },
          onDisconnected: () => {
            logger.log('[READY] ⚠️ WebSocket disconnected');
            isWebSocketConnectedRef.current = false;
            
            // ✅ Start polling fallback after delay
            setTimeout(() => {
              if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
                logger.log('[READY] 🔄 Starting polling fallback (WebSocket disconnected)');
                startPolling();
              }
            }, 2000);
          },
          onError: (error) => {
            logger.error('[READY] ❌ WebSocket error:', error);
            isWebSocketConnectedRef.current = false;
            
            // ✅ Start polling fallback after delay
            setTimeout(() => {
              if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
                logger.log('[READY] 🔄 Starting polling fallback (WebSocket error)');
                startPolling();
              }
            }, 2000);
          },
        });
      } catch (error) {
        logger.error('[READY] ❌ WebSocket connection failed:', error);
        isWebSocketConnectedRef.current = false;
        
        // ✅ Start polling fallback after delay
        setTimeout(() => {
          if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
            logger.log('[READY] 🔄 Starting polling fallback (WebSocket connection failed)');
            startPolling();
          }
        }, 2000);
      }
    };

    // ✅ Try WebSocket connection immediately
    tryWebSocket();
    
    // ✅ Initial fetch (will be skipped if WebSocket connects quickly)
    fetchStatus();

    return () => {
      logger.log('[READY] Cleanup: Disconnecting WebSocket and stopping polling');
      websocket.disconnect();
      isWebSocketConnectedRef.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      if (gameStartTimeout.current) {
        clearTimeout(gameStartTimeout.current);
        gameStartTimeout.current = null;
      }
    };
  }, [sessionIdNum]);

  // ✅ Helper function to handle game start
  const handleGameStart = () => {
    if (hasNavigated.current) return;
    
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
    
    // Navigate to game after short delay
    setTimeout(() => {
      logger.log('[READY] ✅ Navigating to game');
      router.replace({
        pathname: '/multiplayer/game',
        params: { sessionId: sessionIdNum.toString() }
      });
    }, 1000); // Shorter delay since WebSocket is real-time
  };

  const fetchStatus = async (allowIfWebSocketConnected: boolean = false) => {
    // ✅ CRITICAL: Check WebSocket connection BEFORE fetching
    // If WebSocket is connected, stop polling immediately
    if (isWebSocketConnectedRef.current || websocket.isConnected()) {
      if (pollingInterval.current) {
        logger.log('[READY] ⚠️ WebSocket connected but polling active - FORCE STOPPING polling');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // ✅ Allow fetchStatus ONCE after WebSocket connection (for initial state)
      // After that, rely on WebSocket events only
      if (!allowIfWebSocketConnected && initialFetchDoneRef.current) {
        logger.log('[READY] ⚠️ Skipping fetch - WebSocket is connected, relying on WebSocket events');
        return;
      }
      
      // Mark initial fetch as done
      if (allowIfWebSocketConnected) {
        initialFetchDoneRef.current = true;
        logger.log('[READY] ✅ Allowing initial fetch after WebSocket connection');
      }
    }
    
    logger.log('[READY] 🔄 fetchStatus called for session:', sessionIdNum);
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
              // WebSocket will handle the status update, no need to fetch again
            } catch (error) {
              logger.error('[READY] Error starting game:', error);
            }
          }, 3000); // Wait 3 seconds before starting
        }

        // If both ready, navigate to game
        if (response.data.status === 'in_progress' && !hasNavigated.current) {
          handleGameStart();
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
    // ✅ CRITICAL: Only start polling if WebSocket is NOT connected (fallback only)
    if (isWebSocketConnectedRef.current) {
      logger.log('[READY] ⚠️ Cannot start polling - WebSocket is connected');
      return;
    }
    if (websocket.isConnected()) {
      logger.log('[READY] ⚠️ Cannot start polling - WebSocket is connected');
      isWebSocketConnectedRef.current = true; // Sync the ref
      return;
    }
    
    // ✅ Stop any existing polling before starting new one
    if (pollingInterval.current) {
      logger.log('[READY] Stopping existing polling before starting new one');
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    logger.log('[READY] 🔄 Starting FALLBACK polling with interval: 3000ms (WebSocket NOT connected)');
    pollingInterval.current = setInterval(() => {
      // ✅ CRITICAL: Stop polling if WebSocket reconnects
      if (isWebSocketConnectedRef.current || websocket.isConnected()) {
        logger.log('[READY] ✅✅✅ WebSocket connected - IMMEDIATELY stopping fallback polling');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        isWebSocketConnectedRef.current = true; // Sync the ref
        return;
      }
      
      logger.log('[READY] 🔄 Fallback polling - fetching status (WebSocket NOT connected)');
      fetchStatus();
    }, 3000); // ✅ Longer interval for fallback polling (3 seconds)
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

