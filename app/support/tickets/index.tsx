import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  messages_count?: number;
}

export default function TicketsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isRTL, textAlign } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // إخفاء الـ header
  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation])
  );

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get<{ ok: boolean; data: Ticket[] }>(
        `${API_ENDPOINTS.SUPPORT_TICKETS}?${params.toString()}`
      );
      
      if (response?.ok && response.data) {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
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

  if (loading && !refreshing) {
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

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign: 'center' }]}>تذاكري</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/support/tickets/create')}
          >
            <MaterialIcons name="add" size={24} color="#0F1419" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        >
          {/* Filters */}
          <View style={styles.filters}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث في التذاكر..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchTickets}
            />
            <View style={styles.statusFilters}>
              {['', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusFilter,
                    statusFilter === status && styles.statusFilterActive,
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.statusFilterText,
                    statusFilter === status && styles.statusFilterTextActive,
                  ]}>
                    {status === '' ? 'الكل' : getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tickets List */}
          {tickets.length > 0 ? (
            <View style={styles.ticketsList}>
              {tickets.map((ticket) => (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketCard}
                  onPress={() => router.push(`/support/tickets/${ticket.id}`)}
                >
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
                    <View style={[styles.ticketStatus, { backgroundColor: `${getStatusColor(ticket.status)}20`, borderColor: getStatusColor(ticket.status) }]}>
                      <Text style={[styles.ticketStatusText, { color: getStatusColor(ticket.status) }]}>
                        {getStatusText(ticket.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={styles.ticketDescription} numberOfLines={2}>
                    {ticket.description}
                  </Text>
                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketMeta}>
                      <MaterialIcons name="schedule" size={14} color="#64748B" /> {new Date(ticket.created_at).toLocaleDateString('ar-SA')}
                    </Text>
                    <MaterialIcons name="chevron-left" size={20} color="#64748B" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="ticket-alt" size={64} color="rgba(255, 255, 255, 0.1)" />
              <Text style={styles.emptyStateTitle}>لا توجد تذاكر</Text>
              <Text style={styles.emptyStateText}>ابدأ بإنشاء تذكرة جديدة للحصول على المساعدة</Text>
              <TouchableOpacity
                style={styles.createButtonLarge}
                onPress={() => router.push('/support/tickets/create')}
              >
                <Text style={styles.createButtonText}>إنشاء تذكرة جديدة</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 0,
  },
  createButton: {
    width: 40,
    height: 40,
    backgroundColor: '#D4AF37',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  filters: {
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#F8F9FA',
    fontSize: 16,
    fontFamily: 'Cairo',
    marginBottom: 12,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilter: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusFilterActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  statusFilterText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '600',
  },
  statusFilterTextActive: {
    color: '#0F1419',
  },
  ticketsList: {
    gap: 16,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ticketNumber: {
    backgroundColor: '#D4AF37',
    color: '#0F1419',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontWeight: '700',
    fontSize: 12,
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
  ticketSubject: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 8,
  },
  ticketDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    fontSize: 12,
    color: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  createButtonLarge: {
    backgroundColor: '#D4AF37',
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: '#0F1419',
    fontWeight: '700',
    fontSize: 16,
  },
});

