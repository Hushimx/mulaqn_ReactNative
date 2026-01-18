import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';
import { websocket } from '@/utils/websocket';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Question {
  id: number;
  stem: string;
  options: Array<{
    id: number;
    option_label?: string;
    content: string;
    option_order: number;
  }>;
  question_order: number;
  total_questions: number;
}

interface Participant {
  user_id: number;
  name: string;
  score: number;
  errors_count: number;
  ready_for_next?: boolean; // ✅ إضافة ready_for_next
  avatar_shape?: string | null;
  avatar_color?: string | null;
  status?: string; // ✅ إضافة status للتحقق من disconnected
  is_ready?: boolean; // ✅ إضافة is_ready
}

interface Response {
  user_id: number;
  selected_option_id: number;
  is_correct: boolean;
}

export default function MultiplayerGameScreen() {
  // ✅ FORCE LOG - Always log, even in production (for debugging)
  console.log('[Multiplayer] 🚀 Component RENDER - MultiplayerGameScreen');
  logger.log('[Multiplayer] 🚀 Component RENDER - MultiplayerGameScreen');
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  console.log('[Multiplayer] 📋 sessionId from params:', sessionId);
  logger.log('[Multiplayer] 📋 sessionId from params:', sessionId);
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const { user } = useAuth();
  console.log('[Multiplayer] 👤 User:', user?.id);
  logger.log('[Multiplayer] 👤 User:', user?.id);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('in_progress');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionOrder, setCurrentQuestionOrder] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null); // ✅ Selected option (temporary until submit)
  const [hasAnswered, setHasAnswered] = useState(false); // ✅ Final answer submitted
  const [hasBothAnswered, setHasBothAnswered] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [correctOptionId, setCorrectOptionId] = useState<number | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [revealTimer, setRevealTimer] = useState(3);
  const [readyForNext, setReadyForNext] = useState(false);
  const [allReadyForNext, setAllReadyForNext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Flag to prevent multiple submissions
  const pollingInterval = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  // ✅ Refs to access current values in timer callbacks (avoid stale closures)
  const showRevealRef = useRef(false);
  const hasBothAnsweredRef = useRef(false);
  const hasAnsweredRef = useRef(false); // ✅ Ref to track if user has answered (for immediate blocking)
  const isSubmittingRef = useRef(false); // ✅ Ref to track if submission is in progress (for immediate blocking)
  const selectedOptionRef = useRef<number | null>(null); // ✅ Ref to track selected option (cannot be reset by fetchStatus)
  // ✅ Flag to track if hasBothAnswered was set by handleAnswer (source of truth)
  const hasBothAnsweredFromAnswerRef = useRef(false);
  // ✅ Flag to lock hasBothAnswered during countdown (prevent fetchStatus from interfering)
  const countdownStartedRef = useRef(false);
  // ✅ Ref to track current question ID (to detect question changes in WebSocket callbacks)
  const currentQuestionIdRef = useRef<number | null>(null);
  // ✅ Ref to track WebSocket connection state (to prevent polling when connected)
  const isWebSocketConnectedRef = useRef(false);
  // ✅ Ref to track if initial fetchStatus was called after WebSocket connection
  const initialFetchDoneRef = useRef(false);

  // ✅ Keep refs in sync with state
  useEffect(() => {
    showRevealRef.current = showReveal;
  }, [showReveal]);

  // ✅ Keep ref in sync with state
  useEffect(() => {
    hasBothAnsweredRef.current = hasBothAnswered;
  }, [hasBothAnswered]);
  
  useEffect(() => {
    hasAnsweredRef.current = hasAnswered;
  }, [hasAnswered]);

  // ✅ Keep selectedOptionRef in sync with selectedOption state
  // This ensures ref always has the latest value for protection against polling
  // ✅ CRITICAL: Always update ref when selectedOption is NOT null (user has selected something)
  // ✅ CRITICAL: ABSOLUTELY NEVER clear ref when selectedOption becomes null - keep it for protection
  // The ref is the LAST LINE OF DEFENSE - it must NEVER be cleared except when question changes
  useEffect(() => {
    if (selectedOption !== null) {
      // User selected an option - update ref immediately
      // ✅ CRITICAL: Always update ref when selectedOption is not null
      // This ensures ref always has the latest selection
    selectedOptionRef.current = selectedOption;
      logger.log('[SYNC REF] Updated selectedOptionRef from selectedOption:', selectedOption);
    } else {
      // ✅ CRITICAL: selectedOption became null - but DON'T clear ref!
      // The ref should keep the last selected value for protection FOREVER
      // Only clear it when question actually changes (handled in question change useEffect)
      // This is the KEY to protecting user's selection from being deleted
      if (selectedOptionRef.current !== null) {
        logger.log('[SYNC REF] ⚠️ selectedOption became null but keeping ref value for protection:', selectedOptionRef.current);
      }
    }
  }, [selectedOption]);
  
  // ✅ CRITICAL: Protect selectedOption from being reset by fetchStatus or useEffect
  // If selectedOption is cleared but ref still has a value, restore it IMMEDIATELY
  // This is the LAST LINE OF DEFENSE against any code that tries to delete user's selection
  // ✅ CRITICAL: This protection works EVEN AFTER hasAnswered becomes true
  // We need to keep selectedOption visible even after submission (user needs to see their answer)
  useEffect(() => {
    // ✅ CRITICAL: Check if question actually changed - if not, protect selectedOption
    const questionId = currentQuestion?.id;
    const refQuestionId = currentQuestionIdRef.current;
    const questionActuallyChanged = questionId !== null && refQuestionId !== null && questionId !== refQuestionId;
    
    // ✅ CRITICAL: Only restore if:
    // 1. selectedOption is null but ref has a value (something tried to delete it)
    // 2. Question has NOT changed (if question changed, it's OK to clear it)
    // 3. We're not in reveal state (reveal state is OK to clear)
    // ✅ CRITICAL: This protection works EVEN IF hasAnswered is true
    // User needs to see their answer even after submission
    if (selectedOption === null && selectedOptionRef.current !== null && !questionActuallyChanged && !showReveal) {
      // Something tried to clear selectedOption - restore it IMMEDIATELY
      // This protects against:
      // 1. fetchStatus trying to reset it
      // 2. useEffect trying to reset it when question object reference changes
      // 3. Any other code that tries to interfere
      logger.log('[PROTECT SELECTED OPTION] ⚠️ RESTORING selectedOption from ref - something tried to delete it!', {
        selectedOption,
        selectedOptionRef: selectedOptionRef.current,
        hasAnswered,
        showReveal,
        currentQuestionId: currentQuestion?.id,
        refQuestionId: currentQuestionIdRef.current,
        questionActuallyChanged
      });
      setSelectedOption(selectedOptionRef.current);
    }
    
    // ✅ CRITICAL: Also protect selectedOptionRef - if it was cleared but selectedOption has value, restore it
    // This is a double protection - both state and ref must be protected
    if (selectedOptionRef.current === null && selectedOption !== null && !questionActuallyChanged && !showReveal) {
      logger.log('[PROTECT SELECTED OPTION REF] ⚠️ RESTORING selectedOptionRef from selectedOption - ref was cleared!', {
        selectedOption,
        selectedOptionRef: selectedOptionRef.current,
        hasAnswered,
        showReveal,
        currentQuestionId: currentQuestion?.id,
        refQuestionId: currentQuestionIdRef.current,
        questionActuallyChanged
      });
      selectedOptionRef.current = selectedOption;
    }
  }, [selectedOption, hasAnswered, showReveal, currentQuestion?.id]);

  // ✅ Track current question ID separately to avoid useEffect firing on object reference changes
  const currentQuestionId = useMemo(() => currentQuestion?.id ?? null, [currentQuestion?.id]);
  
  // ✅ Reset state and refs when question ID actually changes (not object reference)
  // ✅ CRITICAL: selectedOption is NOT in dependencies - we don't want to reset when user selects an option
  // This useEffect should ONLY run when question ID actually changes
  useEffect(() => {
    if (currentQuestionId !== null) {
      const newQuestionId = currentQuestionId;
      const previousQuestionId = currentQuestionIdRef.current;
      
      // ✅ CRITICAL: Only reset if question ID actually changed
      // This prevents resetting selectedOption when currentQuestion object reference changes but ID is same
      if (previousQuestionId !== null && previousQuestionId !== newQuestionId) {
        // Question actually changed - reset all state
        logger.log('[Question Changed] Reset all state for new question:', newQuestionId, 'from:', previousQuestionId);
        
        // Update ref to track current question ID
        currentQuestionIdRef.current = newQuestionId;
        
      // Reset flags when question changes (new question)
      hasBothAnsweredFromAnswerRef.current = false;
      countdownStartedRef.current = false;
      hasAnsweredRef.current = false;
      isSubmittingRef.current = false;
      selectedOptionRef.current = null;
        
        // Reset state for new question
        setHasAnswered(false);
        setSelectedOption(null);
        setShowReveal(false);
        setHasBothAnswered(false);
        setResponses([]);
        setCorrectOptionId(null);
        setReadyForNext(false);
        setAllReadyForNext(false);
      } else if (previousQuestionId === null) {
        // First time setting question - just update ref, don't reset state
        currentQuestionIdRef.current = newQuestionId;
        logger.log('[Question Initialized] Setting question ID:', newQuestionId);
      } else {
        // Same question ID - just update ref if needed, but DON'T reset state
        // This prevents deleting user's selectedOption when currentQuestion object reference changes
        if (currentQuestionIdRef.current !== newQuestionId) {
          currentQuestionIdRef.current = newQuestionId;
        }
        // ✅ CRITICAL: Don't log or check selectedOption here - this useEffect should NOT care about selectedOption
        // selectedOption is managed separately and should NEVER be touched by this useEffect
      }
    }
  }, [currentQuestionId]); // ✅ CRITICAL: Removed selectedOption from dependencies - this is the KEY fix!

  const sessionIdNum = parseInt(sessionId || '0');
  
  // ✅ Log sessionId for debugging
  useEffect(() => {
    logger.log('[Multiplayer] 🔍 Component mounted/updated:', {
      sessionId: sessionId,
      sessionIdNum: sessionIdNum,
      isValid: sessionIdNum > 0
    });
  }, [sessionId, sessionIdNum]);
  
  const colors = getTrackColors(1) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };
  const currentUserId = user?.id || 0;

  // Animation values
  const revealOpacity = useSharedValue(0);
  const revealScale = useSharedValue(0.8);

  useEffect(() => {
    // ✅ FORCE LOG - Always log, even in production (for debugging)
    console.log('[Multiplayer] 🎯 useEffect START - sessionIdNum:', sessionIdNum, 'sessionId:', sessionId);
    
    // ✅ CRITICAL: Only proceed if sessionIdNum is valid
    if (!sessionIdNum || sessionIdNum <= 0) {
      console.error('[Multiplayer] ❌ Invalid sessionIdNum:', sessionIdNum, 'sessionId:', sessionId);
      logger.error('[Multiplayer] ❌ Invalid sessionIdNum:', sessionIdNum, 'sessionId:', sessionId);
      return;
    }
    
    console.log('[Multiplayer] 🎯 useEffect triggered for session:', sessionIdNum);
    console.log('[Multiplayer] 🎯 useEffect dependencies:', { sessionIdNum, sessionId });
    logger.log('[Multiplayer] 🎯 useEffect triggered for session:', sessionIdNum);
    logger.log('[Multiplayer] 🎯 useEffect dependencies:', { sessionIdNum, sessionId });
    // ✅ Don't fetch status immediately - wait for WebSocket connection attempt
    // This reduces unnecessary API calls on session creation
    
    // Try WebSocket first, fallback to polling
    const tryWebSocket = async () => {
      console.log('[Multiplayer] 🔌 Attempting WebSocket connection for session:', sessionIdNum);
      logger.log('[Multiplayer] 🔌 Attempting WebSocket connection for session:', sessionIdNum);
      
      // ✅ CRITICAL: Stop any existing polling BEFORE attempting WebSocket
      if (pollingInterval.current) {
        logger.log('[Multiplayer] 🛑 Stopping existing polling before WebSocket attempt');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // ✅ Ensure WebSocket state is reset
      isWebSocketConnectedRef.current = false;
      
      try {
        await websocket.connect(sessionIdNum, {
          onSessionUpdated: (data) => {
            logger.log('[WebSocket] 📨 Session updated:', data);
            // Extract data from nested structure (data.data from broadcastWith)
            const eventData = data.data || data;
            
            // Check if question changed (new question ID) - use ref to avoid stale closure
            const newQuestionId = eventData.current_question?.id;
            const previousQuestionId = currentQuestionIdRef.current;
            const currentQuestionId = currentQuestion?.id;
            // ✅ CRITICAL: Only consider it changed if previousQuestionId is not null and different
            // This prevents resetting selectedOption when WebSocket sends same question with different object reference
            const questionChanged = newQuestionId && previousQuestionId !== null && newQuestionId !== previousQuestionId;
            
            // ✅ CRITICAL: Only reset if question ID actually changed
            if (questionChanged && newQuestionId) {
              logger.log('[WebSocket] 🔄 Question changed, resetting state:', newQuestionId, 'from:', previousQuestionId);
              
              // ✅ CRITICAL: Update question ID ref FIRST to prevent fetchStatus from resetting
              currentQuestionIdRef.current = newQuestionId;
              
              // Reset states FIRST
              setHasAnswered(false);
              hasAnsweredRef.current = false;
              setSelectedOption(null);
              selectedOptionRef.current = null;
              setShowReveal(false);
              setHasBothAnswered(false);
              hasBothAnsweredFromAnswerRef.current = false;
              setResponses([]);
              setCorrectOptionId(null);
              setReadyForNext(false);
              setAllReadyForNext(false);
              countdownStartedRef.current = false;
              
              // ✅ CRITICAL: Update currentQuestion IMMEDIATELY after resetting states
              if (eventData.current_question) {
                setCurrentQuestion({
                  id: eventData.current_question.id,
                  stem: eventData.current_question.stem,
                  options: eventData.current_question.options || [],
                  question_order: eventData.current_question.question_order || 1,
                  total_questions: currentQuestion?.total_questions || 3,
                } as Question);
                setCurrentQuestionOrder(eventData.current_question.question_order || 1);
                logger.log('[WebSocket] ✅ Question updated successfully after reset:', newQuestionId);
              }
            } else if (newQuestionId && previousQuestionId === null) {
              // First time setting question - just update ref and question
              currentQuestionIdRef.current = newQuestionId;
              if (eventData.current_question) {
                setCurrentQuestion({
                  id: eventData.current_question.id,
                  stem: eventData.current_question.stem,
                  options: eventData.current_question.options || [],
                  question_order: eventData.current_question.question_order || 1,
                  total_questions: 3,
                } as Question);
                setCurrentQuestionOrder(eventData.current_question.question_order || 1);
              }
              logger.log('[WebSocket] Question initialized:', newQuestionId);
            } else if (newQuestionId && newQuestionId === previousQuestionId) {
              // Same question - don't reset anything, protect user's selection
              logger.log('[WebSocket] Same question received - protecting user selection:', newQuestionId);
            }
            
            // ✅ Update state from WebSocket data
            if (eventData.status) {
              setStatus(eventData.status);
              logger.log('[WebSocket] Status updated:', eventData.status);
              
              // ✅ CRITICAL: Check if session completed - navigate to results immediately
              if (eventData.status === 'completed') {
                logger.log('[WebSocket] ✅ Session completed - navigating to results');
                router.replace({
                  pathname: '/multiplayer/results',
                  params: { sessionId: sessionIdNum.toString() }
                });
                return; // Stop processing further updates
              }
              
              // ✅ CRITICAL: Check if session cancelled (disconnection) - navigate to disconnected screen
              if (eventData.status === 'cancelled') {
                logger.log('[WebSocket] ⚠️ Session cancelled - participant disconnected');
                console.log('[WebSocket] ⚠️ Session cancelled - participant disconnected');
                router.replace({
                  pathname: '/multiplayer/disconnected',
                  params: { 
                    reason: 'disconnected',
                    sessionId: sessionIdNum.toString() 
                  }
                });
                return; // Stop processing further updates
              }
            }
            if (eventData.participants) {
              setParticipants(eventData.participants);
              logger.log('[WebSocket] Participants updated:', eventData.participants.length);
            }
            
            // ✅ CRITICAL: Check if current_question is null - this means session completed
            // Even if status is still "in_progress" (race condition), null current_question means no more questions
            if (eventData.current_question === null) {
              logger.log('[WebSocket] ⚠️ Current question is null - session completed (even if status not updated yet)');
              console.log('[WebSocket] ⚠️ Current question is null - session completed (even if status not updated yet)');
              
              // Set current_question to null in state
              setCurrentQuestion(null);
              
              // Fetch status to get the latest status (might be 'completed' now)
              // This handles race condition where WebSocket event has old status
              fetchStatus(true).catch((error) => {
                logger.error('[WebSocket] Error fetching status after null question:', error);
              });
              
              // Also check if status is already 'completed' in the event data
              if (eventData.status === 'completed') {
                logger.log('[WebSocket] ✅ Status is completed - navigating to results');
                console.log('[WebSocket] ✅ Status is completed - navigating to results');
                router.replace({
                  pathname: '/multiplayer/results',
                  params: { sessionId: sessionIdNum.toString() }
                });
                return; // Stop processing
              }
            } else if (eventData.current_question) {
              // ✅ CRITICAL: Only update currentQuestion if question ID actually changed
              // This prevents resetting selectedOption when WebSocket sends same question with different object reference
              const newQuestionId = eventData.current_question.id;
              const previousQuestionId = currentQuestionIdRef.current;
              
              if (previousQuestionId === null || previousQuestionId !== newQuestionId) {
                // Question ID changed or first time - safe to update
                logger.log('[WebSocket] 🔄 Question ID changed - updating immediately:', {
                  oldId: previousQuestionId,
                  newId: newQuestionId
                });
                // ✅ CRITICAL: Update question ID ref FIRST to prevent fetchStatus from resetting
                currentQuestionIdRef.current = newQuestionId;
                setCurrentQuestion(eventData.current_question);
                setCurrentQuestionOrder(eventData.current_question.question_order);
                // Reset state for new question
                setSelectedOption(null);
                selectedOptionRef.current = null;
                setHasAnswered(false);
                hasAnsweredRef.current = false;
                setShowReveal(false);
                setHasBothAnswered(false);
                setResponses([]);
                setCorrectOptionId(null);
                setReadyForNext(false);
                setAllReadyForNext(false);
                logger.log('[WebSocket] Current question updated:', newQuestionId);
              } else {
                // Same question ID - don't update currentQuestion object to protect user selection
                
                // ✅ CRITICAL: If selectedOption was cleared but ref still has value, restore it IMMEDIATELY
                // This protects against any code that might have cleared it (even after hasAnswered becomes true)
                if (selectedOption === null && selectedOptionRef.current !== null) {
                  logger.log('[WebSocket] ⚠️ RESTORING selectedOption - it was cleared but ref has value!', {
                    selectedOption,
                    selectedOptionRef: selectedOptionRef.current,
                    hasAnswered,
                    showReveal,
                    questionId: newQuestionId
                  });
                  setSelectedOption(selectedOptionRef.current);
                }
                
                logger.log('[WebSocket] Same question ID - NOT updating currentQuestion object to protect user selection:', {
                  questionId: newQuestionId,
                  hasSelectedOption: selectedOption !== null || selectedOptionRef.current !== null,
                  selectedOption,
                  selectedOptionRef: selectedOptionRef.current
                });
              }
            }
            
            // ✅ Stop loading when we receive session data from WebSocket
            // This ensures the UI is ready even if fetchStatus hasn't completed yet
            if (loading) {
              logger.log('[WebSocket] Stopping loading - received session data');
              setLoading(false);
            }
            
            // ✅ Handle has_both_answered - triggers countdown
            if (eventData.has_both_answered !== undefined) {
              console.log('[WebSocket] has_both_answered updated:', eventData.has_both_answered);
              logger.log('[WebSocket] has_both_answered updated:', eventData.has_both_answered);
              setHasBothAnswered(eventData.has_both_answered);
              hasBothAnsweredRef.current = eventData.has_both_answered;
              // Countdown will start via useEffect when hasBothAnswered becomes true
            }
            
            // ✅ Handle all_ready_for_next - triggers next question transition
            if (eventData.all_ready_for_next !== undefined) {
              logger.log('[WebSocket] all_ready_for_next updated:', eventData.all_ready_for_next);
              setAllReadyForNext(eventData.all_ready_for_next);
              
              // ✅ CRITICAL: If all ready and we have a new question, update immediately
              // This ensures both users move to next question simultaneously
              if (eventData.all_ready_for_next && eventData.current_question) {
                const newQuestionId = eventData.current_question.id;
                const previousQuestionId = currentQuestionIdRef.current;
                const currentQuestionId = currentQuestion?.id;
                
                // ✅ CRITICAL: Update if question ID changed OR if currentQuestion is undefined
                // This handles case where ref has question ID but state doesn't
                if (previousQuestionId !== null && previousQuestionId !== newQuestionId) {
                  logger.log('[WebSocket] ✅ All ready for next - updating to new question IMMEDIATELY:', {
                    oldId: previousQuestionId,
                    newId: newQuestionId,
                    currentQuestionId
                  });
                  
                  // ✅ CRITICAL: Update question ID ref FIRST to prevent fetchStatus from resetting
                  currentQuestionIdRef.current = newQuestionId;
                  
                  // Reset states FIRST
                  setShowReveal(false);
                  setResponses([]);
                  setCorrectOptionId(null);
                  setSelectedOption(null);
                  selectedOptionRef.current = null;
                  setHasAnswered(false);
                  hasAnsweredRef.current = false;
                  setHasBothAnswered(false);
                  hasBothAnsweredFromAnswerRef.current = false;
                  setReadyForNext(false);
                  
                  // ✅ CRITICAL: Update question IMMEDIATELY - don't wait for anything
                  setCurrentQuestion({
                    id: eventData.current_question.id,
                    stem: eventData.current_question.stem,
                    options: eventData.current_question.options || [],
                    question_order: eventData.current_question.question_order || 1,
                    total_questions: currentQuestion?.total_questions || 3,
                  } as Question);
                  setCurrentQuestionOrder(eventData.current_question.question_order || 1);
                  
                  logger.log('[WebSocket] ✅ Question updated successfully via WebSocket');
                } else if (previousQuestionId === null || currentQuestionId === undefined || currentQuestionId !== newQuestionId) {
                  // First time OR currentQuestion is undefined OR question ID changed
                  logger.log('[WebSocket] Updating question (first time or state out of sync):', {
                    previousQuestionId,
                    newQuestionId,
                    currentQuestionId
                  });
                  currentQuestionIdRef.current = newQuestionId;
                  
                  // Reset states if question actually changed
                  if (currentQuestionId !== undefined && currentQuestionId !== newQuestionId) {
                    setShowReveal(false);
                    setResponses([]);
                    setCorrectOptionId(null);
                    setSelectedOption(null);
                    selectedOptionRef.current = null;
                    setHasAnswered(false);
                    hasAnsweredRef.current = false;
                    setHasBothAnswered(false);
                    hasBothAnsweredFromAnswerRef.current = false;
                    setReadyForNext(false);
                  }
                  
                  setCurrentQuestion({
                    id: eventData.current_question.id,
                    stem: eventData.current_question.stem,
                    options: eventData.current_question.options || [],
                    question_order: eventData.current_question.question_order || 1,
                    total_questions: currentQuestion?.total_questions || 3,
                  } as Question);
                  setCurrentQuestionOrder(eventData.current_question.question_order || 1);
                }
              } else if (eventData.all_ready_for_next && !eventData.current_question) {
                // All ready but no question yet - fetch status to get it IMMEDIATELY
                logger.log('[WebSocket] All ready but no question in event - fetching status IMMEDIATELY');
                fetchStatus(true).then(() => {
                  // After fetching, check if question changed
                  // fetchStatus will update currentQuestion if both are ready
                  logger.log('[WebSocket] Status fetched after all_ready_for_next');
                }).catch((error) => {
                  logger.error('[WebSocket] Error fetching status:', error);
                });
              }
            }
            if (eventData.all_ready !== undefined && eventData.all_ready) {
              logger.log('[WebSocket] all_ready is true - both participants ready');
              setAllReadyForNext(true);
              
              // ✅ CRITICAL: If all_ready is true, fetch status immediately to get new question
              // This ensures both users move to next question simultaneously
              if (!eventData.current_question) {
                logger.log('[WebSocket] All ready but no question - fetching status IMMEDIATELY');
                fetchStatus(true).catch((error) => {
                  logger.error('[WebSocket] Error fetching status after all_ready:', error);
                });
              }
            }
          },
          onQuestionRevealed: (data) => {
            console.log('[WebSocket] ✅ Question revealed:', data);
            logger.log('[WebSocket] ✅ Question revealed:', data);
            // ✅ Data is already parsed in websocket.ts, use it directly
            const correctOptionId = data.correct_option_id;
            const responses = data.responses || [];
            console.log('[WebSocket] Setting reveal state:', { correctOptionId, responsesCount: responses.length });
            logger.log('[WebSocket] Setting reveal state:', { correctOptionId, responsesCount: responses.length });
            
            // ✅ CRITICAL: Clear countdown timer if it's running
            // This prevents the countdown from interfering with the reveal
            if (revealTimerRef.current) {
              logger.log('[WebSocket] Clearing countdown timer - question revealed via WebSocket');
              clearInterval(revealTimerRef.current);
              revealTimerRef.current = null;
            }
            countdownStartedRef.current = false;
            
            setCorrectOptionId(correctOptionId);
            setResponses(responses);
            setShowReveal(true);
            setRevealTimer(0); // Reset timer immediately
            console.log('[WebSocket] Reveal state updated - correct_option_id:', correctOptionId);
            logger.log('[WebSocket] Reveal state updated - correct_option_id:', correctOptionId);
          },
          onParticipantReady: (data) => {
            logger.log('[WebSocket] 👤 Participant ready:', data);
            const eventData = data.data || data;
            if (eventData.all_ready || data.all_ready) {
              logger.log('[WebSocket] ✅ All participants ready - next question ready');
              setAllReadyForNext(true);
              
              // ✅ CRITICAL: If all ready, fetch status immediately to get new question
              // This ensures both users move to next question simultaneously
              // Don't wait for periodic polling - fetch immediately
              // ✅ CRITICAL: Use fetchStatus(true) to bypass WebSocket check
              logger.log('[WebSocket] ✅ All ready - fetching status immediately for next question');
              fetchStatus(true).then((responseData) => {
                // ✅ CRITICAL: Check response data directly (not state) to see if both are ready
                // This ensures we catch the transition even if state hasn't updated yet
                if (responseData?.all_ready_for_next && responseData?.current_question) {
                  const newQuestionId = responseData.current_question.id;
                  const currentQuestionId = currentQuestion?.id;
                  
                  // If question changed, update immediately
                  if (currentQuestionId !== newQuestionId) {
                    logger.log('[WebSocket] ✅ Both ready detected in response - updating question immediately:', {
                      oldId: currentQuestionId,
                      newId: newQuestionId
                    });
                    
                    // Update question immediately
                    currentQuestionIdRef.current = newQuestionId;
                    setShowReveal(false);
                    setResponses([]);
                    setCorrectOptionId(null);
                    setSelectedOption(null);
                    selectedOptionRef.current = null;
                    setHasAnswered(false);
                    hasAnsweredRef.current = false;
                    setHasBothAnswered(false);
                    hasBothAnsweredFromAnswerRef.current = false;
                    setReadyForNext(false);
                    setAllReadyForNext(false);
                    
                    setCurrentQuestion(responseData.current_question);
                    setCurrentQuestionOrder(responseData.current_question.question_order);
                    
                    logger.log('[WebSocket] ✅ Question updated successfully from fetchStatus response');
                  }
                }
              }).catch((error) => {
                logger.error('[WebSocket] Error fetching status after all ready:', error);
              });
            }
            // Update participant ready state if needed
            if (eventData.is_ready !== undefined) {
              logger.log('[WebSocket] Participant ready state:', eventData.is_ready);
            }
          },
          onParticipantDisconnected: (data) => {
            logger.log('[WebSocket] ⚠️ Participant disconnected:', data);
            console.log('[WebSocket] ⚠️ Participant disconnected:', data);
            const eventData = data.data || data;
            
            // ✅ CRITICAL: Navigate to disconnected screen immediately
            logger.log('[WebSocket] Navigating to disconnected screen - reason:', eventData.reason || 'disconnected');
            console.log('[WebSocket] Navigating to disconnected screen - reason:', eventData.reason || 'disconnected');
            router.replace({
              pathname: '/multiplayer/disconnected',
              params: { 
                reason: eventData.reason || 'disconnected',
                sessionId: sessionIdNum.toString() 
              }
            });
          },
          onConnected: () => {
            logger.log('[WebSocket] ✅✅✅ CONNECTED - stopping ALL polling');
            // Update WebSocket connection state IMMEDIATELY
            isWebSocketConnectedRef.current = true;
            
            // ✅ CRITICAL: Stop polling IMMEDIATELY when WebSocket is connected
            if (pollingInterval.current) {
              logger.log('[WebSocket] 🛑🛑🛑 FORCE STOPPING polling - WebSocket is now primary');
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            } else {
              logger.log('[WebSocket] ✅ No polling to stop - already stopped');
            }
            
            // ✅ Double check: Ensure polling is stopped
            if (pollingInterval.current) {
              logger.log('[WebSocket] ⚠️ WARNING: Polling still active after stop attempt - force clearing');
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
            
            // ✅ Fetch initial status ONCE after WebSocket connection to get current state
            // This is needed to populate initial data (participants, current_question, etc.)
            // After this, we rely on WebSocket events only
            // ✅ CRITICAL: Only fetch if we haven't fetched yet (prevent excessive calls)
            if (!initialFetchDoneRef.current) {
              logger.log('[WebSocket] Fetching initial status ONCE after connection');
              fetchStatus(true); // Allow fetch even if WebSocket is connected (initial fetch)
            } else {
              logger.log('[WebSocket] Skipping initial fetch - already done');
            }
            
            // ✅ Safety timeout: Stop loading after 3 seconds if no data received
            // This prevents infinite loading if WebSocket events are delayed
            setTimeout(() => {
              if (loading) {
                logger.log('[WebSocket] Safety timeout - stopping loading after 3 seconds');
                setLoading(false);
              }
            }, 3000);
          },
          onDisconnected: () => {
            logger.log('[WebSocket] ❌ Disconnected - starting polling fallback');
            console.log('[WebSocket] ❌ Disconnected - starting polling fallback');
            // Update WebSocket connection state
            isWebSocketConnectedRef.current = false;
            
            // ✅ CRITICAL: If game is in progress, check for disconnection after delay
            // This gives WebSocket time to reconnect before declaring disconnection
            if (status === 'in_progress') {
              setTimeout(() => {
                // Check if WebSocket still disconnected after 10 seconds
                if (!isWebSocketConnectedRef.current && !websocket.isConnected() && status === 'in_progress') {
                  logger.log('[WebSocket] ⚠️ WebSocket still disconnected after 10s - checking for participant timeout');
                  console.log('[WebSocket] ⚠️ WebSocket still disconnected after 10s - checking for participant timeout');
                  // Fetch status to check if other participant disconnected
                  fetchStatus(true).catch((error) => {
                    logger.error('[WebSocket] Error checking status after disconnect:', error);
                  });
                }
              }, 10000); // Wait 10 seconds before checking
            }
            
            // Fallback to polling if WebSocket disconnects
            if (!pollingInterval.current) {
              logger.log('[Polling] Starting fallback polling after WebSocket disconnect');
              startPolling();
            }
          },
          onError: (error) => {
            logger.error('[WebSocket] ❌ Error:', error);
            // Update WebSocket connection state
            isWebSocketConnectedRef.current = false;
            // Fallback to polling on error
            if (!pollingInterval.current) {
              logger.log('[Polling] Starting fallback polling after WebSocket error');
              startPolling();
            }
          },
        });
      } catch (error) {
        logger.error('[WebSocket] ❌ Failed to connect, using polling fallback:', error);
        logger.error('[WebSocket] Error details:', error instanceof Error ? error.message : String(error));
        // Update WebSocket connection state
        isWebSocketConnectedRef.current = false;
        // Fallback to polling if WebSocket fails
        // ✅ DO NOT fetch status immediately - wait for polling to start
        // This prevents immediate API calls before polling is set up
        logger.log('[Polling] WebSocket failed - will start polling after delay');
        // Delay polling start to avoid immediate duplicate calls
        // Give WebSocket more time to potentially reconnect
        setTimeout(() => {
          // Double check WebSocket status before starting polling
          const wsConnected = isWebSocketConnectedRef.current || websocket.isConnected();
          logger.log('[Polling] Checking WebSocket status after delay:', {
            isWebSocketConnectedRef: isWebSocketConnectedRef.current,
            websocketConnected: websocket.isConnected(),
            wsConnected: wsConnected
          });
          if (!wsConnected) {
            logger.log('[Polling] ⚠️ Starting fallback polling after WebSocket connection failure (5s delay)');
            // Fetch status once when starting polling
    fetchStatus();
    startPolling();
          } else {
            logger.log('[Polling] ✅ WebSocket connected during delay - skipping polling');
            isWebSocketConnectedRef.current = true; // Sync the ref
            // Fetch status once after WebSocket connection
            fetchStatus(true); // Allow fetch even if WebSocket is connected (initial fetch)
          }
        }, 5000); // Wait 5 seconds before starting polling (give WebSocket more time to connect)
      }
    };

    // ✅ Try WebSocket connection immediately (no delay)
    // This ensures WebSocket connects before any polling starts
    console.log('[Multiplayer] 🚀 Starting WebSocket connection immediately for session:', sessionIdNum);
    console.log('[Multiplayer] Current WebSocket state:', {
      isWebSocketConnectedRef: isWebSocketConnectedRef.current,
      websocketConnected: websocket.isConnected(),
      pollingActive: !!pollingInterval.current
    });
    logger.log('[Multiplayer] 🚀 Starting WebSocket connection immediately for session:', sessionIdNum);
    logger.log('[Multiplayer] Current WebSocket state:', {
      isWebSocketConnectedRef: isWebSocketConnectedRef.current,
      websocketConnected: websocket.isConnected(),
      pollingActive: !!pollingInterval.current
    });
    tryWebSocket();

    return () => {
      websocket.disconnect();
      isWebSocketConnectedRef.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        logger.log('[Multiplayer] Cleanup: Stopped polling on unmount');
      }
      if (revealTimerRef.current) {
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      logger.log('[Multiplayer] Cleanup: Component unmounting');
    };
  }, [sessionIdNum]);

  // ✅ Monitor status changes - navigate to results when session completes
  // Also check if current_question is null (means session completed even if status not updated)
  useEffect(() => {
    if (status === 'completed') {
      logger.log('[Multiplayer] ✅ Session status is completed - navigating to results');
      console.log('[Multiplayer] ✅ Session status is completed - navigating to results');
      router.replace({
        pathname: '/multiplayer/results',
        params: { sessionId: sessionIdNum.toString() }
      });
    } else if (status === 'in_progress' && currentQuestion === null && !loading) {
      // ✅ CRITICAL: If status is 'in_progress' but current_question is null,
      // this means session completed but status wasn't updated yet (race condition)
      // Only check if not loading to avoid false positives during initial load
      logger.log('[Multiplayer] ⚠️ Status is in_progress but current_question is null - session completed, navigating to results');
      console.log('[Multiplayer] ⚠️ Status is in_progress but current_question is null - session completed, navigating to results');
      router.replace({
        pathname: '/multiplayer/results',
        params: { sessionId: sessionIdNum.toString() }
      });
    }
  }, [status, currentQuestion, loading, sessionIdNum, router]);

  // ✅ CRITICAL: Monitor for disconnection - check status cancelled and participant disconnected
  useEffect(() => {
    // Check if session is cancelled
    if (status === 'cancelled') {
      logger.log('[Multiplayer] ⚠️ Session cancelled - participant disconnected');
      console.log('[Multiplayer] ⚠️ Session cancelled - participant disconnected');
      router.replace({
        pathname: '/multiplayer/disconnected',
        params: { 
          reason: 'disconnected',
          sessionId: sessionIdNum.toString() 
        }
      });
      return;
    }

    // Check if other participant is disconnected
    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    if (otherParticipant && otherParticipant.status === 'disconnected') {
      logger.log('[Multiplayer] ⚠️ Other participant disconnected');
      console.log('[Multiplayer] ⚠️ Other participant disconnected');
      router.replace({
        pathname: '/multiplayer/disconnected',
        params: { 
          reason: 'disconnected',
          sessionId: sessionIdNum.toString() 
        }
      });
      return;
    }
  }, [status, participants, currentUserId, sessionIdNum, router]);

  // ✅ CRITICAL: Periodic check for disconnection (backup mechanism)
  // This checks every 15 seconds if the other participant is still active
  // This is a backup in case WebSocket events are missed or backend job is delayed
  useEffect(() => {
    // Only check if game is in progress
    if (status !== 'in_progress') {
      return;
    }

    logger.log('[Multiplayer] 🔍 Starting periodic disconnection check (every 15 seconds)');
    console.log('[Multiplayer] 🔍 Starting periodic disconnection check (every 15 seconds)');

      const checkInterval = setInterval(() => {
      // Only check if still in progress
      if (status === 'in_progress') {
        logger.log('[Multiplayer] 🔍 Periodic disconnection check - fetching status');
        console.log('[Multiplayer] 🔍 Periodic disconnection check - fetching status');
        // Fetch status to check for participant_timeout_detected
        // This will check ALL participants, not just the current user
        fetchStatus(true).catch((error) => {
          logger.error('[Multiplayer] Error in periodic disconnection check:', error);
        });
      }
    }, 30000); // Check every 30 seconds (reduced from 15 to improve performance)

    // ✅ CRITICAL: Periodic activity update to prevent false timeout detection
    // Update activity every 30 seconds (less than 180 second threshold) to ensure active users are not disconnected
    // This allows users to think and discuss questions without being disconnected
    logger.log('[Multiplayer] 🔄 Starting periodic activity update (every 30 seconds)');
    const activityInterval = setInterval(() => {
      // Only update if still in progress
      if (status === 'in_progress') {
        logger.log('[Multiplayer] 🔄 Periodic activity update - keeping user active');
        // Update activity in backend to prevent false timeout detection
        api.post(API_ENDPOINTS.MULTIPLAYER_ACTIVITY(sessionIdNum)).catch((error) => {
          // Silent fail - don't block if activity update fails
          logger.warn('[Multiplayer] Failed to update activity:', error);
        });
      }
    }, 30000); // Update every 30 seconds (less than 180 second threshold)

    return () => {
      logger.log('[Multiplayer] 🛑 Stopping periodic disconnection check');
      clearInterval(checkInterval);
      clearInterval(activityInterval);
    };
  }, [status, sessionIdNum]); // Re-run if status changes

  // ✅ NO POLLING - Rely on WebSocket events only
  // WebSocket will send session.updated event when all participants are ready
  // This will update all_ready_for_next and trigger next question transition
  // Only use polling as fallback if WebSocket is not connected
  useEffect(() => {
    // Only use this polling if WebSocket is not connected (fallback only)
    if (readyForNext && !allReadyForNext && showReveal && !isWebSocketConnectedRef.current) {
      logger.log('[Polling] Starting fallback polling for next question (WebSocket not connected)');
      const checkInterval = setInterval(() => {
        // ✅ Stop polling if WebSocket reconnects
        if (isWebSocketConnectedRef.current) {
          clearInterval(checkInterval);
          logger.log('[Polling] Stopped fallback polling - WebSocket reconnected');
          return;
        }
        fetchStatus();
      }, 5000); // ✅ Longer interval for fallback polling (5 seconds)
      
      return () => {
        clearInterval(checkInterval);
        logger.log('[Polling] Stopped fallback polling for next question');
      };
    }
  }, [readyForNext, allReadyForNext, showReveal]);

  useEffect(() => {
    logger.log('[COUNTDOWN DEBUG]', {
      hasBothAnswered,
      showReveal,
      hasQuestion: !!currentQuestion,
      countdownStarted: countdownStartedRef.current,
      timerActive: !!revealTimerRef.current,
      hasBothAnsweredRef: hasBothAnsweredRef.current
    });

    if (hasBothAnswered && !showReveal && currentQuestion) {
      // ✅ CRITICAL: If timer is stuck (hasBothAnswered is true but timer is not running)
      // Restart the timer immediately
      if (!revealTimerRef.current && revealTimer > 0 && revealTimer < 3) {
        logger.log('[COUNTDOWN] ⚠️ Timer appears stuck - restarting countdown', {
          revealTimer,
          hasBothAnswered,
          showReveal,
          countdownStarted: countdownStartedRef.current
        });
        // Reset timer to 3 and restart
        setRevealTimer(3);
        countdownStartedRef.current = true;
        hasBothAnsweredRef.current = true;
      }
      
      // ✅ CRITICAL: Prevent multiple timers
      if (revealTimerRef.current) {
        logger.log('[COUNTDOWN] Timer already running, clearing it');
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      
      // ✅ CRITICAL: Double-check conditions before starting timer
      if (showReveal) {
        logger.log('[COUNTDOWN] Skipping - showReveal is true');
        return;
      }

      // ✅ CRITICAL: If countdown already started but timer is not running, restart it
      if (countdownStartedRef.current && !revealTimerRef.current) {
        logger.log('[COUNTDOWN] ⚠️ Countdown started but timer not running - restarting');
        setRevealTimer(3);
      }

      logger.log('[COUNTDOWN] Starting countdown timer');
      setRevealTimer(3);
      countdownStartedRef.current = true; // ✅ Lock hasBothAnswered during countdown
      hasBothAnsweredRef.current = true; // ✅ Update ref immediately
      
      // ✅ CRITICAL: Stop polling during countdown
      if (pollingInterval.current) {
        logger.log('[COUNTDOWN] Stopping polling during countdown');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }

      revealTimerRef.current = setInterval(() => {
        // ✅ CRITICAL: Use refs to get current values (avoid stale closures)
        // Check if reveal was triggered by WebSocket or handleReveal
        if (showRevealRef.current) {
          logger.log('[COUNTDOWN] Timer stopped - showReveal is true (reveal already triggered)');
          if (revealTimerRef.current) {
            clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          countdownStartedRef.current = false;
          return;
        }
        
        // ✅ CRITICAL: Check if hasBothAnswered is still true
        if (!hasBothAnsweredRef.current) {
          logger.log('[COUNTDOWN] Timer stopped - hasBothAnswered is false');
          if (revealTimerRef.current) {
            clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          countdownStartedRef.current = false;
          // ✅ Resume polling if countdown stopped (only if WebSocket not connected)
          if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
            logger.log('[COUNTDOWN] Resuming fallback polling after countdown stopped');
            startPolling();
          }
          return;
        }

        setRevealTimer((prev) => {
          logger.log('[COUNTDOWN] Timer tick:', prev, {
            showReveal: showRevealRef.current,
            hasBothAnswered: hasBothAnsweredRef.current,
            countdownStarted: countdownStartedRef.current
          });
          
          // ✅ CRITICAL: Double-check conditions before decrementing
          if (showRevealRef.current) {
            logger.log('[COUNTDOWN] Timer stopped during tick - showReveal is true');
            if (revealTimerRef.current) {
              clearInterval(revealTimerRef.current);
              revealTimerRef.current = null;
            }
            countdownStartedRef.current = false;
            return prev; // Don't change timer value
          }
          
          // ✅ CRITICAL: Only check hasBothAnswered if countdown hasn't started yet
          // Once countdown starts, it should complete regardless of hasBothAnswered
          // (unless showReveal becomes true)
          if (!hasBothAnsweredRef.current && !countdownStartedRef.current) {
            logger.log('[COUNTDOWN] Timer stopped during tick - hasBothAnswered is false and countdown not started');
            if (revealTimerRef.current) {
              clearInterval(revealTimerRef.current);
              revealTimerRef.current = null;
            }
            countdownStartedRef.current = false;
            return prev; // Don't change timer value
          }
          
          if (prev <= 1) {
            logger.log('[COUNTDOWN] Countdown complete, calling handleReveal');
            if (revealTimerRef.current) {
              clearInterval(revealTimerRef.current);
              revealTimerRef.current = null;
            }
            countdownStartedRef.current = false;
            // ✅ CRITICAL: Call handleReveal immediately (not asynchronously)
            // This ensures reveal happens right away
            handleReveal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!hasBothAnswered || showReveal) {
      // ✅ CRITICAL: Clear timer if conditions change
      if (revealTimerRef.current) {
        logger.log('[COUNTDOWN] Clearing timer - conditions changed', {
          hasBothAnswered,
          showReveal
        });
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      countdownStartedRef.current = false;
    }

    return () => {
      if (revealTimerRef.current) {
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [hasBothAnswered, showReveal, currentQuestion]);

  const fetchStatus = async (allowIfWebSocketConnected: boolean = false) => {
    // ✅ CRITICAL: Check WebSocket connection BEFORE fetching
    // If WebSocket is connected, stop polling immediately
    if (isWebSocketConnectedRef.current || websocket.isConnected()) {
      if (pollingInterval.current) {
        logger.log('[FETCH STATUS] ⚠️⚠️⚠️ WebSocket connected but polling active - FORCE STOPPING polling');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // ✅ Allow fetchStatus ONCE after WebSocket connection (for initial state)
      // After that, rely on WebSocket events only
      if (!allowIfWebSocketConnected && initialFetchDoneRef.current) {
        logger.log('[FETCH STATUS] ⚠️ Skipping fetch - WebSocket is connected, relying on WebSocket events');
        return null;
      }
      
      // Mark initial fetch as done
      if (allowIfWebSocketConnected) {
        initialFetchDoneRef.current = true;
        logger.log('[FETCH STATUS] ✅ Allowing initial fetch after WebSocket connection');
      }
    }
    
    // ✅ ALWAYS log who called fetchStatus (for debugging) - to track polling source
    const stack = new Error().stack || '';
    const stackLines = stack.split('\n');
    const caller = stackLines.length > 2 ? stackLines[2]?.trim() || 'unknown' : 'unknown';
    console.log('[FETCH STATUS] 🔄 Called from:', caller);
    console.log('[FETCH STATUS] Full stack:', stackLines.slice(0, 5).join('\n'));
    console.log('[FETCH STATUS] State:', {
      isWebSocketConnected: isWebSocketConnectedRef.current,
      websocketConnected: websocket.isConnected(),
      pollingActive: !!pollingInterval.current,
      allowIfWebSocketConnected: allowIfWebSocketConnected,
      sessionIdNum: sessionIdNum
    });
    logger.log('[FETCH STATUS] 🔄 Called from:', caller);
    logger.log('[FETCH STATUS] Full stack:', stackLines.slice(0, 5).join('\n'));
    logger.log('[FETCH STATUS] State:', {
      isWebSocketConnected: isWebSocketConnectedRef.current,
      websocketConnected: websocket.isConnected(),
      pollingActive: !!pollingInterval.current,
      allowIfWebSocketConnected: allowIfWebSocketConnected,
      sessionIdNum: sessionIdNum
    });
    
    try {
      const response = await api.get<{
        ok: boolean;
        data: {
          status: string;
          current_question: Question | null;
          has_both_answered: boolean;
          has_current_user_answered?: boolean; // ✅ إضافة للتحقق من إجابة المستخدم الحالي
          participants: Participant[];
          participant_timeout_detected: boolean;
          all_ready_for_next?: boolean;
        };
      }>(API_ENDPOINTS.MULTIPLAYER_STATUS(sessionIdNum));
      
      // Store response data for return value
      let responseDataToReturn: any = null;

      if (response && response.ok && response.data) {
        const responseData = response.data; // Store for return value
        responseDataToReturn = responseData; // Store for return
        setStatus(responseData.status);
        setParticipants(responseData.participants);
        
        // ✅ CRITICAL: Check if question changed FIRST before updating any states
        // This prevents resetting states when question hasn't changed
        let questionChanged = false;
        const currentQuestionId = currentQuestion?.id;
        const currentQuestionIdFromRef = currentQuestionIdRef.current; // ✅ Use ref as source of truth
        
        if (responseData.current_question) {
          const newQuestionOrder = responseData.current_question.question_order;
          const newQuestionId = responseData.current_question.id;
          
          // ✅ CRITICAL: Use ref as source of truth (not state) to detect question changes
          // The ref is updated immediately by handleNext/WebSocket, so it's more reliable
          // If ref has a different ID than API response, it means question was already updated
          // In this case, we should NOT update it again (to prevent resetting selectedOption)
          
          // ✅ CRITICAL: Check if server says all_ready_for_next FIRST (before checking ref)
          // This handles case where user is waiting and server says both are ready
          const serverAllReadyForNext = response.data.all_ready_for_next || false;
          
          // ✅ CRITICAL: If server says all_ready_for_next, we MUST update question even if ref matches
          // This ensures user who is waiting gets the new question immediately
          if (serverAllReadyForNext && currentQuestionIdFromRef === newQuestionId && currentQuestionId !== newQuestionId) {
            // Server says both ready, ref has new ID, but state doesn't - sync state immediately
            logger.log('[FETCH STATUS] ✅ Server says all_ready_for_next - syncing state with ref:', {
              refId: currentQuestionIdFromRef,
              apiId: newQuestionId,
              stateId: currentQuestionId
            });
            
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(newQuestionOrder);
            setAllReadyForNext(false); // Reset after transition
            
            // Reset states for new question
            setShowReveal(false);
            setResponses([]);
            setCorrectOptionId(null);
            setSelectedOption(null);
            selectedOptionRef.current = null;
            setHasAnswered(false);
            hasAnsweredRef.current = false;
            setHasBothAnswered(false);
            hasBothAnsweredFromAnswerRef.current = false;
            setReadyForNext(false);
            
            return; // Don't process further - question updated
          }
          
          // ✅ CRITICAL: Check if ref has different ID than API response
          // If ref has the new ID, it means question was already updated by handleNext/WebSocket
          // In this case, we should NOT update it again (to prevent resetting selectedOption)
          if (currentQuestionIdFromRef !== null && currentQuestionIdFromRef !== undefined && currentQuestionIdFromRef === newQuestionId) {
            // Ref already has the new ID - question was already updated by handleNext/WebSocket
            // Don't update it again to prevent resetting selectedOption
            logger.log('[FETCH STATUS] ⚠️ Skipping update - question ID in ref matches API (already updated):', {
              refId: currentQuestionIdFromRef,
              apiId: newQuestionId,
              stateId: currentQuestionId
            });
            
            // ✅ CRITICAL: Still update currentQuestion if state is different (sync state with ref)
            if (currentQuestionId !== newQuestionId) {
              logger.log('[FETCH STATUS] Syncing currentQuestion state with ref');
              setCurrentQuestion(response.data.current_question);
              setCurrentQuestionOrder(newQuestionOrder);
            }
            
            return responseDataToReturn; // Don't process further - question was already updated
          }
          
          // ✅ CRITICAL: Only check question ID to detect changes (NOT question_order)
          // question_order may change due to API inconsistencies, but ID is the source of truth
          // This prevents false positives where orderChanged is true but it's the same question
          // ✅ CRITICAL: Don't consider it changed if currentQuestionId is null/undefined (first time loading)
          // This prevents deleting selectedOption when question is first loaded
          const stateIdChanged = currentQuestionId !== null && currentQuestionId !== undefined && currentQuestionId !== newQuestionId;
          questionChanged = stateIdChanged; // ✅ ONLY use ID change, ignore order change
          
          // Log for debugging
          if (currentQuestionOrder !== 0 && currentQuestionOrder !== newQuestionOrder && !questionChanged) {
            logger.log('[FETCH STATUS] ⚠️ Question order changed but ID is same - ignoring order change to protect user selection:', {
              currentOrder: currentQuestionOrder,
              newOrder: newQuestionOrder,
              questionId: newQuestionId,
              hasSelectedOption: selectedOption !== null || selectedOptionRef.current !== null
            });
          }
          
          if (questionChanged) {
            // Question changed - reset ALL states completely (this is critical!)
            // ✅ CRITICAL FIX: Reset states in correct order to prevent UI glitches
            // 1. Reset readyForNext FIRST to allow answering
            // 2. Reset showReveal to hide old reveal state (+1 نقطة)
            // 3. Reset responses to clear old data
            // 4. Then update question
            // ✅ CRITICAL: Only reset selectedOption if question ID ACTUALLY changed
            // Double-check: make sure question ID is different AND currentQuestionId is not null/undefined
            // If currentQuestionId is null/undefined, this is first time loading, don't delete selectedOption
            const actualQuestionIdChanged = currentQuestionId !== null && currentQuestionId !== undefined && currentQuestionId !== newQuestionId;
            
            // ✅ CRITICAL: Also check if ref has different ID (question was already updated)
            // If ref has different ID, it means question was already updated by handleNext/WebSocket
            // In this case, we should NOT update it again (to prevent resetting selectedOption)
            if (currentQuestionIdFromRef !== null && currentQuestionIdFromRef !== undefined && currentQuestionIdFromRef !== newQuestionId) {
              logger.log('[FETCH STATUS] ⚠️ Skipping update - question ID in ref differs from API (already updated by handleNext/WebSocket):', {
                refId: currentQuestionIdFromRef,
                apiId: newQuestionId,
                stateId: currentQuestionId
              });
              return responseDataToReturn; // Don't process further - question was already updated
            }
            
            if (actualQuestionIdChanged) {
              logger.log('[FETCH STATUS] ✅ Question ID actually changed - resetting selectedOption:', {
                oldId: currentQuestionId,
                newId: newQuestionId
              });
              
              // ✅ CRITICAL: Update ref FIRST to prevent future fetchStatus calls from resetting
              currentQuestionIdRef.current = newQuestionId;
              
            setReadyForNext(false);
            setAllReadyForNext(false);
            setShowReveal(false); // ✅ Reset showReveal FIRST to hide "+1 نقطة" from previous question
            setResponses([]); // ✅ Reset responses to clear old data
            setCorrectOptionId(null);
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(newQuestionOrder);
            setSelectedOption(null);
              selectedOptionRef.current = null; // ✅ Also reset ref when question changes
            setHasAnswered(false);
            setHasBothAnswered(false);
            setIsSubmitting(false); // ✅ Reset submitting flag
            hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
            countdownStartedRef.current = false; // ✅ Reset countdown lock on question change
            setRevealTimer(3);
            revealOpacity.value = 0;
            revealScale.value = 0.8;
            } else {
              // Question didn't actually change OR this is first time loading - don't reset selectedOption
              logger.log('[FETCH STATUS] ⚠️ NOT resetting selectedOption - question ID same or first time loading:', {
                currentQuestionId,
                newQuestionId,
                selectedOption,
                selectedOptionRef: selectedOptionRef.current,
                isFirstTime: currentQuestionId === null || currentQuestionId === undefined,
                allReadyForNext
              });
              
              // ✅ CRITICAL: Check if server says all_ready_for_next (from response, not state)
              // This handles case where user is waiting and server says both are ready
              const serverAllReadyForNext = response.data.all_ready_for_next || false;
              if (serverAllReadyForNext) {
                const newQuestionId = response.data.current_question?.id;
                const currentQuestionId = currentQuestion?.id;
                const refQuestionId = currentQuestionIdRef.current;
                
                // ✅ CRITICAL: Update if question ID changed OR if currentQuestion is undefined
                // This handles case where ref has question ID but state doesn't
                if (newQuestionId && (currentQuestionId === undefined || currentQuestionId !== newQuestionId)) {
                  logger.log('[FETCH STATUS] ✅ Server says all_ready_for_next AND question changed/undefined - updating immediately:', {
                    oldId: currentQuestionId,
                    newId: newQuestionId,
                    refId: refQuestionId,
                    serverAllReady: serverAllReadyForNext,
                    localAllReady: allReadyForNext
                  });
                  
                  // Update question immediately
                  currentQuestionIdRef.current = newQuestionId;
                  
                  // Only reset states if question actually changed (not just undefined)
                  if (currentQuestionId !== undefined && currentQuestionId !== newQuestionId) {
                    setShowReveal(false);
                    setResponses([]);
                    setCorrectOptionId(null);
                    setSelectedOption(null);
                    selectedOptionRef.current = null;
                    setHasAnswered(false);
                    hasAnsweredRef.current = false;
                    setHasBothAnswered(false);
                    hasBothAnsweredFromAnswerRef.current = false;
                    setReadyForNext(false);
                  }
                  
                  setAllReadyForNext(false); // Reset after transition
                  
                  if (responseData.current_question) {
                    setCurrentQuestion(responseData.current_question);
                    setCurrentQuestionOrder(responseData.current_question.question_order);
                  }
                  
                  logger.log('[FETCH STATUS] ✅ Question updated successfully during all_ready_for_next transition');
                  return responseDataToReturn; // Don't process further - question updated
                } else {
                  logger.log('[FETCH STATUS] ⚠️ Server says all_ready_for_next but question unchanged:', {
                    currentQuestionId,
                    newQuestionId,
                    refId: refQuestionId
                  });
                }
              }
              
              // ✅ CRITICAL: Also check local allReadyForNext state (for backward compatibility)
              if (allReadyForNext) {
                const newQuestionId = responseData.current_question?.id;
                const currentQuestionId = currentQuestion?.id;
                const refQuestionId = currentQuestionIdRef.current;
                
                // ✅ CRITICAL: Update if question ID changed OR if currentQuestion is undefined
                // This handles case where ref has question ID but state doesn't
                if (newQuestionId && (currentQuestionId === undefined || currentQuestionId !== newQuestionId)) {
                  logger.log('[FETCH STATUS] ✅ Local allReadyForNext is true AND question changed/undefined - updating immediately:', {
                    oldId: currentQuestionId,
                    newId: newQuestionId,
                    refId: refQuestionId
                  });
                  
                  // Update question immediately
                  currentQuestionIdRef.current = newQuestionId;
                  
                  // Only reset states if question actually changed (not just undefined)
                  if (currentQuestionId !== undefined && currentQuestionId !== newQuestionId) {
                    setShowReveal(false);
                    setResponses([]);
                    setCorrectOptionId(null);
                    setSelectedOption(null);
                    selectedOptionRef.current = null;
                    setHasAnswered(false);
                    hasAnsweredRef.current = false;
                    setHasBothAnswered(false);
                    hasBothAnsweredFromAnswerRef.current = false;
                    setReadyForNext(false);
                  }
                  
                  setAllReadyForNext(false); // Reset after transition
                  
                  setCurrentQuestion(responseData.current_question);
                  setCurrentQuestionOrder(responseData.current_question.question_order);
                  
                  logger.log('[FETCH STATUS] ✅ Question updated successfully during allReadyForNext transition');
                  return responseDataToReturn; // Don't process further - question updated
                } else {
                  logger.log('[FETCH STATUS] ⚠️ Skipping update - allReadyForNext is true but question unchanged (transition in progress)');
                  return responseDataToReturn; // Don't process further - wait for transition to complete
                }
              }
              
              // ✅ CRITICAL: Still update currentQuestion if it's first time, but DON'T delete selectedOption
              if (currentQuestionId === null || currentQuestionId === undefined) {
                // First time loading - just set the question, don't reset anything
                setCurrentQuestion(responseData.current_question);
                setCurrentQuestionOrder(newQuestionOrder);
              }
            }
          } else if (currentQuestionOrder === 0) {
            // First question - just set it
            // ✅ CRITICAL: ABSOLUTELY NEVER update currentQuestion if user has selected an option
            // This is the KEY to preventing selectedOption from being deleted
            // Even if it's the first question, if user has selected an option, DON'T touch currentQuestion
            const hasSelectedOption = selectedOption !== null || selectedOptionRef.current !== null;
            
            if (hasSelectedOption) {
              // ✅ CRITICAL: User has selected an option - DO NOT update currentQuestion AT ALL
              // This prevents useEffect from firing and resetting selectedOption
              logger.log('[FETCH STATUS] ⚠️ Skipping ALL updates for first question - user has selected option:', {
                selectedOption,
                selectedOptionRef: selectedOptionRef.current
              });
              // DO NOTHING - don't update currentQuestion, don't reset any states
              // User's selection is protected
            } else {
              // User hasn't selected an option yet - safe to update currentQuestion
            if (!showReveal) {
              setReadyForNext(false);
              setAllReadyForNext(false);
              setShowReveal(false);
              setResponses([]);
              setCorrectOptionId(null);
              setHasAnswered(false);
              setHasBothAnswered(false);
                hasBothAnsweredFromAnswerRef.current = false;
            }
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(newQuestionOrder);
            }
          } else {
            // Same question - ABSOLUTELY DO NOT update currentQuestion object
            // ✅ CRITICAL: Don't call setCurrentQuestion even if object reference is different
            // This prevents useEffect from firing and potentially resetting selectedOption
            // The question object reference may change from API, but if ID is same, we ignore it
            // DO NOT reset selectedOption, hasAnswered, showReveal, etc.
            // These states should only be reset when question actually changes
            
            // ✅ CRITICAL: If allReadyForNext is true, check if question actually changed
            // If question changed, we MUST update it (both users are ready for next question)
            if (allReadyForNext) {
              const newQuestionId = response.data.current_question?.id;
          const currentQuestionId = currentQuestion?.id;
              
              // ✅ CRITICAL: If question ID changed, we MUST update it (transition is happening)
              if (newQuestionId && currentQuestionId !== newQuestionId) {
                logger.log('[FETCH STATUS] ✅ allReadyForNext is true AND question changed - updating immediately:', {
                  oldId: currentQuestionId,
                  newId: newQuestionId
                });
                
                // Update question immediately
                currentQuestionIdRef.current = newQuestionId;
            setShowReveal(false);
            setResponses([]);
            setCorrectOptionId(null);
            setSelectedOption(null);
                selectedOptionRef.current = null;
            setHasAnswered(false);
                hasAnsweredRef.current = false;
            setHasBothAnswered(false);
                hasBothAnsweredFromAnswerRef.current = false;
                setReadyForNext(false);
                setAllReadyForNext(false); // Reset after transition
                
                setCurrentQuestion(response.data.current_question);
                if (responseData.current_question) {
                  setCurrentQuestionOrder(responseData.current_question.question_order);
                }
                
                logger.log('[FETCH STATUS] ✅ Question updated successfully during allReadyForNext transition');
                return responseDataToReturn; // Don't process further - question updated
              } else {
                logger.log('[FETCH STATUS] ⚠️ Skipping update - allReadyForNext is true but question unchanged (waiting for transition)');
                return responseDataToReturn; // Don't process further - wait for transition
              }
            }
            
            // ✅ CRITICAL: If selectedOption was cleared but ref still has value, restore it IMMEDIATELY
            // This protects against any code that might have cleared it (even after hasAnswered becomes true)
            // ✅ CRITICAL: This protection works ALWAYS - even if hasAnswered is true
            // User needs to see their answer even after submission
            if (selectedOption === null && selectedOptionRef.current !== null) {
              logger.log('[FETCH STATUS] ⚠️ RESTORING selectedOption - it was cleared but ref has value!', {
                selectedOption,
                selectedOptionRef: selectedOptionRef.current,
                hasAnswered,
                showReveal,
                currentQuestionId: currentQuestion?.id
              });
              setSelectedOption(selectedOptionRef.current);
            }
            
            // ✅ CRITICAL: Also protect selectedOptionRef - if it was cleared but selectedOption has value, restore it
            // This is a double protection - both state and ref must be protected
            if (selectedOptionRef.current === null && selectedOption !== null) {
              logger.log('[FETCH STATUS] ⚠️ RESTORING selectedOptionRef - it was cleared but selectedOption has value!', {
                selectedOption,
                selectedOptionRef: selectedOptionRef.current,
                hasAnswered,
                showReveal,
                currentQuestionId: currentQuestion?.id
              });
              selectedOptionRef.current = selectedOption;
            }
            
            logger.log('[FETCH STATUS] Same question - NOT updating currentQuestion object to protect user selection:', {
              currentQuestionId: currentQuestion?.id,
              newQuestionId: responseData.current_question?.id,
              hasSelectedOption: selectedOption !== null || selectedOptionRef.current !== null,
              selectedOption,
              selectedOptionRef: selectedOptionRef.current
            });
            // ✅ ABSOLUTE PROTECTION: Never call setCurrentQuestion if question ID is same
            // This is the key to preventing useEffect from firing and resetting selectedOption
          }
        } else if (!response.data.current_question && currentQuestion) {
          // Question disappeared (shouldn't happen, but handle it)
          // This might mean the session ended or question was removed
        }
        
        // ✅ REMOVED: Force reset logic that was deleting selectedOption
        // This logic was causing selectedOption to be deleted even when question didn't change
        // selectedOption should ONLY be deleted when question actually changes (handled above)

        // IMPORTANT: Update readyForNext based on server state
        // ✅ CRITICAL FIX: If question changed, ALWAYS reset readyForNext regardless of server state
        // This prevents race conditions where readyForNext stays true after question change
        if (questionChanged) {
          // Question changed - ALWAYS reset readyForNext to false
          // Server has already reset ready_for_next to false in database
          // We must sync immediately, even if server response hasn't updated yet
          setReadyForNext(false);
          setAllReadyForNext(false);
        } else {
          // Question didn't change - sync with server state
          // ✅ CRITICAL: Only update readyForNext if showReveal is true (after reveal)
          // Before reveal, readyForNext should always be false
          if (showReveal) {
          const currentUserParticipant = response.data.participants.find((p: any) => p.user_id === user?.id);
          if (currentUserParticipant) {
            // ✅ Read ready_for_next from server response (now included in status endpoint)
            const participantReady = currentUserParticipant.ready_for_next ?? false;
              // Server state is the source of truth when question hasn't changed and reveal is shown
            setReadyForNext(participantReady);
          } else {
            // If no participant found and question didn't change, check from all_ready_for_next
            // This is a fallback
            if (response.data.all_ready_for_next === false) {
                setReadyForNext(false);
              }
            }
          } else {
            // ✅ CRITICAL: Before reveal, readyForNext must be false
            // This ensures "التالي" button appears after reveal
            if (readyForNext) {
              logger.log('[FETCH STATUS] Resetting readyForNext to false - reveal not shown yet');
              setReadyForNext(false);
            }
          }
        }
        
        // ✅ CRITICAL: NEVER update hasAnswered or selectedOption from fetchStatus
        // Once user selects an option locally (even before submitting), it's PROTECTED
        // fetchStatus should NEVER interfere with user's local selection
        // Check BOTH state and ref to ensure absolute lock (ref is immediate, state might lag)
        const hasAnsweredLocally = hasAnswered || hasAnsweredRef.current;
        const hasSelectedLocally = selectedOption !== null || selectedOptionRef.current !== null;
        
        // ✅ CRITICAL: selectedOption is ALWAYS protected - fetchStatus cannot change it
        // User's local selection is the ONLY source of truth until they submit
        if (!questionChanged && !showReveal) {
          if (!hasAnsweredLocally) {
            // ✅ User hasn't submitted final answer yet
            // DON'T sync selectedOption from server - user's local selection is protected
            // Only sync hasAnswered from server if user answered on different device (very rare)
            const serverHasAnswered = response.data.has_current_user_answered;
            if (serverHasAnswered && !hasAnswered) {
              logger.log('[FETCH STATUS] User answered on another device - syncing hasAnswered from server', {
                serverHasAnswered
              });
              setHasAnswered(true);
              hasAnsweredRef.current = true;
              // Note: We don't set selectedOption because user's local selection is protected
            }
            // ✅ ABSOLUTE PROTECTION: Never clear selectedOption - user's selection is protected
            // If user has selected an option, it stays selected until they submit or change it manually
          } else {
            // ✅ CRITICAL: User has submitted answer locally - IGNORE ALL server updates for hasAnswered/selectedOption
            // BUT: We MUST still allow hasBothAnswered to update from server
            // This is the ABSOLUTE lock - once user submits answer, fetchStatus CANNOT change it
            logger.log('[FETCH STATUS] User has submitted answer locally - protecting local answer, but allowing hasBothAnswered update', {
              hasAnswered,
              hasAnsweredRef: hasAnsweredRef.current,
              selectedOption,
              selectedOptionRef: selectedOptionRef.current,
              serverHasAnswered: response.data.has_current_user_answered
            });
            // ✅ ABSOLUTE LOCK for hasAnswered and selectedOption: DO NOTHING - keep local state unchanged FOREVER
            // But hasBothAnswered will be updated below in the separate logic
          }
        }

        // ✅ CRITICAL: Update hasBothAnswered - this MUST happen regardless of other locks
        // Even if user answered locally, we need to know when other user answered
        // This is essential for the countdown and reveal to work
        // ✅ CRITICAL: NEVER update hasBothAnswered during countdown - let it complete
        if (!questionChanged && !showReveal && !countdownStartedRef.current) {
          const serverHasBothAnswered = response.data.has_both_answered;
          
          // ✅ CRITICAL: If server says both answered, ALWAYS update to true IMMEDIATELY
          // This ensures countdown starts simultaneously for both users
          // This is the MOST IMPORTANT update - we need to know when both users answered
          if (serverHasBothAnswered) {
            // ✅ ALWAYS update to true if server says both answered
            // This ensures countdown starts immediately for both users (synchronized)
            if (!hasBothAnswered) {
              logger.log('[FETCH STATUS] Updating hasBothAnswered to true (both users answered - starting countdown)', {
                serverHasBothAnswered,
                localHasBothAnswered: hasBothAnswered,
                hasAnswered,
                countdownStarted: countdownStartedRef.current
              });
              setHasBothAnswered(true);
              hasBothAnsweredRef.current = true; // ✅ Update ref immediately
              hasBothAnsweredFromAnswerRef.current = false; // Came from fetchStatus
              // ✅ CRITICAL: If user already answered, lock their answer (can't change anymore)
              // This prevents user from changing answer after other user has answered
              if (hasAnswered) {
                logger.log('[FETCH STATUS] Locking user answer - other user has answered');
              }
            } else {
              // Already true, just ensure ref is updated (countdown should have started)
              hasBothAnsweredRef.current = true;
            }
          } else if (!serverHasBothAnswered && !hasBothAnswered && !hasAnswered && !hasSelectedLocally) {
            // User hasn't answered AND hasn't selected an option AND hasBothAnswered is false - sync with server
            // ✅ CRITICAL: Don't reset hasBothAnswered if user has selected an option (they're still thinking)
            setHasBothAnswered(false);
            hasBothAnsweredRef.current = false;
          } else if (hasBothAnswered && !serverHasBothAnswered) {
            // ✅ CRITICAL: Once countdown starts, NEVER reset hasBothAnswered to false
            // This ensures countdown completes regardless of server state
            logger.log('[FETCH STATUS] Keeping hasBothAnswered as true - countdown must complete', {
              serverHasBothAnswered,
              localHasBothAnswered: hasBothAnswered,
              countdownStarted: countdownStartedRef.current
            });
            // Don't update - keep hasBothAnswered as true
          }
        } else {
          if (countdownStartedRef.current) {
            logger.log('[FETCH STATUS] ⚠️ Skipping hasBothAnswered update - countdown in progress (must complete)');
          } else if (showReveal) {
            logger.log('[FETCH STATUS] Skipping hasBothAnswered update - reveal in progress');
          } else if (questionChanged) {
            logger.log('[FETCH STATUS] Skipping hasBothAnswered update - question changed');
          }
        }
        
        // Check if all ready for next (from participants or from response)
        const allReadyFromParticipants = response.data.participants.length === 2 && 
                         response.data.participants.every((p: any) => p.ready_for_next);
        const allReadyFromResponse = response.data.all_ready_for_next || false;
        const allReady = allReadyFromParticipants || allReadyFromResponse;
        setAllReadyForNext(allReady);
        
        // ✅ REMOVED: Force reset logic that was deleting selectedOption
        // This logic was causing selectedOption to be deleted even when question didn't change
        // selectedOption should ONLY be deleted when question actually changes (handled above)
        // If question ID changed, it will be detected by the main questionChanged logic above

        // Check if session completed or timeout
        if (response.data.status === 'completed') {
          router.replace({
            pathname: '/multiplayer/results',
            params: { sessionId: sessionIdNum.toString() }
          });
        }

        // ✅ CRITICAL: Check for participant timeout/disconnection
        if (response.data.participant_timeout_detected) {
          logger.log('[Multiplayer] ⚠️ Participant timeout detected - navigating to disconnected screen');
          console.log('[Multiplayer] ⚠️ Participant timeout detected - navigating to disconnected screen');
          // ✅ CRITICAL: Stop all intervals and disconnect WebSocket before navigating
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          websocket.disconnect();
          router.replace({
            pathname: '/multiplayer/disconnected',
            params: { 
              reason: 'disconnected',
              sessionId: sessionIdNum.toString() 
            }
          });
          return; // Stop processing further
        }
        
        // ✅ ADDITIONAL CHECK: Check if other participant status is 'disconnected'
        const otherParticipant = response.data.participants?.find((p: Participant) => p.user_id !== currentUserId);
        if (otherParticipant) {
          // Check status
          if (otherParticipant.status === 'disconnected') {
            logger.log('[Multiplayer] ⚠️ Other participant status is disconnected - navigating to disconnected screen');
            console.log('[Multiplayer] ⚠️ Other participant status is disconnected - navigating to disconnected screen');
            // ✅ CRITICAL: Stop all intervals and disconnect WebSocket before navigating
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
            websocket.disconnect();
            router.replace({
              pathname: '/multiplayer/disconnected',
              params: { 
                reason: 'disconnected',
                sessionId: sessionIdNum.toString() 
              }
            });
            return; // Stop processing further
          }
          
          // ✅ ADDITIONAL CHECK: Check inactivity_seconds if available (for debugging and faster detection)
          const inactivitySeconds = (otherParticipant as any).inactivity_seconds;
          if (inactivitySeconds !== null && inactivitySeconds !== undefined && inactivitySeconds > 20) {
            logger.log('[Multiplayer] ⚠️ Other participant inactive for too long - navigating to disconnected screen', {
              inactivitySeconds,
              threshold: 20,
            });
            console.log('[Multiplayer] ⚠️ Other participant inactive for too long - navigating to disconnected screen', {
              inactivitySeconds,
              threshold: 20,
            });
            // ✅ CRITICAL: Stop all intervals and disconnect WebSocket before navigating
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
            websocket.disconnect();
            router.replace({
              pathname: '/multiplayer/disconnected',
              params: { 
                reason: 'disconnected',
                sessionId: sessionIdNum.toString() 
              }
            });
            return; // Stop processing further
          }
        }
      } // End of if (response && response.ok && response.data)
    } catch (error: any) {
      logger.error('Error fetching status:', error);
      // ✅ Don't reset states on network error - keep current state
      // Network errors are temporary and shouldn't affect game state
      // Only log the error, don't throw or reset anything
      if (error?.message?.includes('Network request failed')) {
        logger.log('[FETCH STATUS] Network error - will retry on next poll');
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    // ✅ CRITICAL: Only start polling if WebSocket is NOT connected (fallback only)
    if (isWebSocketConnectedRef.current) {
      logger.log('[Polling] ⚠️ Cannot start polling - WebSocket is connected (isWebSocketConnectedRef.current = true)');
      return;
    }
    
    // ✅ Double check: Also verify WebSocket connection status directly
    if (websocket.isConnected()) {
      logger.log('[Polling] ⚠️ Cannot start polling - WebSocket is connected (websocket.isConnected() = true)');
      isWebSocketConnectedRef.current = true; // Sync the ref
      return;
    }
    
    // ✅ Stop any existing polling
    if (pollingInterval.current) {
      logger.log('[Polling] Stopping existing polling before starting new one');
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    // ✅ Adaptive polling interval based on session status
    // Longer interval for fallback polling (less frequent updates needed)
    const getPollingInterval = () => {
      if (status === 'waiting') {
        return 8000; // 8 seconds for waiting status (fallback only)
      }
      return 5000; // 5 seconds for active game (fallback only)
    };
    
    const pollingIntervalMs = getPollingInterval();
    logger.log('[Polling] 🔄 Starting FALLBACK polling with interval:', pollingIntervalMs, 'ms', {
      isWebSocketConnected: isWebSocketConnectedRef.current,
      websocketConnected: websocket.isConnected(),
      status: status
    });
    
    pollingInterval.current = setInterval(() => {
      // ✅ CRITICAL: Check WebSocket connection status FIRST in every poll
      if (isWebSocketConnectedRef.current || websocket.isConnected()) {
        logger.log('[Polling] ✅✅✅ WebSocket connected - IMMEDIATELY stopping fallback polling');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        isWebSocketConnectedRef.current = true; // Sync the ref
        return;
      }
      
      // ✅ CRITICAL: Stop polling during countdown, reveal, OR if user has selected an option
      // Once user selects an option, stop polling to prevent interference
      if (countdownStartedRef.current || showRevealRef.current || selectedOptionRef.current !== null) {
        return; // Skip polling if user has selected an option (even if not submitted yet)
      }
      
      // ✅ Only poll if user hasn't selected an option yet
      // After user selects, we stop polling until they submit (then resume to check has_both_answered)
      logger.log('[Polling] 🔄 Fallback polling - fetching status (WebSocket NOT connected)', {
        isWebSocketConnectedRef: isWebSocketConnectedRef.current,
        websocketConnected: websocket.isConnected()
      });
      
      // ✅ CRITICAL: Check if WebSocket connected before fetching
      if (isWebSocketConnectedRef.current || websocket.isConnected()) {
        logger.log('[Polling] ⚠️⚠️⚠️ WebSocket connected during polling - STOPPING polling immediately');
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        isWebSocketConnectedRef.current = true;
        return;
      }
      
      fetchStatus();
    }, pollingIntervalMs);
  };

  // ✅ NEW: Handle option selection (temporary - user can change)
  const handleOptionSelect = useCallback(async (optionId: number) => {
    if (!currentQuestion) return;
    
    // ✅ Allow selection only if user hasn't submitted final answer
    if (hasAnsweredRef.current || hasAnswered || showReveal) {
      logger.log('[OPTION SELECT] Blocked - answer already submitted');
      return;
    }
    
    // ✅ Just update selected option - user can change until they press "إرسال الإجابة"
    setSelectedOption(optionId);
    selectedOptionRef.current = optionId;
    
    // ✅ CRITICAL: Update activity in backend to prevent false timeout detection
    // This ensures that if user is selecting options (even before submitting), they're considered active
    try {
      await api.post(API_ENDPOINTS.MULTIPLAYER_ACTIVITY(sessionIdNum));
      logger.log('[OPTION SELECT] Activity updated in backend');
    } catch (error) {
      // Silent fail - don't block user interaction if activity update fails
      logger.warn('[OPTION SELECT] Failed to update activity:', error);
    }
    
    // ✅ CRITICAL: Stop polling immediately when user selects an option
    // This prevents fetchStatus from interfering with the selection
    if (pollingInterval.current) {
      logger.log('[OPTION SELECT] Stopping polling after user selected option');
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logger.log('[OPTION SELECT] User selected option:', optionId);
  }, [currentQuestion, hasAnswered, showReveal, sessionIdNum]);

  // ✅ MODIFIED: Submit final answer (called from "إرسال الإجابة" button)
  const handleAnswer = async () => {
    if (!currentQuestion || !selectedOption) return;

    // ✅ CRITICAL: Triple-layer protection against multiple submissions
    // Check BOTH ref and state for immediate blocking (before ANY state updates)
    if (hasAnsweredRef.current || hasAnswered || isSubmittingRef.current || isSubmitting) {
      logger.log('[HANDLE ANSWER] Blocked - user already answered or submission in progress', {
        hasAnsweredRef: hasAnsweredRef.current,
        hasAnswered,
        isSubmittingRef: isSubmittingRef.current,
        isSubmitting
      });
      return;
    }

    const optionId = selectedOption; // Use currently selected option

    // ✅ CRITICAL: Set flags IMMEDIATELY before ANY async operations
    // This creates an immediate lock that prevents ANY subsequent clicks
    // Order matters: Set refs FIRST, then state, then API call
    isSubmittingRef.current = true;       // ✅ Immediate lock via ref
    hasAnsweredRef.current = true;        // ✅ Immediate lock via ref
    
    // ✅ Note: We DON'T stop polling here - we need it to check for has_both_answered
    // fetchStatus is protected and won't change hasAnswered/selectedOption
    // Polling will continue to detect when other user answers
    
    // ✅ Update state (may take a moment due to React batching)
    setIsSubmitting(true);
    setHasAnswered(true); // ✅ Final answer submitted - cannot change anymore
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post<{
        ok: boolean;
        data: {
          is_correct: boolean;
          has_both_answered: boolean;
          question_changed?: boolean;
          current_question?: {
            id: number;
            stem: string;
            options: Array<{ id: number; option_label: string; content: string; option_order: number }>;
            question_order: number;
          };
        };
      }>(API_ENDPOINTS.MULTIPLAYER_ANSWER(sessionIdNum), {
        question_id: currentQuestion.id,
        selected_option_id: optionId,
      });
      
      logger.log('[HANDLE ANSWER] Submitted answer:', optionId);

      if (response && response.ok && response.data) {
        // ✅ Check if question changed (race condition - user's device hasn't updated yet)
        if (response.data.question_changed && response.data.current_question) {
          logger.log('[HANDLE ANSWER] ⚠️ Question changed - updating to current question:', response.data.current_question);
          // Question changed - update to current question silently (no error message)
          // This handles race conditions where user's device hasn't updated to new question yet
          setCurrentQuestion({
            id: response.data.current_question.id,
            stem: response.data.current_question.stem,
            options: response.data.current_question.options,
            question_order: response.data.current_question.question_order,
            total_questions: currentQuestion?.total_questions || 3, // Fallback to 3 if currentQuestion is null
          } as Question);
          setCurrentQuestionOrder(response.data.current_question.question_order);
          // Reset state for new question
          setSelectedOption(null);
          selectedOptionRef.current = null;
          setHasAnswered(false);
          hasAnsweredRef.current = false;
          setIsSubmitting(false);
          isSubmittingRef.current = false;
          setShowReveal(false);
          setHasBothAnswered(false);
          setResponses([]);
          setCorrectOptionId(null);
          setReadyForNext(false);
          setAllReadyForNext(false);
          // Don't show error - just update question silently
          // User can now answer the new question
          return;
        }
        
        logger.log('[HANDLE ANSWER] Response received', {
          has_both_answered: response.data.has_both_answered,
          showReveal,
          currentHasBothAnswered: hasBothAnswered
        });

        // ✅ CRITICAL: Always update hasBothAnswered from handleAnswer response
        // handleAnswer is the authoritative source when user submits answer
        if (!showReveal) {
          const shouldSetBothAnswered = response.data.has_both_answered;
          logger.log('[HANDLE ANSWER] Setting hasBothAnswered to', shouldSetBothAnswered, {
            currentHasBothAnswered: hasBothAnswered,
            countdownStarted: countdownStartedRef.current
          });
          
          // ✅ CRITICAL: Only update hasBothAnswered if it's going from false to true
          // NEVER update it from true to false - once it becomes true, it must stay true
          // This prevents user from changing answer after other user has answered
          if (shouldSetBothAnswered) {
            // Server says both answered - always set to true
            setHasBothAnswered(true);
            hasBothAnsweredRef.current = true;
            logger.log('[HANDLE ANSWER] Setting hasBothAnswered to true - both users answered');
          } else if (!hasBothAnswered) {
            // Server says not both answered AND local is false - safe to keep false
            setHasBothAnswered(false);
            hasBothAnsweredRef.current = false;
          } else {
            // ✅ CRITICAL: Local is true but server says false
            // This means user changed answer after other user already answered
            // Keep local state as true - don't reset to false
            // This ensures countdown continues and answer is locked
            logger.log('[HANDLE ANSWER] Keeping hasBothAnswered as true - answer is locked', {
              serverHasBothAnswered: shouldSetBothAnswered,
              localHasBothAnswered: hasBothAnswered
            });
            // Don't update - keep hasBothAnswered as true
          }
          
          // ✅ CRITICAL: Mark that hasBothAnswered was set by handleAnswer
          if (shouldSetBothAnswered || hasBothAnswered) {
            hasBothAnsweredFromAnswerRef.current = true;
            logger.log('[HANDLE ANSWER] Marked hasBothAnsweredFromAnswerRef = true');
          } else {
            hasBothAnsweredFromAnswerRef.current = false;
          }
        } else {
          logger.log('[HANDLE ANSWER] Skipping update - showReveal is true');
        }
      }
      
      // ✅ Clear submitting flag after successful submission
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      
      // ✅ NO POLLING - Rely on WebSocket events only
      // WebSocket will send session.updated event when other user answers
      // This will trigger has_both_answered update and countdown start
      if (response.data.has_both_answered) {
        logger.log('[HANDLE ANSWER] Both users answered - countdown will start via WebSocket');
      } else {
        logger.log('[HANDLE ANSWER] Waiting for other user - WebSocket will notify when they answer');
        // ✅ Only start polling if WebSocket is NOT connected (fallback only)
        if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
          logger.log('[HANDLE ANSWER] WebSocket not connected - starting fallback polling');
        pollingInterval.current = setInterval(() => {
          // ✅ Only poll if not in countdown or reveal
          if (countdownStartedRef.current || showRevealRef.current) {
            return;
          }
            // ✅ Stop polling if WebSocket reconnects
            if (isWebSocketConnectedRef.current) {
              clearInterval(pollingInterval.current!);
              pollingInterval.current = null;
            return;
          }
          fetchStatus();
          }, 5000); // Longer interval for fallback polling (5 seconds)
        }
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل إرسال الإجابة');
      // ✅ Reset both state and ref on error to allow retry
      hasAnsweredRef.current = false;
      isSubmittingRef.current = false;
      selectedOptionRef.current = null;
      setHasAnswered(false);
      setSelectedOption(null);
      setIsSubmitting(false); // ✅ Clear submitting flag on error
    }
  };

  const handleReveal = async () => {
    if (!currentQuestion || showReveal) {
      logger.log('[HANDLE REVEAL] Skipping - no question or already revealed');
      return;
    }

    logger.log('[HANDLE REVEAL] Starting reveal');

    // ✅ CRITICAL: Clear the reveal timer to prevent multiple calls
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    // ✅ CRITICAL: Set showReveal FIRST synchronously before API call
    // This prevents fetchStatus (polling) from resetting states during API call
    // Setting it first ensures UI state is locked in place
    setShowReveal(true);
    setRevealTimer(0); // Reset timer immediately
    
    // ✅ CRITICAL: Ensure readyForNext is false when reveal starts
    // This ensures "التالي" button appears immediately after reveal
    if (readyForNext) {
      logger.log('[HANDLE REVEAL] Resetting readyForNext to false to show next button');
      setReadyForNext(false);
    }
    
    // ✅ NO POLLING - Rely on WebSocket events only
    // WebSocket will send session.updated and participant.ready events
    // These will update all_ready_for_next and trigger next question transition
    logger.log('[HANDLE REVEAL] Waiting for WebSocket events for next question');
    // ✅ Only start polling if WebSocket is NOT connected (fallback only)
    if (!isWebSocketConnectedRef.current && !pollingInterval.current) {
      logger.log('[HANDLE REVEAL] WebSocket not connected - starting fallback polling');
      startPolling();
    }

    try {
      const response = await api.post<{
        ok: boolean;
        data: {
          correct_option_id: number;
          responses: Response[];
        };
      }>(API_ENDPOINTS.MULTIPLAYER_REVEAL(sessionIdNum), {
        question_id: currentQuestion.id,
      });

      if (response && response.ok && response.data) {
        // ✅ CRITICAL: Update states after API success
        // showReveal is already set to true above, so fetchStatus won't reset it
        setCorrectOptionId(response.data.correct_option_id);
        setResponses(response.data.responses);

        // Animation
        revealOpacity.value = withTiming(1, { duration: 500 });
        revealScale.value = withSpring(1);

        // Play sound
        const myResponse = response.data.responses.find((r) => r.user_id === currentUserId);
        if (myResponse?.is_correct) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        // If API failed, reset showReveal to allow retry
        setShowReveal(false);
        setRevealTimer(3);
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل إظهار الإجابة');
      // Reset showReveal on error to allow retry
      setShowReveal(false);
      setRevealTimer(3);
    }
  };

  const handleNext = async () => {
    if (!showReveal || readyForNext) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReadyForNext(true);

    try {
      const response = await api.post<{
        ok: boolean;
        data: {
          current_question: Question | null;
          status: string;
          all_ready_for_next?: boolean;
          participants?: Array<{ user_id: number; ready_for_next: boolean }>;
        };
      }>(API_ENDPOINTS.MULTIPLAYER_NEXT(sessionIdNum));

      if (response && response.ok && response.data) {
        if (response.data.status === 'completed') {
          router.replace({
            pathname: '/multiplayer/results',
            params: { sessionId: sessionIdNum.toString() }
          });
        } else if (response.data.status === 'moved' && response.data.current_question) {
          // Both ready, move to next question
          // ✅ CRITICAL: Reset ALL states FIRST in correct order
          // This ensures both users can answer the new question immediately
          // Order matters: reset states BEFORE updating question to prevent UI glitches
          const newQuestionId = response.data.current_question.id;
          logger.log('[HANDLE NEXT] ✅ Moving to next question immediately:', {
            oldId: currentQuestion?.id,
            newId: newQuestionId
          });
          
          // ✅ CRITICAL: Update question ID ref FIRST to prevent fetchStatus from resetting
          currentQuestionIdRef.current = newQuestionId;
          
          // Reset states
          setReadyForNext(false);
          setAllReadyForNext(true);
          setShowReveal(false); // ✅ Reset showReveal FIRST to hide old reveal state
          setResponses([]); // ✅ Reset responses to clear old data
          setCorrectOptionId(null);
          setSelectedOption(null);
          selectedOptionRef.current = null;
          setHasAnswered(false);
          hasAnsweredRef.current = false;
          setHasBothAnswered(false);
          hasBothAnsweredFromAnswerRef.current = false;
          hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
          setRevealTimer(3);
          revealOpacity.value = 0;
          revealScale.value = 0.8;
          
          // ✅ CRITICAL: Update question IMMEDIATELY to prevent fetchStatus from resetting it
          // This ensures the question is updated before any other code can interfere
          setCurrentQuestion(response.data.current_question);
          setCurrentQuestionOrder(response.data.current_question.question_order);
          
          logger.log('[HANDLE NEXT] ✅ Question updated successfully:', {
            questionId: newQuestionId,
            questionOrder: response.data.current_question.question_order
          });
        } else if (response.data.status === 'waiting_for_both') {
          // Waiting for other participant
          setAllReadyForNext(false);
          // Keep readyForNext as true to show waiting state
          // ✅ CRITICAL: WebSocket will send all_ready_for_next event when other participant clicks "next"
          // The WebSocket callback will handle the transition immediately
          logger.log('[HANDLE NEXT] Waiting for other participant - WebSocket will notify when ready');
          
          // ✅ CRITICAL: Fetch status immediately to check if both are already ready
          // This handles race condition where other participant clicked "next" before this user
          fetchStatus(true).then((response) => {
            // ✅ CRITICAL: Check response data directly (not state) to see if both are ready
            // This ensures we catch the transition even if state hasn't updated yet
            if (response?.data?.all_ready_for_next && response?.data?.current_question) {
              const newQuestionId = response.data.current_question.id;
              const currentQuestionId = currentQuestion?.id;
              
              // If question changed, update immediately
              if (currentQuestionId !== newQuestionId) {
                logger.log('[HANDLE NEXT] ✅ Both ready detected in response - updating question immediately:', {
                  oldId: currentQuestionId,
                  newId: newQuestionId
                });
                
                // Update question immediately
                currentQuestionIdRef.current = newQuestionId;
                setShowReveal(false);
                setResponses([]);
                setCorrectOptionId(null);
                setSelectedOption(null);
                selectedOptionRef.current = null;
                setHasAnswered(false);
                hasAnsweredRef.current = false;
                setHasBothAnswered(false);
                hasBothAnsweredFromAnswerRef.current = false;
                setReadyForNext(false);
                setAllReadyForNext(false);
                
                setCurrentQuestion(response.data.current_question);
                setCurrentQuestionOrder(response.data.current_question.question_order);
                
                logger.log('[HANDLE NEXT] ✅ Question updated successfully from fetchStatus response');
              }
            }
          }).catch((error) => {
            logger.error('[HANDLE NEXT] Error fetching status while waiting:', error);
          });
          
          // ✅ CRITICAL: Only use polling as fallback if WebSocket is NOT connected
          // If WebSocket is connected, rely on it completely (no polling needed)
          if (!isWebSocketConnectedRef.current && !websocket.isConnected()) {
            logger.log('[HANDLE NEXT] WebSocket not connected - using fallback polling');
            const waitingInterval = setInterval(() => {
              // Check if allReadyForNext became true (set by WebSocket or fetchStatus)
              if (allReadyForNext) {
                logger.log('[HANDLE NEXT] All ready detected - stopping polling');
                clearInterval(waitingInterval);
                return;
              }
              
              // Fetch status to check if both are ready now
              // fetchStatus will update allReadyForNext and currentQuestion if both are ready
              fetchStatus(true).catch((error) => {
                logger.error('[HANDLE NEXT] Error polling while waiting:', error);
              });
            }, 2000); // Poll every 2 seconds (reduced from 500ms to improve performance)
            
            // Cleanup interval after 10 seconds (shouldn't take that long)
            setTimeout(() => {
              clearInterval(waitingInterval);
            }, 10000);
          } else {
            logger.log('[HANDLE NEXT] WebSocket connected - relying on WebSocket events only');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل الانتقال للسؤال التالي');
      setReadyForNext(false);
    }
  };

  const revealAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: revealOpacity.value,
      transform: [{ scale: revealScale.value }],
    };
  });

  if (loading || !currentQuestion) {
    return (
      <GradientBackground colors={colors.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const myResponse = (responses || []).find((r) => r.user_id === currentUserId);
  const otherResponse = (responses || []).find((r) => r.user_id !== currentUserId);
  const myParticipant = (participants || []).find((p) => p.user_id === currentUserId);
  const otherParticipant = (participants || []).find((p) => p.user_id !== currentUserId);

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Question Card - محسّن */}
          <Animated.View 
            entering={FadeInUp.duration(600).springify()} 
            style={styles.questionCard}
          >
            <View style={styles.questionHeader}>
              <View style={[styles.questionIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <MaterialIcons name="help-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.questionNumber}>
                سؤال {currentQuestion.question_order}
            </Text>
            </View>
            <Text style={styles.questionText}>{currentQuestion.stem}</Text>
            <View style={styles.questionFooter}>
              <View style={styles.questionProgress}>
                <Animated.View 
                  entering={FadeIn.duration(300)}
                style={[
                    styles.questionProgressBar,
                  {
                    width: `${(currentQuestion.question_order / currentQuestion.total_questions) * 100}%`,
                    backgroundColor: colors.primary,
                    }
                ]}
              />
            </View>
              <Text style={styles.questionProgressText}>
                {currentQuestion.question_order} / {currentQuestion.total_questions}
                  </Text>
                </View>
          </Animated.View>

          {/* Options - محسّنة */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              // ✅ Use BOTH state and ref to determine selection (ref is more reliable)
              const isSelected = selectedOption === option.id || selectedOptionRef.current === option.id;
              const isMyChoice = myResponse?.selected_option_id === option.id;
              const isOtherChoice = otherResponse?.selected_option_id === option.id;
              const isCorrect = correctOptionId === option.id;
              const isMyCorrect = isMyChoice && isCorrect;
              const isMyWrong = isMyChoice && !isCorrect && showReveal;

              // تحديد الألوان والـ styles حسب الحالة
              let cardStyleArray: any[] = [styles.optionCard];
              let iconBg = '#4B5563';
              let iconTextStyle = styles.optionIcon;

              if (showReveal) {
                if (isCorrect) {
                  cardStyleArray = [styles.optionCard, styles.optionCardCorrect];
                  iconBg = '#10B981';
                  iconTextStyle = styles.optionIconCorrect;
                } else if (isMyChoice || isOtherChoice) {
                  cardStyleArray = [styles.optionCard, styles.optionCardWrong];
                  iconBg = '#EF4444';
                  iconTextStyle = styles.optionIconWrong;
                }
              } else if (hasBothAnswered) {
                // ✅ During countdown, show selected option
                if (isSelected && !showReveal) {
                  cardStyleArray = [styles.optionCard, styles.optionCardSelected];
                  iconBg = colors.primary;
                  iconTextStyle = styles.optionIconSelected;
                } else if (isMyChoice) {
                  cardStyleArray = [styles.optionCard, styles.optionCardMyChoice];
                  iconBg = '#60A5FA';
                } else if (isOtherChoice) {
                  cardStyleArray = [styles.optionCard, styles.optionCardOtherChoice];
                  iconBg = '#FB923C';
                }
              } else if (isSelected) {
                // ✅ Show selected option before countdown
                cardStyleArray = [styles.optionCard, styles.optionCardSelected];
                iconBg = colors.primary;
                iconTextStyle = styles.optionIconSelected;
              }

              return (
                <Animated.View
                  key={option.id}
                  entering={SlideInRight.duration(400).delay(index * 100).springify()}
                    style={[
                    ...cardStyleArray,
                    isSelected && !showReveal && styles.optionCardPulse
                  ]}
                >
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => handleOptionSelect(option.id)}
                    disabled={hasAnswered || hasAnsweredRef.current || showReveal || readyForNext}
                    activeOpacity={0.8}
                  >
                    {/* Option Icon Circle */}
                    <Animated.View 
                      style={[
                        styles.optionIconContainer, 
                        { backgroundColor: iconBg }
                      ]}
                    >
                      <Text style={iconTextStyle}>
                        {option.option_label || String.fromCharCode(65 + index)}
                      </Text>
                    </Animated.View>

                    {/* Option Content */}
                    <View style={styles.optionContent}>
                      <Text style={styles.optionText}>{option.content}</Text>
                    </View>

                    {/* Status Icons */}
                    <View style={styles.optionStatus}>
                    {isMyChoice && (
                        <Animated.View 
                          entering={ZoomIn.duration(300).springify()}
                          style={[styles.choiceBadge, styles.choiceBadgeMe]}
                        >
                          <MaterialIcons name="person" size={16} color="#FFFFFF" />
                        <Text style={styles.choiceBadgeText}>أنت</Text>
                        </Animated.View>
                    )}
                    {isOtherChoice && (
                        <Animated.View 
                          entering={ZoomIn.duration(300).springify()}
                          style={[styles.choiceBadge, styles.choiceBadgeOther]}
                        >
                          <MaterialIcons name="person-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.choiceBadgeText}>
                          {otherParticipant?.name || 'صديقك'}
                        </Text>
                        </Animated.View>
                    )}
                    {isCorrect && showReveal && (
                        <Animated.View 
                          entering={ZoomIn.duration(300).springify()}
                          style={styles.correctIcon}
                        >
                          <MaterialIcons name="check-circle" size={28} color="#10B981" />
                        </Animated.View>
                    )}
                    {isMyWrong && (
                        <Animated.View 
                          entering={ZoomIn.duration(300)}
                          style={styles.wrongIcon}
                        >
                          <MaterialIcons name="cancel" size={28} color="#EF4444" />
                        </Animated.View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Reveal Countdown */}
          {hasBothAnswered && !showReveal && (
            <Animated.View entering={ZoomIn.duration(300)} style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{revealTimer}</Text>
            </Animated.View>
          )}

          {/* Reveal Result - محسّن */}
          {showReveal && (
            <Animated.View 
              entering={ZoomIn.duration(400).springify()}
              style={styles.revealContainer}
            >
              {myResponse?.is_correct && (
                <Animated.View 
                  entering={FadeInUp.duration(500).springify()}
                  style={styles.resultBadge}
                >
                  <Animated.View 
                    entering={ZoomIn.duration(300).springify()}
                    style={styles.resultIconContainer}
                  >
                    <MaterialIcons name="check-circle" size={40} color="#10B981" />
                  </Animated.View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultText}>إجابة صحيحة!</Text>
                    <Text style={styles.resultPoints}>+1 نقطة</Text>
                </View>
                </Animated.View>
              )}
              {myResponse && !myResponse.is_correct && (
                <Animated.View 
                  entering={FadeInUp.duration(500).springify()}
                  style={styles.resultBadgeWrong}
                >
                  <Animated.View 
                    entering={ZoomIn.duration(300).springify()}
                    style={styles.resultIconContainerWrong}
                  >
                    <MaterialIcons name="cancel" size={40} color="#EF4444" />
                  </Animated.View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultTextWrong}>إجابة خاطئة</Text>
                    <Text style={styles.resultPointsWrong}>حاول مرة أخرى</Text>
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          {showReveal ? (
            // ✅ Show next button when reveal is shown
            // If user clicked next but other user hasn't, show waiting
            readyForNext && !allReadyForNext ? (
              <Animated.View 
                entering={FadeIn.duration(300)}
                style={styles.waitingContainer}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.waitingText}>في انتظار صديقك للانتقال...</Text>
              </Animated.View>
            ) : (
              // ✅ Always show next button when reveal is true (unless waiting for other user)
              <TouchableOpacity
                style={[
                  styles.nextButton, 
                  { backgroundColor: colors.primary },
                  readyForNext && styles.answerButtonDisabled
                ]}
                onPress={handleNext}
                disabled={readyForNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>التالي</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )
          ) : hasBothAnswered && hasAnswered ? (
            // ✅ If both answered but reveal hasn't shown yet, show waiting for reveal
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.waitingText}>جارٍ إظهار النتائج...</Text>
            </View>
          ) : hasAnswered ? (
            // ✅ User answered, waiting for other user
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.waitingText}>في انتظار صديقك...</Text>
            </View>
          ) : readyForNext ? (
            // ✅ Ready for next (shouldn't happen before answering, but handle it)
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.waitingText}>في انتظار الانتقال...</Text>
            </View>
              ) : (
            // ✅ Show answer button if user hasn't answered
            <TouchableOpacity
              style={[
                styles.answerButton,
                { backgroundColor: colors.primary },
                (!selectedOption || readyForNext || hasAnswered) && styles.answerButtonDisabled,
              ]}
              onPress={handleAnswer}
              disabled={!selectedOption || readyForNext || hasAnswered}
            >
              <Text style={styles.answerButtonText}>إرسال الإجابة</Text>
            </TouchableOpacity>
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60, // ✅ إضافة padding top للتعويض عن إزالة header
    paddingBottom: 100,
  },
  // Question Card - محسّن
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  questionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
    textAlign: 'right',
    marginBottom: 12,
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionProgress: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  questionProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  questionProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // Options - محسّنة
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: '#D4AF37',
    borderWidth: 2,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  optionCardMyChoice: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderColor: '#60A5FA',
    borderWidth: 2,
  },
  optionCardOtherChoice: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderColor: '#FB923C',
    borderWidth: 2,
  },
  optionCardCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  optionCardWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  optionCardPulse: {
    // Pulse animation سيتم إضافتها عبر animated style
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  optionIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionIconSelected: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionIconCorrect: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionIconWrong: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 17,
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 24,
    fontWeight: '500',
  },
  optionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  choiceBadgeMe: {
    backgroundColor: '#60A5FA',
  },
  choiceBadgeOther: {
    backgroundColor: '#FB923C',
  },
  choiceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  correctIcon: {
    // Icon styling
  },
  wrongIcon: {
    // Icon styling
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  revealContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    gap: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultBadgeWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#EF4444',
    gap: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIconContainerWrong: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTextContainer: {
    flex: 1,
  },
  resultText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  resultTextWrong: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  resultPoints: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(16, 185, 129, 0.8)',
  },
  resultPointsWrong: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(239, 68, 68, 0.8)',
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  answerButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  answerButtonDisabled: {
    opacity: 0.5,
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  waitingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

