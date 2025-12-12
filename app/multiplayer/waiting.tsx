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
  InteractionManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { websocket } from '@/utils/websocket';
import { logger } from '@/utils/logger';
import Animated, { FadeInUp, FadeInDown, FadeOutUp, ZoomIn, withRepeat, withTiming, useAnimatedStyle, useSharedValue, withSequence, withDelay } from 'react-native-reanimated';
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
  const [allReady, setAllReady] = useState(false); // ✅ Track if all participants are ready
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isWebSocketConnectedRef = useRef(false); // ✅ Track WebSocket connection state
  const initialFetchDoneRef = useRef(false); // ✅ Track if initial fetch is done
  const hasNavigatedRef = useRef(false); // ✅ Prevent multiple navigations
  const gameStartTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ✅ Track game start timeout
  const navigationTriggeredRef = useRef(false); // ✅ Track if navigation has been triggered
  const isNavigatingRef = useRef(false); // ✅ Track if navigation is currently in progress
  const isMountedRef = useRef(true); // ✅ Track if component is mounted

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
    console.log('[WAITING] 🎯 useEffect triggered for session:', sessionIdNum);
    logger.log('[WAITING] 🎯 useEffect triggered for session:', sessionIdNum);
    
    if (!sessionIdNum || sessionIdNum <= 0) {
      logger.error('[WAITING] ❌ Invalid sessionIdNum:', sessionIdNum);
      return;
    }

    // ✅ Try WebSocket first, fallback to polling
    const tryWebSocket = async () => {
      logger.log('[WAITING] 🔌 Attempting WebSocket connection for session:', sessionIdNum);
      
      // ✅ CRITICAL: Stop any existing polling BEFORE attempting WebSocket
      if (pollingInterval.current) {
        logger.log('[WAITING] 🛑 Stopping existing polling before WebSocket attempt');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // ✅ Ensure WebSocket state is reset
      isWebSocketConnectedRef.current = false;
      initialFetchDoneRef.current = false;
      hasNavigatedRef.current = false; // Reset navigation flag
      navigationTriggeredRef.current = false; // Reset navigation trigger flag
      isNavigatingRef.current = false; // Reset navigating flag
      isMountedRef.current = true; // Ensure mounted flag is true
      
      // ✅ Clear any existing game start timeout
      if (gameStartTimeoutRef.current) {
        clearTimeout(gameStartTimeoutRef.current);
        gameStartTimeoutRef.current = null;
      }
      
      try {
        await websocket.connect(sessionIdNum, {
          onSessionUpdated: (data) => {
            try {
              // ✅ Skip if already navigated or navigating
              if (hasNavigatedRef.current || isNavigatingRef.current) {
                logger.log('[WAITING] ⏭️ Skipping onSessionUpdated - already navigated or navigating');
                return;
              }
              
              logger.log('[WAITING] 📨 Session updated via WebSocket:', data);
              console.log('[WAITING] 📨 Session updated via WebSocket:', data);
              const eventData = data.data || data;
              
              // ✅ Update state from WebSocket data (batched updates)
              if (eventData.status) {
                logger.log('[WAITING] 🔄 Updating status from WebSocket:', eventData.status, '→', eventData.status);
                console.log('[WAITING] 🔄 Updating status from WebSocket:', eventData.status);
                setStatus(eventData.status);
                logger.log('[WAITING] Status updated via WebSocket:', eventData.status);
              }
              
              if (eventData.participants && Array.isArray(eventData.participants)) {
                setParticipants(eventData.participants);
                logger.log('[WAITING] Participants updated via WebSocket:', eventData.participants.length);
                
                // Check if current user is ready
                const currentUserParticipant = eventData.participants.find((p: Participant) => p.user_id === user?.id);
                if (currentUserParticipant) {
                  setIsReady(currentUserParticipant.is_ready || false);
                }
              }
              
              // ✅ Get session code from event if available
              if (eventData.session_code && !code) {
                setCode(eventData.session_code);
              }
              
              // ✅ Stop loading when we receive session data from WebSocket
              if (loading) {
                logger.log('[WAITING] Stopping loading - received session data from WebSocket');
                setLoading(false);
              }
              
              // ✅ Check if all ready (for animation) - only if we have participants
              if (eventData.participants && Array.isArray(eventData.participants) && eventData.participants.length === 2) {
                const allReadyCheck = eventData.participants.every((p: Participant) => p && p.is_ready);
                
                // ✅ If status is 'ready', definitely set allReady to true
                if (eventData.status === 'ready') {
                  setAllReady(true);
                  logger.log('[WAITING] Status is ready - setting allReady to true');
                } else {
                  setAllReady(allReadyCheck);
                }
              }
              
              // ✅ Handle navigation based on status (only navigate to game, not ready screen)
              if (eventData.status === 'in_progress' && !hasNavigatedRef.current && !navigationTriggeredRef.current && !isNavigatingRef.current) {
                logger.log('[WAITING] ✅ Session in_progress - navigating to game.tsx (from onSessionUpdated)');
                console.log('[WAITING] ✅ Session in_progress - navigating to game.tsx (from onSessionUpdated)');
                
                // ✅ Set flags IMMEDIATELY to prevent multiple navigation attempts
                hasNavigatedRef.current = true;
                navigationTriggeredRef.current = true;
                isNavigatingRef.current = true;
                
                // ✅ Clear timeout if exists
                if (gameStartTimeoutRef.current) {
                  clearTimeout(gameStartTimeoutRef.current);
                  gameStartTimeoutRef.current = null;
                }
                
                // ✅ Use InteractionManager to ensure navigation happens after current render cycle
                InteractionManager.runAfterInteractions(() => {
                  // ✅ CRITICAL: Check if component is still mounted before navigating
                  if (!isMountedRef.current) {
                    logger.log('[WAITING] ⚠️ Component unmounted - skipping navigation');
                    return;
                  }
                  
                  try {
                    logger.log('[WAITING] 🚀 Calling router.replace from onSessionUpdated');
                    console.log('[WAITING] 🚀 Calling router.replace from onSessionUpdated');
                    router.replace({
                      pathname: '/multiplayer/game',
                      params: { sessionId: sessionIdNum.toString() }
                    });
                    logger.log('[WAITING] ✅ router.replace called successfully from onSessionUpdated');
                    console.log('[WAITING] ✅ router.replace called successfully from onSessionUpdated');
                  } catch (navError) {
                    logger.error('[WAITING] ❌ Error in navigation from onSessionUpdated:', navError);
                    console.error('[WAITING] ❌ Error in navigation from onSessionUpdated:', navError);
                    // Reset flags on error to allow retry (only if still mounted)
                    if (isMountedRef.current) {
                      hasNavigatedRef.current = false;
                      navigationTriggeredRef.current = false;
                      isNavigatingRef.current = false;
                    }
                  }
                });
                return;
              }
              
              if (eventData.status === 'cancelled' && !hasNavigatedRef.current && !navigationTriggeredRef.current) {
                hasNavigatedRef.current = true;
                navigationTriggeredRef.current = true;
                
                // ✅ Clear timeout if exists
                if (gameStartTimeoutRef.current) {
                  clearTimeout(gameStartTimeoutRef.current);
                  gameStartTimeoutRef.current = null;
                }
                
                router.replace({
                  pathname: '/multiplayer/disconnected',
                  params: { reason: 'left', sessionId: sessionIdNum.toString() }
                });
              }
            } catch (error) {
              logger.error('[WAITING] ❌ Error in onSessionUpdated:', error);
              console.error('[WAITING] ❌ Error in onSessionUpdated:', error);
            }
          },
          onParticipantReady: (data) => {
            try {
              // ✅ Skip if already navigated or navigating
              if (hasNavigatedRef.current || isNavigatingRef.current) {
                return;
              }
              
              logger.log('[WAITING] 📨 Participant ready via WebSocket:', data);
              const eventData = data.data || data;
              
              // ✅ Update all_ready state
              if (eventData.all_ready !== undefined) {
                setAllReady(eventData.all_ready);
                logger.log('[WAITING] All ready updated via WebSocket:', eventData.all_ready);
              }
              
              // ✅ Update participants to show ready status
              if (eventData.user_id) {
                setParticipants(prev => {
                  if (!prev || !Array.isArray(prev)) {
                    logger.warn('[WAITING] ⚠️ Participants is not an array:', prev);
                    return prev || [];
                  }
                  return prev.map(p => 
                    p && p.user_id === eventData.user_id 
                      ? { ...p, is_ready: eventData.is_ready }
                      : p
                  );
                });
                
                // Update current user ready status
                if (eventData.user_id === user?.id) {
                  setIsReady(eventData.is_ready);
                }
              }
            } catch (error) {
              logger.error('[WAITING] ❌ Error in onParticipantReady:', error);
              console.error('[WAITING] ❌ Error in onParticipantReady:', error);
            }
          },
          onConnected: () => {
            logger.log('[WAITING] ✅ WebSocket connected');
            isWebSocketConnectedRef.current = true;
            
            // ✅ Stop polling if active
            if (pollingInterval.current) {
              logger.log('[WAITING] ✅ Stopping polling - WebSocket connected');
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
            logger.log('[WAITING] ⚠️ WebSocket disconnected');
            isWebSocketConnectedRef.current = false;
            
            // ✅ Start polling fallback after delay
            setTimeout(() => {
              if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
                logger.log('[WAITING] 🔄 Starting polling fallback (WebSocket disconnected)');
                startPolling();
              }
            }, 2000);
          },
          onError: (error) => {
            logger.error('[WAITING] ❌ WebSocket error:', error);
            isWebSocketConnectedRef.current = false;
            
            // ✅ Start polling fallback after delay
            setTimeout(() => {
              if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
                logger.log('[WAITING] 🔄 Starting polling fallback (WebSocket error)');
                startPolling();
              }
            }, 2000);
          },
        });
      } catch (error) {
        logger.error('[WAITING] ❌ WebSocket connection failed:', error);
        isWebSocketConnectedRef.current = false;
        
        // ✅ Start polling fallback after delay
        setTimeout(() => {
          if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
            logger.log('[WAITING] 🔄 Starting polling fallback (WebSocket connection failed)');
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
      logger.log('[WAITING] Cleanup: Disconnecting WebSocket and stopping polling');
      // ✅ CRITICAL: Mark component as unmounted FIRST to prevent any navigation attempts
      isMountedRef.current = false;
      
      websocket.disconnect();
      isWebSocketConnectedRef.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      if (gameStartTimeoutRef.current) {
        clearTimeout(gameStartTimeoutRef.current);
        gameStartTimeoutRef.current = null;
      }
      // ✅ Reset navigation flags on unmount
      hasNavigatedRef.current = false;
      navigationTriggeredRef.current = false;
      isNavigatingRef.current = false;
    };
  }, [sessionIdNum]);

  // ✅ Monitor status - navigate to game when status becomes in_progress
  useEffect(() => {
    // ✅ CRITICAL: Wrap everything in try-catch to prevent crashes
    try {
      logger.log('[WAITING] 🔍 useEffect triggered - checking navigation conditions', {
        status,
        allReady,
        participantsCount: participants.length,
        hasNavigated: hasNavigatedRef.current,
        navigationTriggered: navigationTriggeredRef.current,
        isNavigating: isNavigatingRef.current,
        isMounted: isMountedRef.current
      });
      
      // ✅ CRITICAL: Check if component is mounted FIRST
      if (!isMountedRef.current) {
        logger.log('[WAITING] ⚠️ Component unmounted - skipping navigation check');
        return;
      }
      
      // ✅ Skip if already navigated or navigation already triggered or currently navigating
      if (hasNavigatedRef.current || navigationTriggeredRef.current || isNavigatingRef.current) {
        logger.log('[WAITING] ⏭️ Skipping navigation - already triggered, navigated, or navigating');
        return;
      }
    
    // ✅ CRITICAL: Only navigate when status is 'in_progress'
    if (status !== 'in_progress') {
      // If status is 'ready' and all ready, wait for it to become 'in_progress'
      if (status === 'ready' && allReady) {
        logger.log('[WAITING] ⏳ Status is ready, waiting for game to start (in_progress)...');
        console.log('[WAITING] ⏳ Status is ready, waiting for game to start (in_progress)...');
      }
      return;
    }
    
    if (participants.length !== 2) {
      logger.log('[WAITING] ⏭️ Skipping - participants count is not 2:', participants.length);
      return;
    }
    
    // ✅ Check if all participants are ready
    const allParticipantsReady = participants.every(p => p && p.is_ready);
    
    if (!allReady && !allParticipantsReady) {
      logger.log('[WAITING] ⏭️ Skipping - not all participants ready');
      return;
    }
    
    // ✅ All conditions met - navigate immediately (game has started)
    logger.log('[WAITING] ✅ Game started (in_progress) - navigating to game immediately', {
      allReady,
      allParticipantsReady,
      status,
      participantsCount: participants.length,
      hasNavigated: hasNavigatedRef.current,
      navigationTriggered: navigationTriggeredRef.current
    });
    console.log('[WAITING] ✅ Game started (in_progress) - navigating to game immediately');
    
    // ✅ Set flags IMMEDIATELY to prevent multiple triggers
    hasNavigatedRef.current = true;
    navigationTriggeredRef.current = true;
    isNavigatingRef.current = true;
    
    // ✅ Clear any existing timeout
    if (gameStartTimeoutRef.current) {
      logger.log('[WAITING] 🧹 Clearing existing timeout');
      clearTimeout(gameStartTimeoutRef.current);
      gameStartTimeoutRef.current = null;
    }
    
    // ✅ Navigate using InteractionManager to prevent race conditions
    InteractionManager.runAfterInteractions(() => {
      // ✅ CRITICAL: Check if component is still mounted before navigating
      if (!isMountedRef.current) {
        logger.log('[WAITING] ⚠️ Component unmounted - skipping navigation from useEffect');
        return;
      }
      
      try {
        logger.log('[WAITING] 🚀 Calling router.replace from useEffect');
        console.log('[WAITING] 🚀 Calling router.replace from useEffect');
        router.replace({
          pathname: '/multiplayer/game',
          params: { sessionId: sessionIdNum.toString() }
        });
        logger.log('[WAITING] ✅ router.replace called successfully from useEffect');
        console.log('[WAITING] ✅ router.replace called successfully from useEffect');
      } catch (navError) {
        logger.error('[WAITING] ❌ Error in navigation from useEffect:', navError);
        console.error('[WAITING] ❌ Error in navigation from useEffect:', navError);
        // Reset flags on error to allow retry (only if still mounted)
        if (isMountedRef.current) {
          hasNavigatedRef.current = false;
          navigationTriggeredRef.current = false;
          isNavigatingRef.current = false;
        }
      }
    });
    } catch (error) {
      logger.error('[WAITING] ❌ CRITICAL ERROR in navigation useEffect:', error);
      console.error('[WAITING] ❌ CRITICAL ERROR in navigation useEffect:', error);
      // Reset flags on critical error (only if still mounted)
      if (isMountedRef.current) {
        hasNavigatedRef.current = false;
        navigationTriggeredRef.current = false;
        isNavigatingRef.current = false;
      }
    }
  }, [status, allReady, sessionIdNum, router, participants.length]); // ✅ Use participants.length instead of participants array

  const fetchStatus = async (allowIfWebSocketConnected: boolean = false) => {
    // ✅ CRITICAL: Check WebSocket connection BEFORE fetching
    // If WebSocket is connected, stop polling immediately
    if (isWebSocketConnectedRef.current || websocket.isConnected()) {
      if (pollingInterval.current) {
        logger.log('[WAITING] ⚠️ WebSocket connected but polling active - FORCE STOPPING polling');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // ✅ Allow fetchStatus ONCE after WebSocket connection (for initial state)
      // After that, rely on WebSocket events only
      if (!allowIfWebSocketConnected && initialFetchDoneRef.current) {
        logger.log('[WAITING] ⚠️ Skipping fetch - WebSocket is connected, relying on WebSocket events');
        return;
      }
      
      // Mark initial fetch as done
      if (allowIfWebSocketConnected) {
        initialFetchDoneRef.current = true;
        logger.log('[WAITING] ✅ Allowing initial fetch after WebSocket connection');
      }
    }
    
    console.log('[WAITING] 🔄 fetchStatus called for session:', sessionIdNum);
    logger.log('[WAITING] 🔄 fetchStatus called for session:', sessionIdNum);
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
        console.log('[WAITING] 📊 Status response:', {
          status: response.data.status,
          participantsCount: response.data.participants.length,
          participants: response.data.participants.map((p: Participant) => ({
            id: p.user_id,
            name: p.name,
            is_ready: p.is_ready
          }))
        });
        
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

        // ✅ Check if all ready
        const allReadyCheck = response.data.participants.length === 2 && 
                             response.data.participants.every((p: Participant) => p.is_ready);
        setAllReady(allReadyCheck);
        
        // ✅ Handle navigation (only navigate to game, not ready screen)
        if (response.data.status === 'in_progress' && !hasNavigatedRef.current && !navigationTriggeredRef.current && !isNavigatingRef.current) {
          logger.log('[WAITING] ✅ Session in_progress - navigating to game.tsx (from fetchStatus)');
          hasNavigatedRef.current = true;
          navigationTriggeredRef.current = true;
          isNavigatingRef.current = true;
          
          InteractionManager.runAfterInteractions(() => {
            // ✅ CRITICAL: Check if component is still mounted before navigating
            if (!isMountedRef.current) {
              logger.log('[WAITING] ⚠️ Component unmounted - skipping navigation from fetchStatus');
              return;
            }
            
            try {
              router.replace({
                pathname: '/multiplayer/game',
                params: { sessionId: sessionIdNum.toString() }
              });
            } catch (navError) {
              logger.error('[WAITING] ❌ Error in navigation from fetchStatus:', navError);
              // Reset flags on error (only if still mounted)
              if (isMountedRef.current) {
                hasNavigatedRef.current = false;
                navigationTriggeredRef.current = false;
                isNavigatingRef.current = false;
              }
            }
          });
          return;
        }
        
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
    // ✅ CRITICAL: Only start polling if WebSocket is NOT connected (fallback only)
    if (isWebSocketConnectedRef.current) {
      logger.log('[WAITING] ⚠️ Cannot start polling - WebSocket is connected');
      return;
    }
    if (websocket.isConnected()) {
      logger.log('[WAITING] ⚠️ Cannot start polling - WebSocket is connected');
      isWebSocketConnectedRef.current = true; // Sync the ref
      return;
    }
    
    // ✅ Stop any existing polling before starting new one
    if (pollingInterval.current) {
      logger.log('[WAITING] Stopping existing polling before starting new one');
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    logger.log('[WAITING] 🔄 Starting FALLBACK polling with interval: 3000ms (WebSocket NOT connected)');
    pollingInterval.current = setInterval(() => {
      // ✅ CRITICAL: Stop polling if WebSocket reconnects
      if (isWebSocketConnectedRef.current || websocket.isConnected()) {
        logger.log('[WAITING] ✅✅✅ WebSocket connected - IMMEDIATELY stopping fallback polling');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        isWebSocketConnectedRef.current = true; // Sync the ref
        return;
      }
      
      logger.log('[WAITING] 🔄 Fallback polling - fetching status (WebSocket NOT connected)');
      fetchStatus();
    }, 3000); // ✅ Longer interval for fallback polling (3 seconds)
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
        setAllReady(response.data.all_ready || false);
        
        // ✅ No fetchStatus() - WebSocket will update UI automatically
        // ✅ No navigation to ready screen - stay on same page with animation
        logger.log('[WAITING] ✅ Ready status updated - WebSocket will handle UI update');
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
              <Animated.View 
                key={participant.user_id} 
                style={styles.participantCard}
                entering={participant.is_ready ? FadeInUp.duration(400) : undefined}
              >
                <View style={[styles.participantAvatar, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="person" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantRole}>
                    {participant.role === 'creator' ? 'منشئ الجلسة' : 'منضم'}
                  </Text>
                </View>
                {participant.is_ready ? (
                  <Animated.View
                    entering={ZoomIn.duration(500).springify()}
                    style={styles.readyIconContainer}
                  >
                    <MaterialIcons name="check-circle" size={28} color={colors.primary} />
                  </Animated.View>
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={28} color="rgba(255, 255, 255, 0.3)" />
                )}
              </Animated.View>
            ))}
          </Animated.View>

          {/* All Ready Animation - Show when both participants are ready */}
          {allReady && !hasNavigatedRef.current && (
            <Animated.View 
              entering={FadeInUp.duration(600).delay(200)}
              exiting={FadeOutUp.duration(300)}
              style={styles.allReadyContainer}
            >
              <Animated.View
                entering={withSequence(
                  withDelay(300, ZoomIn.duration(400).springify()),
                  withRepeat(
                    withTiming(1.1, { duration: 1000 }),
                    -1,
                    true
                  )
                )}
                style={styles.allReadyIcon}
              >
                <MaterialIcons name="check-circle" size={64} color={colors.primary} />
              </Animated.View>
              <Text style={styles.allReadyTitle}>كلاهما مستعد!</Text>
              <Text style={styles.allReadySubtitle}>سيبدأ الاختبار قريباً...</Text>
            </Animated.View>
          )}

          {/* Ready Button - Show when both participants joined but not all ready */}
          {participants.length === 2 && !allReady && (
            <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.readyContainer}>
              <Text style={styles.readyHint}>
                {participants.some(p => p.is_ready) 
                  ? 'في انتظار المستخدم الآخر...' 
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
  allReadyContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginTop: 20,
    marginBottom: 20,
  },
  allReadyIcon: {
    marginBottom: 16,
  },
  allReadyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  allReadySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  readyIconContainer: {
    // Container for ready icon animation
  },
});

