import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  View, 
  Text, 
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { SkeletonStatCard, SkeletonTrackCard } from '@/components/ui/SkeletonLoader';
import SpiritualCard from '@/components/spiritual/SpiritualCard';
import { AvatarDisplay } from '@/components/profile/AvatarDisplay';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  icon_emoji?: string;
  primary_color?: string;
  bg_color?: string;
  gradient_colors?: string[];
  has_subscription?: boolean;
  subscription_status?: string;
}

interface UserPoints {
  total_points: number;
  streak_days: number;
  monthly_points: number;
  weekly_points: number;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount] = useState(1);
  const [todayPoints] = useState(29);
  const [todayQuestions] = useState(24);
  const [accuracyRate] = useState(25);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tracks
      const tracksResponse = await api.get<{ ok: boolean; data: Track[] }>(API_ENDPOINTS.TRACKS);
      if (tracksResponse && tracksResponse.ok && tracksResponse.data) {
        setTracks(tracksResponse.data);
      }

      // Fetch user points
      try {
        const pointsResponse = await api.get<{ ok: boolean; data: UserPoints }>(
          API_ENDPOINTS.POINTS,
          { silent401: true } // لا ترمي خطأ عند 401
        );
        if (pointsResponse && pointsResponse.ok && pointsResponse.data) {
          setUserPoints(pointsResponse.data);
        }
      } catch (err: any) {
        // تجاهل خطأ 401 (token منتهي) - هذا طبيعي
        if (err?.message?.includes('انتهت صلاحية الجلسة')) {
          // لا تفعل شيء - المستخدم يحتاج تسجيل الدخول
        } else {
          console.log('Points not available');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    if (track.has_subscription) {
      router.push(`/(tabs)/tracks/${track.id}`);
    } else {
      router.push(`/subscription/${track.id}`);
    }
  };

  const getTrackColor = (track: Track) => {
    const trackColors = getTrackColors(track);
    return trackColors.primary;
  };

  const getTrackIcon = (track: Track) => {
    return track.icon_emoji || track.icon || (() => {
      switch (track.id) {
        case 1: return '🧠'; // قدرات
        case 2: return '📐'; // تحصيلي
        case 3: return '🌐'; // STEP
        default: return '📚';
      }
    })();
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { flexDirection }]}>
            <View style={[styles.headerLeft, { flexDirection }]}>
              <View style={styles.headerText}>
                <Text style={[styles.welcomeText, { textAlign }]}>
                  مرحباً، {user?.full_name || 'ياسمين'}
                </Text>
                <Text style={[styles.headerSubtext, { textAlign }]}>
                  مركز التحكم الشخصي - تتبع تقدمك وادرس بذكاء
                </Text>
              </View>
            </View>
            
            <View style={[styles.headerRight, { flexDirection }]}>
              <TouchableOpacity style={styles.notificationButton}>
                <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <View style={styles.avatarWrapper}>
                  <AvatarDisplay user={user || undefined} size={46} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Grid - فقط النقاط وسلسلة النجاح */}
          {loading ? (
            <View style={styles.statsGrid}>
              <SkeletonStatCard />
              <SkeletonStatCard />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {/* Total Points */}
              <View style={[styles.statCard, { borderColor: '#D4AF3740' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                  <Image 
                    source={require('@/assets/images/home_page/coins.png')} 
                    style={styles.iconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.statValue, { color: '#D4AF37' }]}>
                  {userPoints?.total_points?.toLocaleString() || '10,059'}
                </Text>
                <Text style={styles.statLabel}>إجمالي النقاط</Text>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(99, 205, 47, 0.1)', borderColor: '#63CD2F', borderWidth: 1 }]}>
                  <Text style={[styles.actionButtonText, { color: '#63CD2F' }]}>+{todayPoints} اليوم</Text>
                </TouchableOpacity>
              </View>

              {/* Streak */}
              <View style={[styles.statCard, { borderColor: '#EF444440' }]}>
                <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                  <Image 
                    source={require('@/assets/images/home_page/fire.png')} 
                    style={styles.iconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {userPoints?.streak_days || 0}
                </Text>
                <Text style={styles.statLabel}>سلسلة النجاح (أيام)</Text>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4B556330', borderColor: '#EF4444', borderWidth: 1 }]}>
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>ابدأ سلسلتك</Text>
                  <MaterialIcons name="play-arrow" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Spiritual Card */}
          <SpiritualCard />

          {/* Section Title */}
          <Text style={[styles.sectionTitle, { textAlign }]}>
            الاختبارات المتاحة في النظام
          </Text>

          {/* Tracks Cards */}
          {loading ? (
            <View style={styles.tracksContainer}>
              <SkeletonTrackCard />
              <SkeletonTrackCard />
              <SkeletonTrackCard />
            </View>
          ) : (
            <View style={styles.tracksContainer}>
              {tracks.map((track) => {
                const trackColor = getTrackColor(track);
                const trackIcon = getTrackIcon(track);
                const isLocked = !track.has_subscription;
                return (
                  <View key={track.id} style={styles.trackCardWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.trackCard,
                        { borderColor: `${trackColor}40` },
                        isLocked && styles.trackCardLocked
                      ]}
                      onPress={() => handleTrackPress(track)}
                      activeOpacity={0.8}
                      disabled={false}
                    >
                      {isLocked && (
                        <View style={styles.lockOverlay}>
                          <View style={styles.lockContent}>
                            <MaterialIcons name="lock" size={32} color="#FFFFFF" />
                            <Text style={styles.lockText}>يتطلب اشتراك</Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.trackHeader}>
                        <Text style={styles.trackEmoji}>{trackIcon}</Text>
                        <View style={[styles.trackBadge, { backgroundColor: `${trackColor}20`, borderColor: trackColor }]}>
                          <Text style={[styles.trackBadgeText, { color: trackColor }]}>3 شهور</Text>
                        </View>
                      </View>
                      
                      <Text style={[styles.trackTitle, { textAlign }]}>
                        {track.name}
                      </Text>
                      
                      <Text style={[styles.trackSubtitle, { textAlign }]}>
                        اختبار التحصيل الدراسي للثانوية العامة
                      </Text>

                      <View style={styles.trackStats}>
                        <View style={styles.trackStatItem}>
                          <MaterialIcons name="access-time" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.trackStatText}>24/7 متوفر</Text>
                        </View>
                        <View style={styles.trackStatItem}>
                          <MaterialIcons name="help-outline" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.trackStatText}>1000+ سؤال</Text>
                        </View>
                        <View style={styles.trackStatItem}>
                          <MaterialIcons name="calendar-today" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.trackStatText}>3 شهور</Text>
                        </View>
                      </View>

                      <TouchableOpacity 
                        style={[
                          styles.trackButton,
                          { backgroundColor: trackColor },
                          isLocked && styles.trackButtonLocked
                        ]}
                        onPress={() => handleTrackPress(track)}
                      >
                        <Text style={styles.trackButtonText}>
                          {isLocked ? 'اشترك الآن' : 'متابعة التدريب'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  headerRight: {
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    end: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  avatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    borderTopWidth: 3,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 24,
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  statLabel: {
    color: '#96ACC1',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  statBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
    minWidth: 140,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  tracksContainer: {
    gap: 16,
  },
  trackCardWrapper: {
    position: 'relative',
  },
  trackCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    position: 'relative',
  },
  trackCardLocked: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  lockContent: {
    alignItems: 'center',
    gap: 8,
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackEmoji: {
    fontSize: 60,
  },
  trackBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  trackBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  trackSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginBottom: 16,
  },
  trackStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  trackStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackStatText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  trackButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  trackButtonLocked: {
    backgroundColor: '#D4AF37',
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
