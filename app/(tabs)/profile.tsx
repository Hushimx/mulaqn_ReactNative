import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, API_ENDPOINTS } from '@/utils/api';

interface ProfileData {
  user: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    avatar?: string;
    joined_at: string;
  };
  subscription?: {
    track: {
      name: string;
    };
    renewal_date: string;
  };
  points: {
    total: number;
    weekly: number;
    monthly: number;
    streak_days: number;
  };
  achievements: Array<{
    id: number;
    name: string;
    description: string;
    icon?: string;
    badge_color?: string;
  }>;
  badges: Array<{
    id: number;
    name: string;
    description: string;
    icon?: string;
    badge_color?: string;
  }>;
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  subscription_plan?: {
    name: string;
  };
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

  useEffect(() => {
    fetchProfileData();
    fetchPayments();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response: any = await api.get(API_ENDPOINTS.PROFILE);
      if (response.ok) {
        setProfileData(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response: any = await api.get(API_ENDPOINTS.PAYMENTS);
      if (response.ok) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout.title') || 'تسجيل الخروج',
      t('profile.logout.message') || 'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
      [
        {
          text: t('common.cancel') || 'إلغاء',
          style: 'cancel',
        },
        {
          text: t('profile.logout.confirm') || 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert(
                t('common.error') || 'خطأ',
                error instanceof Error ? error.message : t('profile.logout.error') || 'حدث خطأ أثناء تسجيل الخروج'
              );
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { text: 'مكتمل', color: '#4CAF50' };
      case 'pending':
        return { text: 'قيد الانتظار', color: '#FF6B9D' };
      case 'completed':
        return { text: 'مدفوعة', color: '#9C27B0' };
      default:
        return { text: 'ملغي', color: '#F44336' };
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Header with Settings and Share Icons */}
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <MaterialIcons name="settings" size={24} color="#D4AF37" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <MaterialIcons name="share" size={24} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image 
              source={require('@/assets/images/profile_picture.png')} 
              style={styles.avatar} 
            />
          </View>

          {/* User Info */}
          <Text style={styles.userName}>
            {profileData?.user.full_name || user?.full_name || 'ياسمين محمد'}
          </Text>
          
          <View style={styles.userInfoRow}>
            <MaterialIcons name="email" size={14} color="rgba(255,255,255,0.7)" style={styles.infoIcon} />
            <Text style={styles.userEmail}>{profileData?.user.email || user?.email || ''}</Text>
          </View>
          
          <View style={styles.userInfoRow}>
            <MaterialIcons name="event" size={14} color="rgba(255,255,255,0.7)" style={styles.infoIcon} />
            <Text style={styles.userJoinDate}>
              Joined {profileData?.user.joined_at ? new Date(profileData.user.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Oct, 2025'}
            </Text>
          </View>

          {/* Review Test Data Button */}
          <TouchableOpacity style={styles.reviewButton} activeOpacity={0.8}>
            <Text style={styles.reviewButtonText}>استعراض بيانات الاختبار</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Alert (Libya Section) */}
        {profileData?.subscription && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <MaterialIcons name="notifications-active" size={20} color="#8B3A3A" />
              <Text style={styles.alertTitle}>ليبيا</Text>
            </View>
            <Text style={styles.alertText}>
              سينتهي الاشتراك في{' '}
              <Text style={styles.alertBold}>{profileData.subscription.track.name}</Text>{' '}
              إلى التجديد
            </Text>
            <Text style={styles.alertDate}>
              {new Date(profileData.subscription.renewal_date).toLocaleDateString('ar-SA')}
            </Text>
            <Text style={styles.alertNote}>
              لمواصلة الدخول للمحتوى
            </Text>
          </View>
        )}

        {/* Achievements Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الإنجازات</Text>
        </View>
        
        <View style={styles.achievementsContainer}>
          {/* Static Achievement Cards matching the image */}
          <View style={styles.achievementCard}>
            <View style={styles.achievementLeft}>
              <View style={styles.goldBadge}>
                <MaterialIcons name="emoji-events" size={20} color="#1B365D" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>اختبار step</Text>
                <Text style={styles.achievementSubtext}>* ساعات - * دروس</Text>
              </View>
            </View>
            <View style={styles.achievementIcon}>
              <MaterialIcons name="menu-book" size={28} color="rgba(255,255,255,0.5)" />
            </View>
          </View>

          <View style={styles.achievementCard}>
            <View style={styles.achievementLeft}>
              <View style={styles.goldBadge}>
                <MaterialIcons name="emoji-events" size={20} color="#1B365D" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>اختبار القدرات العامة</Text>
                <Text style={styles.achievementSubtext}>* ساعات - * دروس</Text>
              </View>
            </View>
            <View style={styles.achievementIcon}>
              <MaterialIcons name="menu-book" size={28} color="rgba(255,255,255,0.5)" />
            </View>
          </View>

          <View style={styles.achievementCard}>
            <View style={styles.achievementLeft}>
              <View style={styles.goldBadge}>
                <MaterialIcons name="emoji-events" size={20} color="#1B365D" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>الاختبار التحصيلي</Text>
                <Text style={styles.achievementSubtext}>* ساعات - * دروس</Text>
              </View>
            </View>
            <View style={styles.achievementIcon}>
              <MaterialIcons name="menu-book" size={28} color="rgba(255,255,255,0.5)" />
            </View>
          </View>
        </View>

        {/* Invoices/Payments Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الفواتير</Text>
          <TouchableOpacity>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.invoicesContainer}>
          {/* Static Invoice Cards matching the image */}
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceAmount}>
                <Text style={styles.invoiceAmountText}>220 ريال سعودي</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.statusBadgeText}>مكتمل</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setExpandedInvoice(expandedInvoice === 1 ? null : 1)}>
                <MaterialIcons 
                  name={expandedInvoice === 1 ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.invoiceEmail}>m0nzer.2025@gmail.com</Text>
          </View>

          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceAmount}>
                <Text style={styles.invoiceAmountText}>220 ريال سعودي</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#FF6B9D' }]}>
                  <Text style={styles.statusBadgeText}>قيد الانتظار</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setExpandedInvoice(expandedInvoice === 2 ? null : 2)}>
                <MaterialIcons 
                  name={expandedInvoice === 2 ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.invoiceEmail}>m0nzer.2025@gmail.com</Text>
          </View>

          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceAmount}>
                <Text style={styles.invoiceAmountText}>220 ريال سعودي</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#9C27B0' }]}>
                  <Text style={styles.statusBadgeText}>مدفوعة</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setExpandedInvoice(expandedInvoice === 3 ? null : 3)}>
                <MaterialIcons 
                  name={expandedInvoice === 3 ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.invoiceEmail}>m0nzer.2025@gmail.com</Text>
          </View>
        </View>

        {/* Bottom Navigation Space */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: 'rgba(60, 60, 67, 0.6)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#D4AF37',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 6,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  userJoinDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  reviewButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  reviewButtonText: {
    color: '#1B365D',
    fontSize: 14,
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: '#E8B4B4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    color: '#8B3A3A',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  alertText: {
    color: '#5C1F1F',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  alertBold: {
    fontWeight: '700',
  },
  alertDate: {
    color: '#5C1F1F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertNote: {
    color: '#5C1F1F',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  achievementsContainer: {
    marginBottom: 20,
  },
  achievementCard: {
    backgroundColor: '#3A4A5C',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoicesContainer: {
    marginBottom: 24,
  },
  invoiceCard: {
    backgroundColor: '#3A4A5C',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceAmountText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceEmail: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  bottomSpace: {
    height: 100,
  },
});
