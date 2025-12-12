import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Message {
  id: number;
  message: string;
  type: string;
  created_at: string;
  user?: {
    id: number;
    full_name: string;
  };
}

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  messages: Message[];
}

export default function TicketDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isRTL, textAlign } = useLanguage();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);

  // إخفاء الـ header
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation])
  );

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: Ticket }>(
        API_ENDPOINTS.SUPPORT_TICKET(Number(id))
      );
      
      if (response?.ok && response.data) {
        setTicket(response.data);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert('خطأ', 'فشل تحميل التذكرة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTicket();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رسالة');
      return;
    }

    try {
      setSending(true);
      await api.post(API_ENDPOINTS.SUPPORT_TICKET_MESSAGES(Number(id)), {
        message: message.trim(),
      });
      
      setMessage('');
      fetchTicket();
      Alert.alert('نجح', 'تم إرسال الرسالة بنجاح');
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'resolved': return '#10B981';
      case 'closed': return '#64748B';
      default: return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'مفتوحة';
      case 'in_progress': return 'قيد المعالجة';
      case 'resolved': return 'محلولة';
      case 'closed': return 'مغلقة';
      default: return status;
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!ticket) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#EF4444" />
            <Text style={styles.errorText}>لم يتم العثور على التذكرة</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.title, { textAlign }]}>التذكرة #{ticket.ticket_number}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
          {/* Ticket Info */}
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <View style={styles.ticketMeta}>
              <View style={[styles.ticketStatus, { backgroundColor: `${getStatusColor(ticket.status)}20`, borderColor: getStatusColor(ticket.status) }]}>
                <Text style={[styles.ticketStatusText, { color: getStatusColor(ticket.status) }]}>
                  {getStatusText(ticket.status)}
                </Text>
              </View>
              <Text style={styles.ticketMetaText}>
                <MaterialIcons name="schedule" size={14} color="#64748B" /> {new Date(ticket.created_at).toLocaleDateString('ar-SA')}
              </Text>
            </View>
            <Text style={styles.ticketDescription}>{ticket.description}</Text>
          </View>

          {/* Messages */}
          <View style={styles.messagesSection}>
            <Text style={styles.sectionTitle}>المحادثة</Text>
            {ticket.messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageCard,
                  msg.type === 'user' && styles.messageCardUser,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={[styles.messageAuthor, msg.type === 'user' && styles.messageAuthorUser]}>
                    {msg.type === 'user' ? 'أنت' : (msg.type === 'admin' ? 'الدعم الفني' : 'النظام')}
                  </Text>
                  <Text style={styles.messageDate}>
                    {new Date(msg.created_at).toLocaleDateString('ar-SA')}
                  </Text>
                </View>
                <Text style={styles.messageText}>{msg.message}</Text>
              </View>
            ))}
          </View>

          {/* Add Message Form */}
          {ticket.status !== 'closed' && (
            <View style={styles.messageForm}>
              <Text style={styles.formTitle}>إضافة رد</Text>
              <TextInput
                ref={messageInputRef}
                style={styles.messageInput}
                placeholder="اكتب ردك هنا..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#0F1419" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#0F1419" />
                    <Text style={styles.sendButtonText}>إرسال</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    gap: 16,
  },
  loadingText: {
    color: '#F8F9FA',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // مساحة إضافية للكيبورد
  },
  ticketInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketSubject: {
    fontSize: 24,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 12,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  ticketStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  ticketStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketMetaText: {
    fontSize: 12,
    color: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  messagesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 16,
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  messageCardUser: {
    borderLeftColor: '#D4AF37',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  messageAuthorUser: {
    color: '#D4AF37',
  },
  messageDate: {
    fontSize: 12,
    color: '#64748B',
  },
  messageText: {
    fontSize: 16,
    color: '#F8F9FA',
    lineHeight: 24,
  },
  messageForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#F8F9FA',
    fontSize: 16,
    fontFamily: 'Cairo',
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#0F1419',
    fontWeight: '700',
    fontSize: 16,
  },
});

