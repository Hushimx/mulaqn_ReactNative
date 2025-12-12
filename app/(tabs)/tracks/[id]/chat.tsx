import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, API_ENDPOINTS, getApiBaseUrl } from '@/utils/api';
import * as Haptics from 'expo-haptics';

/**
 * Component to render text with basic Markdown support
 * Supports: **bold**, *italic*, `code`
 */
const MarkdownText: React.FC<{
  text: string;
  style?: any;
  textAlign?: 'left' | 'right' | 'center';
}> = ({ text, style }) => {
  // Split text by markdown patterns and build React elements
  const parseMarkdown = (input: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    // Find all **bold** patterns first (highest priority)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const boldMatches: Array<{ start: number; end: number; content: string }> = [];
    let match;
    
    boldRegex.lastIndex = 0;
    while ((match = boldRegex.exec(input)) !== null) {
      boldMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
    }

    // Find all `code` patterns
    const codeRegex = /`([^`]+)`/g;
    const codeMatches: Array<{ start: number; end: number; content: string }> = [];
    
    codeRegex.lastIndex = 0;
    while ((match = codeRegex.exec(input)) !== null) {
      // Skip if inside a bold match
      const isInsideBold = boldMatches.some(
        (b) => match!.index > b.start && match!.index < b.end
      );
      if (!isInsideBold) {
        codeMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
        });
      }
    }

    // Find all *italic* patterns (but not **)
    // Use a simple approach: find single * that's not part of **
    const italicMatches: Array<{ start: number; end: number; content: string }> = [];
    let i = 0;
    while (i < input.length) {
      if (input[i] === '*' && input[i + 1] !== '*') {
        const endIndex = input.indexOf('*', i + 1);
        if (endIndex !== -1 && input[endIndex + 1] !== '*') {
          // Check if it's inside bold or code
          const isInsideOther = 
            boldMatches.some((b) => i > b.start && i < b.end) ||
            codeMatches.some((c) => i > c.start && i < c.end);
          if (!isInsideOther) {
            italicMatches.push({
              start: i,
              end: endIndex + 1,
              content: input.substring(i + 1, endIndex),
            });
            i = endIndex + 1;
            continue;
          }
        }
      }
      i++;
    }

    // Combine and sort all matches
    const allMatches = [
      ...boldMatches.map((m) => ({ ...m, type: 'bold' as const })),
      ...codeMatches.map((m) => ({ ...m, type: 'code' as const })),
      ...italicMatches.map((m) => ({ ...m, type: 'italic' as const })),
    ].sort((a, b) => a.start - b.start);

    // Build result
    allMatches.forEach((m) => {
      // Add text before match
      if (m.start > lastIndex) {
        const beforeText = input.substring(lastIndex, m.start);
        if (beforeText) {
          result.push(<Text key={key++}>{beforeText}</Text>);
        }
      }

      // Add formatted text
      if (m.type === 'bold') {
        result.push(
          <Text key={key++} style={{ fontWeight: '700' }}>
            {m.content}
          </Text>
        );
      } else if (m.type === 'code') {
        result.push(
          <Text
            key={key++}
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            {m.content}
          </Text>
        );
      } else {
        result.push(
          <Text key={key++} style={{ fontStyle: 'italic' }}>
            {m.content}
          </Text>
        );
      }

      lastIndex = m.end;
    });

    // Add remaining text
    if (lastIndex < input.length) {
      const remaining = input.substring(lastIndex);
      if (remaining) {
        result.push(<Text key={key++}>{remaining}</Text>);
      }
    }

    return result.length > 0 ? result : [input];
  };

  const parsed = parseMarkdown(text);

  // If no markdown found, return plain text
  if (parsed.length === 1 && typeof parsed[0] === 'string') {
    return <Text style={style}>{text}</Text>;
  }

  return <Text style={style}>{parsed}</Text>;
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  interactiveQuestion?: {
    questionId: string;
    question: string;
    options: string[];
    correctIndex: number;  // مخفي من Frontend - فقط Backend يعرفه
  };
  selectedAnswer?: {
    selectedIndex: number;
    isCorrect: boolean;
    analysis?: string;
  };
}

export default function AIChatScreen() {
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzingQuestionId, setAnalyzingQuestionId] = useState<string | null>(null);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const trackId = parseInt(id);
  const colors = getTrackColors(trackId);
  const navigation = useNavigation();

  // إخفاء الـ bottom tab bar عند فتح صفحة الشات
  useFocusEffect(
    React.useCallback(() => {
      // إخفاء الـ tab bar
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' },
        });
      }

      // إرجاع الـ tab bar عند الخروج
      return () => {
        if (parent) {
          parent.setOptions({
            tabBarStyle: {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              height: 80,
              paddingBottom: Platform.OS === 'ios' ? 30 : 10,
              paddingTop: 10,
              elevation: 0,
              shadowOpacity: 0,
              position: 'absolute',
              overflow: 'visible',
            },
          });
        }
      };
    }, [navigation])
  );

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'تسجيل الدخول مطلوب',
        'الرجاء تسجيل الدخول لاستخدام المحادثة',
        [{ text: 'حسناً', onPress: () => router.back() }]
      );
    }
  }, [isAuthenticated]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Helper function to build history from messages, including interactive questions
  // Limits history to last 20 messages to avoid token limit issues
  const buildHistory = (msgs: Message[]): Array<{ role: string; content: string }> => {
    // Take only the last 20 messages to avoid exceeding token limits
    const recentMessages = msgs.slice(-20);
    
    return recentMessages.flatMap(msg => {
      const historyMessages: Array<{ role: string; content: string }> = [];
      
      // Add the main message content if it exists
      if (msg.content) {
        historyMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
      
      // If there's an interactive question, add it as an assistant message
      // Use subtle markers (commas) instead of checkmarks to prevent students from identifying correct answer
      if (msg.interactiveQuestion) {
        let questionText = `السؤال: ${msg.interactiveQuestion.question}\n\nالخيارات:\n`;
        msg.interactiveQuestion.options.forEach((option, index) => {
          // Use triple comma for correct, double comma for incorrect (subtle, hard to notice)
          // This prevents students from identifying the correct answer even during streaming
          const marker = index === msg.interactiveQuestion.correctIndex ? '،،،' : '،،';
          questionText += `${index + 1}. ${marker} ${option}\n`;
        });
        historyMessages.push({
          role: 'assistant',
          content: questionText,
        });
      }
      
      // If there's a selected answer, add it as a user message and analysis as assistant message
      if (msg.selectedAnswer && msg.interactiveQuestion) {
        const selectedOption = msg.interactiveQuestion.options[msg.selectedAnswer.selectedIndex] || '';
        historyMessages.push({
          role: 'user',
          content: `اخترت الخيار ${msg.selectedAnswer.selectedIndex + 1}: ${selectedOption}`,
        });
        
        if (msg.selectedAnswer.analysis) {
          historyMessages.push({
            role: 'assistant',
            content: msg.selectedAnswer.analysis,
          });
        }
      }
      
      return historyMessages;
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading || !isAuthenticated) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Build history for API (includes interactive questions and answers)
    const history = buildHistory(messages);

    // Create placeholder AI message for streaming
    const questionId = `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      const token = await api.getToken();
      if (!token) {
        throw new Error('غير مصرح لك');
      }

      // Use EventSource polyfill with fetch for POST streaming
      // Since EventSource doesn't support POST, we'll use fetch with expo's fetch which supports streaming
      let accumulatedContent = '';
      let finalData: any = null;
      let buffer = '';

      // Use expo's fetch which supports streaming via the polyfill
      const response = await fetch(`${getApiBaseUrl()}${API_ENDPOINTS.AI_CHAT_STREAM(trackId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: history,
        }),
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }
        
        if (__DEV__) {
          console.error('Streaming error:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText.substring(0, 200),
          });
        }
        
        // Try to parse error response
        let errorMessage = `حدث خطأ أثناء إرسال الرسالة (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          // Handle different error response formats
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (errorData.error.message) {
              errorMessage = errorData.error.message;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.data?.error?.message) {
            errorMessage = errorData.data.error.message;
          }
        } catch (e) {
          // Use default message
        }
        
        throw new Error(errorMessage);
      }

      // Use expo's fetch streaming support (via polyfill)
      // The polyfill enables streaming support in expo's fetch
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
              continue;
            }

            const jsonStr = trimmedLine.substring(6); // Remove 'data: '
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'content' && data.data) {
                accumulatedContent += data.data;
                // Update message content in real-time
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: accumulatedContent,
                    };
                  }
                  return updated;
                });
                scrollToBottom();
              } else if (data.type === 'done') {
                finalData = data;
              } else if (data.type === 'error') {
                throw new Error(data.message || 'حدث خطأ');
              }
            } catch (parseError) {
              if (__DEV__) {
                console.log('Parse error:', parseError, 'Line:', trimmedLine.substring(0, 50));
              }
              continue;
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const trimmedLine = buffer.trim();
          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.substring(6);
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const data = JSON.parse(jsonStr);
                if (data.type === 'done' && !finalData) {
                  finalData = data;
                }
              } catch (e) {
                // Skip
              }
            }
          }
        }
      } else {
        // Fallback: use XMLHttpRequest with improved polling and onprogress
        if (__DEV__) {
          console.log('ReadableStream not available, using XMLHttpRequest fallback');
        }
        
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          let lastPosition = 0;
          let processedLines = new Set<string>();
          let buffer = '';

          xhr.open('POST', `${getApiBaseUrl()}${API_ENDPOINTS.AI_CHAT_STREAM(trackId)}`, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('Accept', 'text/event-stream');

          // Use onprogress for real-time updates
          xhr.onprogress = () => {
            if (xhr.readyState === XMLHttpRequest.LOADING) {
              const currentText = xhr.responseText;
              if (currentText.length > lastPosition) {
                const newData = currentText.substring(lastPosition);
                if (__DEV__ && newData.length > 0) {
                  console.log('XHR onprogress - New data received:', newData.substring(0, 100));
                }
                lastPosition = currentText.length;
                buffer += newData;

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line

                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
                    continue;
                  }

                  if (processedLines.has(trimmedLine)) {
                    continue;
                  }
                  processedLines.add(trimmedLine);

                  const jsonStr = trimmedLine.substring(6);
                  if (!jsonStr || jsonStr === '[DONE]') continue;

                  try {
                    const data = JSON.parse(jsonStr);
                    if (data.type === 'content' && data.data) {
                      accumulatedContent += data.data;
                      setMessages(prev => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;
                        if (updated[lastIndex]?.role === 'assistant') {
                          updated[lastIndex] = {
                            ...updated[lastIndex],
                            content: accumulatedContent,
                          };
                        }
                        return updated;
                      });
                      scrollToBottom();
                    } else if (data.type === 'done') {
                      finalData = data;
                    } else if (data.type === 'error') {
                      throw new Error(data.message || 'حدث خطأ');
                    }
                  } catch (e) {
                    if (__DEV__) {
                      console.log('Parse error in onprogress:', e);
                    }
                  }
                }
              }
            }
          };

          // Also poll as backup (in case onprogress doesn't fire)
          const pollInterval = setInterval(() => {
            if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
              const currentText = xhr.responseText;
              if (currentText.length > lastPosition) {
                const newData = currentText.substring(lastPosition);
                if (__DEV__ && newData.length > 0) {
                  console.log('XHR polling - New data received:', newData.substring(0, 100));
                }
                lastPosition = currentText.length;
                buffer += newData;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
                    continue;
                  }

                  if (processedLines.has(trimmedLine)) {
                    continue;
                  }
                  processedLines.add(trimmedLine);

                  const jsonStr = trimmedLine.substring(6);
                  if (!jsonStr || jsonStr === '[DONE]') continue;

                  try {
                    const data = JSON.parse(jsonStr);
                    if (data.type === 'content' && data.data) {
                      accumulatedContent += data.data;
                      setMessages(prev => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;
                        if (updated[lastIndex]?.role === 'assistant') {
                          updated[lastIndex] = {
                            ...updated[lastIndex],
                            content: accumulatedContent,
                          };
                        }
                        return updated;
                      });
                      scrollToBottom();
                    } else if (data.type === 'done') {
                      finalData = data;
                      clearInterval(pollInterval);
                    }
                  } catch (e) {
                    // Skip
                  }
                }
              }
            }
          }, 100); // Poll every 100ms as backup

          xhr.onload = () => {
            clearInterval(pollInterval);
            if (xhr.status >= 200 && xhr.status < 300) {
              // Process any remaining data
              if (buffer.trim()) {
                const trimmedLine = buffer.trim();
                if (trimmedLine.startsWith('data: ')) {
                  const jsonStr = trimmedLine.substring(6);
                  if (jsonStr && jsonStr !== '[DONE]') {
                    try {
                      const data = JSON.parse(jsonStr);
                      if (data.type === 'done' && !finalData) {
                        finalData = data;
                      }
                    } catch (e) {
                      // Skip
                    }
                  }
                }
              }

              // Process all remaining lines
              const allText = xhr.responseText;
              const lines = allText.split('\n');
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
                  continue;
                }
                if (processedLines.has(trimmedLine)) continue;

                const jsonStr = trimmedLine.substring(6);
                if (!jsonStr) continue;

                try {
                  const data = JSON.parse(jsonStr);
                  if (data.type === 'done' && !finalData) {
                    finalData = data;
                  }
                } catch (e) {
                  // Skip
                }
              }
              resolve();
            } else {
              reject(new Error('حدث خطأ أثناء إرسال الرسالة'));
            }
          };

          xhr.onerror = () => {
            clearInterval(pollInterval);
            reject(new Error('حدث خطأ في الاتصال'));
          };

          xhr.send(JSON.stringify({
            message: userMessage.content,
            history: history,
          }));
        });
      }

      if (finalData) {
        // Update final message with parsed data
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex]?.role === 'assistant') {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: finalData.response,
              interactiveQuestion: finalData.interactive_question ? {
                questionId: questionId,
                question: finalData.interactive_question.question,
                options: finalData.interactive_question.options,
                correctIndex: finalData.interactive_question.correct_index,
              } : undefined,
            };
          }
          return updated;
        });

        setTokensRemaining(finalData.tokens_remaining);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        scrollToBottom();
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'حدث خطأ أثناء إرسال الرسالة');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Remove both user and AI messages on error
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelection = async (questionId: string, selectedIndex: number, question: string, options: string[], correctIndex: number) => {
    if (analyzingQuestionId || !isAuthenticated) return;

    setAnalyzingQuestionId(questionId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build history for API (includes interactive questions and answers)
    const history = buildHistory(messages);

    try {
      const response = await api.post<{
        ok: boolean;
        data: {
          is_correct: boolean;
          analysis: string;
          selected_option: string;
          correct_option: string;
          tokens_used: number;
          tokens_remaining: number;
          history?: Array<{ role: string; content: string }>;
        };
      }>(API_ENDPOINTS.AI_CHAT_ANSWER(trackId), {
        question_id: questionId,
        question: question,
        options: options,
        correct_index: correctIndex,
        selected_index: selectedIndex,
        history: history,
      });

      if (response && response.ok && response.data) {
        // تحديث الرسالة بإضافة selectedAnswer
        // buildHistory will automatically include the question, answer, and analysis in future API calls
        setMessages(prev => prev.map(msg => {
          if (msg.interactiveQuestion?.questionId === questionId) {
            return {
              ...msg,
              selectedAnswer: {
                selectedIndex: selectedIndex,
                isCorrect: response.data.is_correct,
                analysis: response.data.analysis,
              },
            };
          }
          return msg;
        }));

        setTokensRemaining(response.data.tokens_remaining);
        Haptics.notificationAsync(
          response.data.is_correct 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Error
        );
        scrollToBottom();
      } else {
        throw new Error('استجابة غير صحيحة من الخادم');
      }
    } catch (err: any) {
      console.error('Error analyzing answer:', err);
      setError(err.message || 'حدث خطأ أثناء تحليل الإجابة');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAnalyzingQuestionId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <GradientBackground colors={colors.gradient}>
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="lock" size={64} color="#EF4444" />
            <Text style={styles.errorText}>تسجيل الدخول مطلوب</Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MaterialIcons name="smart-toy" size={24} color={colors.primary} />
            <Text style={[styles.headerTitle, { textAlign }]}>محادثة مع خبيرك</Text>
          </View>
          {tokensRemaining !== null ? (
            <View style={[styles.tokensBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.tokensText, { color: colors.primary }]}>
                {tokensRemaining.toLocaleString()} tokens
              </Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <View style={[styles.welcomeIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <MaterialIcons name="smart-toy" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.welcomeTitle, { textAlign }]}>مرحباً! 👋</Text>
                <Text style={[styles.welcomeText, { textAlign }]}>
                  أنا خبيرك التعليمي من فريق ملقن السعودي. أنا هنا لمساعدتك في دراستك.
                </Text>
                <Text style={[styles.welcomeHint, { textAlign }]}>
                  اسألني عن أي شيء يتعلق بمسارك التعليمي
                </Text>
              </View>
            )}

            {messages.map((message, index) => (
              <View key={index}>
                {/* Regular Message */}
                {(message.content || !message.interactiveQuestion) && (
                  <View
                    style={[
                      styles.messageWrapper,
                      message.role === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    {message.role === 'assistant' && (
                      <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                        <MaterialIcons name="smart-toy" size={20} color={colors.primary} />
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        message.role === 'user'
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                      ]}
                    >
                      {message.content ? (
                        <MarkdownText
                          text={message.content}
                          style={[
                            styles.messageText,
                            { textAlign: isRTL ? 'right' : 'left' },
                            message.role === 'user' && { color: '#FFFFFF' },
                          ]}
                          textAlign={isRTL ? 'right' : 'left'}
                        />
                      ) : (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </View>
                    {message.role === 'user' && (
                      <View style={[styles.avatar, { backgroundColor: `${colors.primary}40` }]}>
                        <MaterialIcons name="person" size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                )}

                {/* Interactive Question Card */}
                {message.interactiveQuestion && (
                  <View style={styles.interactiveQuestionContainer}>
                    <View style={[styles.interactiveQuestionCard, { borderColor: `${colors.primary}40` }]}>
                      <Text style={[styles.questionTitle, { textAlign }]}>
                        {message.interactiveQuestion.question}
                      </Text>
                      
                      <View style={styles.optionsContainer}>
                        {message.interactiveQuestion.options.map((option, optIndex) => {
                          const isSelected = message.selectedAnswer?.selectedIndex === optIndex;
                          const isAnalyzing = analyzingQuestionId === message.interactiveQuestion?.questionId;
                          const isDisabled = !!message.selectedAnswer || isAnalyzing;
                          const isCorrect = message.selectedAnswer?.isCorrect && isSelected;
                          const isWrong = message.selectedAnswer && !message.selectedAnswer.isCorrect && isSelected;

                          return (
                            <TouchableOpacity
                              key={optIndex}
                              style={[
                                styles.optionButton,
                                isSelected && isCorrect && styles.optionButtonCorrect,
                                isSelected && isWrong && styles.optionButtonWrong,
                                isDisabled && styles.optionButtonDisabled,
                              ]}
                              onPress={() => {
                                if (!isDisabled && message.interactiveQuestion) {
                                  handleAnswerSelection(
                                    message.interactiveQuestion.questionId,
                                    optIndex,
                                    message.interactiveQuestion.question,
                                    message.interactiveQuestion.options,
                                    message.interactiveQuestion.correctIndex
                                  );
                                }
                              }}
                              disabled={isDisabled}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.optionContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={[
                                  styles.optionNumber,
                                  isSelected && isCorrect && { backgroundColor: '#10B981' },
                                  isSelected && isWrong && { backgroundColor: '#EF4444' },
                                ]}>
                                  <Text style={[
                                    styles.optionNumberText,
                                    (isSelected && (isCorrect || isWrong)) && { color: '#FFFFFF' },
                                  ]}>
                                    {optIndex + 1}
                                  </Text>
                                </View>
                                <Text style={[
                                  styles.optionText,
                                  { textAlign },
                                  (isSelected && (isCorrect || isWrong)) && { color: '#FFFFFF' },
                                ]}>
                                  {option}
                                </Text>
                                {isSelected && isCorrect && (
                                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                                )}
                                {isSelected && isWrong && (
                                  <MaterialIcons name="cancel" size={20} color="#EF4444" />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Loading State */}
                      {analyzingQuestionId === message.interactiveQuestion?.questionId && (
                        <View style={[styles.analyzingContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={[styles.analyzingText, { textAlign }]}>جاري التحقق...</Text>
                        </View>
                      )}

                      {/* Analysis */}
                      {message.selectedAnswer?.analysis && (
                        <View style={[
                          styles.analysisContainer,
                          message.selectedAnswer.isCorrect 
                            ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }
                            : { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' },
                        ]}>
                          <View style={[styles.analysisHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <MaterialIcons
                              name={message.selectedAnswer.isCorrect ? "check-circle" : "error"}
                              size={20}
                              color={message.selectedAnswer.isCorrect ? "#10B981" : "#EF4444"}
                            />
                            <Text style={[
                              styles.analysisTitle,
                              { textAlign },
                              { color: message.selectedAnswer.isCorrect ? "#10B981" : "#EF4444" },
                            ]}>
                              {message.selectedAnswer.isCorrect ? 'إجابة صحيحة! ✓' : 'إجابة خاطئة'}
                            </Text>
                          </View>
                          <MarkdownText
                            text={message.selectedAnswer.analysis}
                            style={[styles.analysisText, { textAlign }]}
                            textAlign={isRTL ? 'right' : 'left'}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}


            {error && (
              <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialIcons name="error-outline" size={20} color="#EF4444" />
                <Text style={[styles.errorBannerText, { textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Questions */}
          <View style={[
            styles.quickQuestionsWrapper,
            !showQuickQuestions && styles.quickQuestionsWrapperCollapsed
          ]}>
            {/* Toggle Button - At the top edge, centered */}
            <TouchableOpacity
              style={styles.quickQuestionsToggle}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowQuickQuestions(!showQuickQuestions);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showQuickQuestions ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
            
            {/* Questions ScrollView */}
            {showQuickQuestions && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickQuestionsContainer}
                contentContainerStyle={[
                  styles.quickQuestionsContent,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]}
              >
                {[
                  'عطني سؤال !',
                  'كيف مستواي ؟',
                  'وش اركز عليه ؟',
                  'حلل درجاتي',
                  'وش دروسي الضعيفة ؟',
                  'اقترح علي خطة',
                ].map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.quickQuestionButton,
                      { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setInputText(question);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickQuestionText, { color: colors.primary }]}>
                      {question}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Input */}
          <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row', paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="اكتب رسالتك هنا..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              maxLength={2000}
              editable={!loading}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
                (!inputText.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tokensBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tokensText: {
    fontSize: 12,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 100,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  welcomeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  welcomeHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 18,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  quickQuestionsWrapper: {
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    minHeight: 50,
    paddingTop: 8,
    paddingBottom: 8,
  },
  quickQuestionsWrapperCollapsed: {
    minHeight: 24,
    paddingTop: 2,
    paddingBottom: 2,
  },
  quickQuestionsToggle: {
    position: 'absolute',
    top: 2,
    left: '50%',
    transform: [{ translateX: -8 }],
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  quickQuestionsContainer: {
    maxHeight: 60,
    paddingTop: 20, // Space for the toggle button at top
  },
  quickQuestionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  quickQuestionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickQuestionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  interactiveQuestionContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  interactiveQuestionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionButtonCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  optionButtonWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionContent: {
    alignItems: 'center',
    gap: 12,
  },
  optionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  analyzingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  analyzingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  analysisContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  analysisHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  analysisText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
});

