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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS } from '@/utils/api';
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
}

interface Response {
  user_id: number;
  selected_option_id: number;
  is_correct: boolean;
}

export default function MultiplayerGameScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const { user } = useAuth();
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
  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);
  
  // ✅ CRITICAL: Protect selectedOption from being reset by fetchStatus
  // If selectedOption is cleared but ref still has a value, restore it
  useEffect(() => {
    if (selectedOption === null && selectedOptionRef.current !== null && !hasAnswered && !showReveal) {
      // Polling or something else tried to clear selectedOption
      // Restore it from ref to protect user's selection
      console.log('[PROTECT SELECTED OPTION] Restoring selectedOption from ref');
      setSelectedOption(selectedOptionRef.current);
    }
  }, [selectedOption, hasAnswered, showReveal]);

  // ✅ Reset refs when question changes
  useEffect(() => {
    if (currentQuestion) {
      // Reset flags when question changes (new question)
      hasBothAnsweredFromAnswerRef.current = false;
      countdownStartedRef.current = false;
      hasAnsweredRef.current = false;
      isSubmittingRef.current = false;
      selectedOptionRef.current = null;
    }
  }, [currentQuestion?.id]);

  const sessionIdNum = parseInt(sessionId || '0');
  const colors = getTrackColors(1) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };
  const currentUserId = user?.id || 0;

  // Animation values
  const revealOpacity = useSharedValue(0);
  const revealScale = useSharedValue(0.8);

  useEffect(() => {
    fetchStatus();
    startPolling();

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      if (revealTimerRef.current) {
        clearInterval(revealTimerRef.current);
      }
    };
  }, [sessionIdNum]);

  // Poll for question changes when waiting for next
  useEffect(() => {
    if (readyForNext && !allReadyForNext && showReveal) {
      const checkInterval = setInterval(() => {
        fetchStatus();
      }, 800); // Check every 800ms for faster response
      
      return () => clearInterval(checkInterval);
    }
  }, [readyForNext, allReadyForNext, showReveal]);

  useEffect(() => {
    console.log('[COUNTDOWN DEBUG]', {
      hasBothAnswered,
      showReveal,
      hasQuestion: !!currentQuestion,
      countdownStarted: countdownStartedRef.current,
      timerActive: !!revealTimerRef.current,
      hasBothAnsweredRef: hasBothAnsweredRef.current
    });

    if (hasBothAnswered && !showReveal && currentQuestion) {
      // ✅ CRITICAL: Prevent multiple timers
      if (revealTimerRef.current) {
        console.log('[COUNTDOWN] Timer already running, clearing it');
        clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      
      // ✅ CRITICAL: Double-check conditions before starting timer
      if (showReveal || countdownStartedRef.current) {
        console.log('[COUNTDOWN] Skipping - showReveal or countdown already started');
        return;
      }

      console.log('[COUNTDOWN] Starting countdown timer');
      setRevealTimer(3);
      countdownStartedRef.current = true; // ✅ Lock hasBothAnswered during countdown
      hasBothAnsweredRef.current = true; // ✅ Update ref immediately
      
      // ✅ CRITICAL: Stop polling during countdown
      if (pollingInterval.current) {
        console.log('[COUNTDOWN] Stopping polling during countdown');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }

      revealTimerRef.current = setInterval(() => {
        // ✅ CRITICAL: Use refs to get current values (avoid stale closures)
        if (showRevealRef.current || !hasBothAnsweredRef.current) {
          console.log('[COUNTDOWN] Timer stopped - conditions changed', {
            showReveal: showRevealRef.current,
            hasBothAnswered: hasBothAnsweredRef.current
          });
          if (revealTimerRef.current) {
            clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          countdownStartedRef.current = false;
          // Resume polling if countdown stopped
          if (!pollingInterval.current) {
            startPolling();
          }
          return;
        }

        setRevealTimer((prev) => {
          console.log('[COUNTDOWN] Timer tick:', prev);
          if (prev <= 1) {
            console.log('[COUNTDOWN] Countdown complete, calling handleReveal');
            if (revealTimerRef.current) {
              clearInterval(revealTimerRef.current);
              revealTimerRef.current = null;
            }
            countdownStartedRef.current = false;
            handleReveal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!hasBothAnswered || showReveal) {
      // ✅ CRITICAL: Clear timer if conditions change
      if (revealTimerRef.current) {
        console.log('[COUNTDOWN] Clearing timer - conditions changed', {
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

  const fetchStatus = async () => {
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

      if (response && response.ok && response.data) {
        setStatus(response.data.status);
        setParticipants(response.data.participants);
        
        // ✅ CRITICAL: Check if question changed FIRST before updating any states
        // This prevents resetting states when question hasn't changed
        let questionChanged = false;
        const currentQuestionId = currentQuestion?.id;
        
        if (response.data.current_question) {
          const newQuestionOrder = response.data.current_question.question_order;
          const newQuestionId = response.data.current_question.id;
          const currentQuestionId = currentQuestion?.id;
          
          // ✅ CRITICAL: Check both question_order AND question ID to detect changes
          // This handles edge cases where question_order might not update correctly
          const orderChanged = currentQuestionOrder !== 0 && currentQuestionOrder !== newQuestionOrder;
          const idChanged = currentQuestionId !== null && currentQuestionId !== newQuestionId;
          questionChanged = orderChanged || idChanged;
          
          if (questionChanged) {
            // Question changed - reset ALL states completely (this is critical!)
            // ✅ CRITICAL FIX: Reset states in correct order to prevent UI glitches
            // 1. Reset readyForNext FIRST to allow answering
            // 2. Reset showReveal to hide old reveal state (+1 نقطة)
            // 3. Reset responses to clear old data
            // 4. Then update question
            setReadyForNext(false);
            setAllReadyForNext(false);
            setShowReveal(false); // ✅ Reset showReveal FIRST to hide "+1 نقطة" from previous question
            setResponses([]); // ✅ Reset responses to clear old data
            setCorrectOptionId(null);
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(newQuestionOrder);
            setSelectedOption(null);
            setHasAnswered(false);
            setHasBothAnswered(false);
            setIsSubmitting(false); // ✅ Reset submitting flag
            hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
            countdownStartedRef.current = false; // ✅ Reset countdown lock on question change
            setRevealTimer(3);
            revealOpacity.value = 0;
            revealScale.value = 0.8;
          } else if (currentQuestionOrder === 0) {
            // First question - just set it
            // ✅ CRITICAL: Reset all states for first question to ensure clean state
            // BUT: Don't reset showReveal if we're already showing reveal (user might be in reveal state)
            if (!showReveal) {
              setReadyForNext(false);
              setAllReadyForNext(false);
              setShowReveal(false);
              setResponses([]);
              setCorrectOptionId(null);
              setSelectedOption(null);
              setHasAnswered(false);
              setHasBothAnswered(false);
              hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
            }
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(newQuestionOrder);
          } else {
            // Same question - just update if needed
            // ✅ CRITICAL: Don't reset ANY states if question hasn't changed
            // This prevents resetting selectedOption, hasAnswered, showReveal when polling
            // Only update the question object if needed (for any data changes)
            if (currentQuestion?.id !== response.data.current_question.id) {
              setCurrentQuestion(response.data.current_question);
            }
            // DO NOT reset selectedOption, hasAnswered, showReveal, etc.
            // These states should only be reset when question actually changes
          }
        } else if (!response.data.current_question && currentQuestion) {
          // Question disappeared (shouldn't happen, but handle it)
          // This might mean the session ended or question was removed
        }
        
        // ✅ ADDITIONAL SAFETY CHECK: If readyForNext is true but we haven't answered and showReveal is true,
        // and we're not waiting for the other participant, reset states
        // This handles the case where states get stuck after question change
        if (readyForNext && showReveal && !hasAnswered && response.data.current_question) {
          const newQuestionId = response.data.current_question.id;
          const currentQuestionId = currentQuestion?.id;
          // If question ID changed but questionChanged wasn't detected, force reset
          if (currentQuestionId !== null && currentQuestionId !== newQuestionId) {
            console.log('Force reset: Question ID changed but not detected');
            setReadyForNext(false);
            setShowReveal(false);
            setResponses([]);
            setCorrectOptionId(null);
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(response.data.current_question.question_order);
            setSelectedOption(null);
            setHasAnswered(false);
            setHasBothAnswered(false);
            setIsSubmitting(false); // ✅ Reset submitting flag
            hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
            countdownStartedRef.current = false; // ✅ Reset countdown lock on question change
            setRevealTimer(3);
            revealOpacity.value = 0;
            revealScale.value = 0.8;
            questionChanged = true; // Mark as changed for later checks
          }
        }

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
              console.log('[FETCH STATUS] Resetting readyForNext to false - reveal not shown yet');
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
              console.log('[FETCH STATUS] User answered on another device - syncing hasAnswered from server', {
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
            console.log('[FETCH STATUS] User has submitted answer locally - protecting local answer, but allowing hasBothAnswered update', {
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
        // Only skip during countdown to prevent interference, but allow before/after
        if (!questionChanged && !showReveal) {
          const serverHasBothAnswered = response.data.has_both_answered;
          
          // ✅ CRITICAL: If server says both answered, ALWAYS update to true IMMEDIATELY
          // This ensures countdown starts simultaneously for both users
          // This is the MOST IMPORTANT update - we need to know when both users answered
          if (serverHasBothAnswered) {
            // ✅ ALWAYS update to true if server says both answered
            // This ensures countdown starts immediately for both users (synchronized)
            if (!hasBothAnswered) {
              console.log('[FETCH STATUS] Updating hasBothAnswered to true (both users answered - starting countdown)', {
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
                console.log('[FETCH STATUS] Locking user answer - other user has answered');
              }
            } else {
              // Already true, just ensure ref is updated (countdown should have started)
              hasBothAnsweredRef.current = true;
            }
          } else if (!serverHasBothAnswered && !hasBothAnswered && !hasAnswered) {
            // User hasn't answered AND hasBothAnswered is false - sync with server
            setHasBothAnswered(false);
            hasBothAnsweredRef.current = false;
          } else if (hasBothAnswered && !serverHasBothAnswered && !countdownStartedRef.current) {
            // ✅ Only reset to false if countdown hasn't started
            // If countdown started, keep it as true to prevent disruption
            console.log('[FETCH STATUS] Server says not both answered, but keeping true during countdown', {
              serverHasBothAnswered,
              localHasBothAnswered: hasBothAnswered,
              countdownStarted: countdownStartedRef.current
            });
          }
        } else {
          if (countdownStartedRef.current) {
            console.log('[FETCH STATUS] Skipping hasBothAnswered update - countdown in progress');
          } else if (showReveal) {
            console.log('[FETCH STATUS] Skipping hasBothAnswered update - reveal in progress');
          }
        }
        
        // Check if all ready for next (from participants or from response)
        const allReadyFromParticipants = response.data.participants.length === 2 && 
                         response.data.participants.every((p: any) => p.ready_for_next);
        const allReadyFromResponse = response.data.all_ready_for_next || false;
        const allReady = allReadyFromParticipants || allReadyFromResponse;
        setAllReadyForNext(allReady);
        
        // ✅ ADDITIONAL SAFETY CHECK: If readyForNext is true but we haven't answered and showReveal is true,
        // and the question ID changed, force reset states
        // This handles edge cases where questionChanged wasn't detected correctly
        if (readyForNext && showReveal && !hasAnswered && response.data.current_question && currentQuestion) {
          const newQuestionId = response.data.current_question.id;
          const currentQuestionId = currentQuestion.id;
          // If question ID changed but questionChanged wasn't detected, force reset
          if (currentQuestionId !== newQuestionId && !questionChanged) {
            console.log('Force reset: Question ID changed but not detected by question_order');
            setReadyForNext(false);
            setAllReadyForNext(false);
            setShowReveal(false);
            setResponses([]);
            setCorrectOptionId(null);
            setCurrentQuestion(response.data.current_question);
            setCurrentQuestionOrder(response.data.current_question.question_order);
            setSelectedOption(null);
            setHasAnswered(false);
            setHasBothAnswered(false);
            setIsSubmitting(false); // ✅ Reset submitting flag
            hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
            countdownStartedRef.current = false; // ✅ Reset countdown lock on question change
            setRevealTimer(3);
            revealOpacity.value = 0;
            revealScale.value = 0.8;
          }
        }

        // Check if session completed or timeout
        if (response.data.status === 'completed') {
          router.replace({
            pathname: '/multiplayer/results',
            params: { sessionId: sessionIdNum.toString() }
          });
        }

        if (response.data.participant_timeout_detected) {
          router.replace({
            pathname: '/multiplayer/results',
            params: { sessionId: sessionIdNum.toString(), reason: 'timeout' }
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching status:', error);
      // ✅ Don't reset states on network error - keep current state
      // Network errors are temporary and shouldn't affect game state
      // Only log the error, don't throw or reset anything
      if (error?.message?.includes('Network request failed')) {
        console.log('[FETCH STATUS] Network error - will retry on next poll');
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    pollingInterval.current = setInterval(() => {
      // ✅ CRITICAL: Stop polling during countdown, reveal, OR if user has selected an option
      // Once user selects an option, stop polling to prevent interference
      // We'll resume polling after user submits answer to check for has_both_answered
      if (countdownStartedRef.current || showRevealRef.current || selectedOptionRef.current !== null) {
        return; // Skip polling if user has selected an option (even if not submitted yet)
      }
      
      // ✅ Only poll if user hasn't selected an option yet
      // After user selects, we stop polling until they submit (then resume to check has_both_answered)
      fetchStatus();
    }, 3000); // Check every 3 seconds - less frequent to reduce API calls
  };

  // ✅ NEW: Handle option selection (temporary - user can change)
  const handleOptionSelect = (optionId: number) => {
    if (!currentQuestion) return;
    
    // ✅ Allow selection only if user hasn't submitted final answer
    if (hasAnsweredRef.current || hasAnswered || showReveal) {
      console.log('[OPTION SELECT] Blocked - answer already submitted');
      return;
    }
    
    // ✅ Just update selected option - user can change until they press "إرسال الإجابة"
    setSelectedOption(optionId);
    selectedOptionRef.current = optionId;
    
    // ✅ CRITICAL: Stop polling immediately when user selects an option
    // This prevents fetchStatus from interfering with the selection
    if (pollingInterval.current) {
      console.log('[OPTION SELECT] Stopping polling after user selected option');
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[OPTION SELECT] User selected option:', optionId);
  };

  // ✅ MODIFIED: Submit final answer (called from "إرسال الإجابة" button)
  const handleAnswer = async () => {
    if (!currentQuestion || !selectedOption) return;

    // ✅ CRITICAL: Triple-layer protection against multiple submissions
    // Check BOTH ref and state for immediate blocking (before ANY state updates)
    if (hasAnsweredRef.current || hasAnswered || isSubmittingRef.current || isSubmitting) {
      console.log('[HANDLE ANSWER] Blocked - user already answered or submission in progress', {
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
        };
      }>(API_ENDPOINTS.MULTIPLAYER_ANSWER(sessionIdNum), {
        question_id: currentQuestion.id,
        selected_option_id: optionId,
      });
      
      console.log('[HANDLE ANSWER] Submitted answer:', optionId);

      if (response && response.ok && response.data) {
        console.log('[HANDLE ANSWER] Response received', {
          has_both_answered: response.data.has_both_answered,
          showReveal,
          currentHasBothAnswered: hasBothAnswered
        });

        // ✅ CRITICAL: Always update hasBothAnswered from handleAnswer response
        // handleAnswer is the authoritative source when user submits answer
        if (!showReveal) {
          const shouldSetBothAnswered = response.data.has_both_answered;
          console.log('[HANDLE ANSWER] Setting hasBothAnswered to', shouldSetBothAnswered, {
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
            console.log('[HANDLE ANSWER] Setting hasBothAnswered to true - both users answered');
          } else if (!hasBothAnswered) {
            // Server says not both answered AND local is false - safe to keep false
            setHasBothAnswered(false);
            hasBothAnsweredRef.current = false;
          } else {
            // ✅ CRITICAL: Local is true but server says false
            // This means user changed answer after other user already answered
            // Keep local state as true - don't reset to false
            // This ensures countdown continues and answer is locked
            console.log('[HANDLE ANSWER] Keeping hasBothAnswered as true - answer is locked', {
              serverHasBothAnswered: shouldSetBothAnswered,
              localHasBothAnswered: hasBothAnswered
            });
            // Don't update - keep hasBothAnswered as true
          }
          
          // ✅ CRITICAL: Mark that hasBothAnswered was set by handleAnswer
          if (shouldSetBothAnswered || hasBothAnswered) {
            hasBothAnsweredFromAnswerRef.current = true;
            console.log('[HANDLE ANSWER] Marked hasBothAnsweredFromAnswerRef = true');
          } else {
            hasBothAnsweredFromAnswerRef.current = false;
          }
        } else {
          console.log('[HANDLE ANSWER] Skipping update - showReveal is true');
        }
      }
      
      // ✅ Clear submitting flag after successful submission
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      
      // ✅ CRITICAL: Resume polling after submitting answer (only if both haven't answered)
      // This checks for has_both_answered so countdown can start simultaneously
      // fetchStatus is protected and won't change hasAnswered/selectedOption
      if (!response.data.has_both_answered && !pollingInterval.current) {
        console.log('[HANDLE ANSWER] Starting polling to check for other user answer');
        // Start limited polling - only checks for has_both_answered
        pollingInterval.current = setInterval(() => {
          // ✅ Only poll if not in countdown or reveal
          if (countdownStartedRef.current || showRevealRef.current) {
            return;
          }
          fetchStatus();
        }, 2000); // Check every 2 seconds for faster has_both_answered detection
      } else if (response.data.has_both_answered) {
        // Both answered - countdown will start via useEffect immediately
        console.log('[HANDLE ANSWER] Both users answered - countdown will start');
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
      console.log('[HANDLE REVEAL] Skipping - no question or already revealed');
      return;
    }

    console.log('[HANDLE REVEAL] Starting reveal');

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
      console.log('[HANDLE REVEAL] Resetting readyForNext to false to show next button');
      setReadyForNext(false);
    }
    
    // ✅ Resume polling after reveal starts (to check for readyForNext and next question)
    if (!pollingInterval.current) {
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
          setReadyForNext(false);
          setAllReadyForNext(true);
          setShowReveal(false); // ✅ Reset showReveal FIRST to hide old reveal state
          setResponses([]); // ✅ Reset responses to clear old data
          setCorrectOptionId(null);
          setCurrentQuestion(response.data.current_question);
          setCurrentQuestionOrder(response.data.current_question.question_order);
          setSelectedOption(null);
          setHasAnswered(false);
          setHasBothAnswered(false);
          hasBothAnsweredFromAnswerRef.current = false; // ✅ Reset flag on question change
          setRevealTimer(3);
          revealOpacity.value = 0;
          revealScale.value = 0.8;
        } else if (response.data.status === 'waiting_for_both') {
          // Waiting for other participant
          setAllReadyForNext(false);
          // Keep readyForNext as true to show waiting state
          // The useEffect will handle polling
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

  const myResponse = responses.find((r) => r.user_id === currentUserId);
  const otherResponse = responses.find((r) => r.user_id !== currentUserId);
  const myParticipant = participants.find((p) => p.user_id === currentUserId);
  const otherParticipant = participants.find((p) => p.user_id !== currentUserId);

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              سؤال {currentQuestion.question_order} من {currentQuestion.total_questions}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(currentQuestion.question_order / currentQuestion.total_questions) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Scores */}
          <View style={styles.scoresContainer}>
            {participants.map((participant, index) => {
              const isMe = participant.user_id === currentUserId;
              return (
                <View
                  key={participant.user_id}
                  style={[
                    styles.scoreBadge,
                    {
                      backgroundColor: isMe ? '#60A5FA' : '#FB923C',
                    },
                  ]}
                >
                  <Text style={styles.scoreText}>
                    {participant.name}: {participant.score}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Question */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.questionContainer}>
            <Text style={styles.questionText}>{currentQuestion.stem}</Text>
          </Animated.View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              // ✅ Use BOTH state and ref to determine selection (ref is more reliable)
              const isSelected = selectedOption === option.id || selectedOptionRef.current === option.id;
              const isMyChoice = myResponse?.selected_option_id === option.id;
              const isOtherChoice = otherResponse?.selected_option_id === option.id;
              const isCorrect = correctOptionId === option.id;
              const isMyCorrect = isMyChoice && isCorrect;
              const isMyWrong = isMyChoice && !isCorrect && showReveal;

              let optionColor = 'rgba(255, 255, 255, 0.1)';
              let borderColor = 'rgba(255, 255, 255, 0.2)';

              if (showReveal) {
                if (isCorrect) {
                  optionColor = 'rgba(16, 185, 129, 0.3)';
                  borderColor = '#10B981';
                } else if (isMyChoice || isOtherChoice) {
                  optionColor = 'rgba(239, 68, 68, 0.3)';
                  borderColor = '#EF4444';
                }
              } else if (hasBothAnswered) {
                // ✅ During countdown, show selected option (even if reveal not shown yet)
                if (isSelected && !showReveal) {
                  // ✅ Show selected option during countdown
                  optionColor = `${colors.primary}30`;
                  borderColor = colors.primary;
                } else if (isMyChoice) {
                  optionColor = 'rgba(96, 165, 250, 0.3)';
                  borderColor = '#60A5FA';
                } else if (isOtherChoice) {
                  optionColor = 'rgba(251, 146, 60, 0.3)';
                  borderColor = '#FB923C';
                }
              } else if (isSelected) {
                // ✅ Show selected option before countdown
                optionColor = `${colors.primary}30`;
                borderColor = colors.primary;
              }

              return (
                <Animated.View
                  key={option.id}
                  entering={SlideInRight.duration(400).delay(index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: optionColor,
                        borderColor: borderColor,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleOptionSelect(option.id)}
                    disabled={hasAnswered || hasAnsweredRef.current || showReveal || readyForNext}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionLabel}>
                        {option.option_label || String.fromCharCode(65 + index)}
                      </Text>
                      <Text style={styles.optionText}>{option.content}</Text>
                    </View>
                    {isMyChoice && (
                      <View style={[styles.choiceBadge, { backgroundColor: '#60A5FA' }]}>
                        <Text style={styles.choiceBadgeText}>أنت</Text>
                      </View>
                    )}
                    {isOtherChoice && (
                      <View style={[styles.choiceBadge, { backgroundColor: '#FB923C' }]}>
                        <Text style={styles.choiceBadgeText}>
                          {otherParticipant?.name || 'صديقك'}
                        </Text>
                      </View>
                    )}
                    {isCorrect && showReveal && (
                      <MaterialIcons name="check-circle" size={24} color="#10B981" />
                    )}
                    {isMyWrong && (
                      <MaterialIcons name="cancel" size={24} color="#EF4444" />
                    )}
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

          {/* Reveal Result */}
          {showReveal && (
            <Animated.View style={[styles.revealContainer, revealAnimatedStyle]}>
              {myResponse?.is_correct && (
                <View style={styles.resultBadge}>
                  <MaterialIcons name="check-circle" size={32} color="#10B981" />
                  <Text style={styles.resultText}>+1 نقطة!</Text>
                </View>
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
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  scoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  questionContainer: {
    marginBottom: 32,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 32,
    textAlign: 'right',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 60,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    width: 32,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  choiceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  choiceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    gap: 12,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
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

