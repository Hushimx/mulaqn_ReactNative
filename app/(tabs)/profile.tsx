import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AvatarDisplay } from '@/components/profile/AvatarDisplay';
import { api, API_ENDPOINTS } from '@/utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface ProfileData {
  user: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    avatar?: string;
    avatar_shape?: string | null;
    avatar_color?: string | null;
    bio?: string | null;
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
  paid_at?: string;
  subscription_plan?: {
    name: string;
  };
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, isLoading: authLoading, refreshUser } = useAuth();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

  useEffect(() => {
    fetchProfileData();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

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
      if (response && response.ok && response.data) {
        // Ensure we have an array of payments
        const paymentsData = Array.isArray(response.data) ? response.data : [];
        setPayments(paymentsData);
        console.log('Fetched payments:', paymentsData.length, 'invoices');
      } else {
        console.warn('Invalid payments response:', response);
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
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

  const formatPaymentDate = (payment: Payment): string => {
    // Use paid_at for paid payments, otherwise use created_at
    const dateString = (payment.status === 'paid' && payment.paid_at) 
      ? payment.paid_at 
      : payment.created_at;
    
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Format in Arabic with full date format (day month year)
      // Try with Islamic calendar first, fallback to Gregorian if not supported
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      
      // Try with Islamic calendar (if supported by the device)
      try {
        return date.toLocaleDateString('ar-SA-u-ca-islamic', options) || 
               date.toLocaleDateString('ar-SA', options);
      } catch {
        // Fallback to standard Arabic date format
        return date.toLocaleDateString('ar-SA', options);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
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
          {/* Header */}
          <Animated.View 
            entering={FadeInUp.duration(400)}
            style={[styles.header, { flexDirection }]}
          >
            <Text style={[styles.headerTitle, { textAlign }]}>الملف الشخصي</Text>
            <TouchableOpacity 
              style={styles.settingsButton} 
              activeOpacity={0.7}
              onPress={() => router.push('/settings')}
            >
              <MaterialIcons name="settings" size={22} color="#D4AF37" />
            </TouchableOpacity>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View 
            entering={FadeInUp.duration(400).delay(100)}
            style={styles.profileCard}
          >
            {/* Avatar */}
            <TouchableOpacity 
              style={styles.avatarContainer}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/edit')}
            >
              <View style={styles.avatarWrapper}>
                <AvatarDisplay 
                  user={profileData?.user || user || undefined}
                  size={90}
                />
              </View>
              <View style={styles.editAvatarBadge}>
                <MaterialIcons name="edit" size={14} color="#1B365D" />
              </View>
            </TouchableOpacity>

            {/* User Info */}
            <TouchableOpacity 
              style={styles.userNameContainer}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={[styles.userName, { textAlign }]}>
                {profileData?.user.full_name || user?.full_name || 'ياسمين محمد'}
              </Text>
              <MaterialIcons name="edit" size={16} color="rgba(255,255,255,0.5)" style={styles.editIcon} />
            </TouchableOpacity>

            {/* Bio */}
            {profileData?.user.bio || user?.bio ? (
              <Text style={[styles.userBio, { textAlign }]}>
                {profileData?.user.bio || user?.bio}
              </Text>
            ) : (
              <TouchableOpacity 
                style={styles.addBioButton}
                activeOpacity={0.8}
                onPress={() => router.push('/profile/edit')}
              >
                <MaterialIcons name="add" size={14} color="#D4AF37" />
                <Text style={[styles.addBioText, { textAlign }]}>أضف وصفاً عنك</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.divider} />
            
            <View style={[styles.userInfoRow, { flexDirection }]}>
              <MaterialIcons name="email" size={16} color="rgba(255,255,255,0.6)" style={styles.infoIcon} />
              <Text style={[styles.userEmail, { textAlign }]}>{profileData?.user.email || user?.email || ''}</Text>
            </View>
            
            <View style={[styles.userInfoRow, { flexDirection }]}>
              <MaterialIcons name="event" size={16} color="rgba(255,255,255,0.6)" style={styles.infoIcon} />
              <Text style={[styles.userJoinDate, { textAlign }]}>
                انضم في {profileData?.user.joined_at ? new Date(profileData.user.joined_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : 'أكتوبر 2025'}
              </Text>
            </View>
          </Animated.View>

          {/* Stats Cards */}
          {profileData?.points && (
            <Animated.View 
              entering={FadeInUp.duration(400).delay(200)}
              style={styles.statsContainer}
            >
              <View style={[styles.statCard, { borderTopColor: '#D4AF37' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                  <MaterialIcons name="stars" size={24} color="#D4AF37" />
                </View>
                <Text style={[styles.statValue, { color: '#D4AF37' }]}>
                  {profileData.points.total.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>إجمالي النقاط</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: '#5DADE2' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                  <MaterialIcons name="emoji-events" size={24} color="#5DADE2" />
                </View>
                <Text style={[styles.statValue, { color: '#5DADE2' }]}>
                  {profileData.achievements?.length || 0}
                </Text>
                <Text style={styles.statLabel}>الإنجازات</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: '#BB8FCE' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                  <MaterialIcons name="workspace-premium" size={24} color="#BB8FCE" />
                </View>
                <Text style={[styles.statValue, { color: '#BB8FCE' }]}>
                  {profileData.badges?.length || 0}
                </Text>
                <Text style={styles.statLabel}>البادجات</Text>
              </View>
            </Animated.View>
          )}

          {/* Subscription Alert */}
          {profileData?.subscription && (
            <Animated.View 
              entering={FadeInUp.duration(400).delay(300)}
              style={styles.alertCard}
            >
              <View style={[styles.alertHeader, { flexDirection }]}>
                <MaterialIcons name="notifications-active" size={20} color="#EF4444" />
                <Text style={[styles.alertTitle, { textAlign }]}>تنبيه الاشتراك</Text>
              </View>
              <Text style={[styles.alertText, { textAlign }]}>
                سينتهي الاشتراك في{' '}
                <Text style={styles.alertBold}>{profileData.subscription.track.name}</Text>{' '}
                في تاريخ
              </Text>
              <Text style={[styles.alertDate, { textAlign }]}>
                {new Date(profileData.subscription.renewal_date).toLocaleDateString('ar-SA', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </Animated.View>
          )}

          {/* Achievements Section */}
          <Animated.View 
            entering={FadeInUp.duration(400).delay(400)}
            style={styles.section}
          >
            <View style={[styles.sectionHeader, { flexDirection }]}>
              <Text style={[styles.sectionTitle, { textAlign }]}>الإنجازات</Text>
              <MaterialIcons name="emoji-events" size={20} color="#D4AF37" />
            </View>
            
            <View style={styles.achievementsContainer}>
              {profileData?.achievements && profileData.achievements.length > 0 ? (
                profileData.achievements.slice(0, 3).map((achievement, index) => (
                  <Animated.View
                    key={achievement.id}
                    entering={FadeInUp.duration(400).delay(500 + index * 100)}
                    style={styles.achievementCard}
                  >
                    <View style={styles.achievementLeft}>
                      <View style={styles.goldBadge}>
                        <MaterialIcons name="emoji-events" size={20} color="#1B365D" />
                      </View>
                      <View style={styles.achievementInfo}>
                        <Text style={[styles.achievementName, { textAlign }]}>{achievement.name}</Text>
                        <Text style={[styles.achievementSubtext, { textAlign }]}>{achievement.description}</Text>
                      </View>
                    </View>
                  </Animated.View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="emoji-events" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyStateText}>لا توجد إنجازات بعد</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Invoices/Payments Section */}
          <Animated.View 
            entering={FadeInUp.duration(400).delay(600)}
            style={styles.section}
          >
            <View style={[styles.sectionHeader, { flexDirection }]}>
              <Text style={[styles.sectionTitle, { textAlign }]}>الفواتير</Text>
              <MaterialIcons name="receipt" size={20} color="#D4AF37" />
            </View>

            <View style={styles.invoicesContainer}>
              {payments && payments.length > 0 ? (
                payments.slice(0, 3).map((payment, index) => {
                  const statusBadge = getStatusBadge(payment.status);
                  return (
                    <Animated.View
                      key={payment.id}
                      entering={FadeInUp.duration(400).delay(700 + index * 100)}
                      style={styles.invoiceCard}
                    >
                      <View style={[styles.invoiceHeader, { flexDirection }]}>
                        <View style={styles.invoiceLeft}>
                          <Text style={[styles.invoiceAmountText, { textAlign }]}>
                            {payment.amount} {payment.currency}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
                            <Text style={[styles.statusBadgeText, { textAlign }]}>{statusBadge.text}</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          onPress={() => setExpandedInvoice(expandedInvoice === payment.id ? null : payment.id)}
                        >
                          <MaterialIcons 
                            name={expandedInvoice === payment.id ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                            size={24} 
                            color="rgba(255,255,255,0.6)" 
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.invoiceDate, { textAlign }]}>
                        {formatPaymentDate(payment)}
                      </Text>
                      {expandedInvoice === payment.id && (
                        <View style={styles.invoiceDetails}>
                          <Text style={styles.invoiceDetailText}>
                            الخطة: {payment.subscription_plan?.name || 'غير محدد'}
                          </Text>
                        </View>
                      )}
                    </Animated.View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="receipt" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyStateText}>لا توجد فواتير</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Logout Button */}
          <Animated.View 
            entering={FadeInUp.duration(400).delay(800)}
            style={styles.logoutSection}
          >
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <MaterialIcons name="logout" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
            </TouchableOpacity>
          </Animated.View>

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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  profileCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderTopWidth: 3,
    borderTopColor: '#D4AF37',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1B365D',
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editIcon: {
    marginStart: 8,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  userBio: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  addBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  addBioText: {
    color: '#D4AF37',
    fontSize: 13,
    marginStart: 6,
    fontWeight: '500',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    justifyContent: 'center',
  },
  infoIcon: {
    marginEnd: 8,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  userJoinDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    borderTopWidth: 3,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  alertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginStart: 8,
  },
  alertText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertDate: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#D4AF37',
  },
  achievementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goldBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 12,
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  invoicesContainer: {
    gap: 12,
  },
  invoiceCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: '#5DADE2',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLeft: {
    flex: 1,
    gap: 8,
  },
  invoiceAmountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  invoiceDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  invoiceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  invoiceDetailText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: 'rgba(212, 175, 55, 0.3)',
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 12,
  },
  logoutSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 100,
  },
});
