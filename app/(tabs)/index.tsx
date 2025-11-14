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
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
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
  const { isRTL } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount] = useState(1);
  const [todayPoints] = useState(29);
  const [todayQuestions] = useState(24);
  const [accuracyRate] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

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
          API_ENDPOINTS.POINTS
        );
        if (pointsResponse && pointsResponse.ok && pointsResponse.data) {
          setUserPoints(pointsResponse.data);
        }
      } catch (err) {
        console.log('Points not available');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    router.push(`/(tabs)/tracks/${track.id}`);
  };

  const getTrackColor = (trackId: number) => {
    switch (trackId) {
      case 1: return '#10B981'; // قدرات - أخضر
      case 2: return '#3B82F6'; // تحصيلي - أزرق
      case 3: return '#8B5CF6'; // STEP - بنفسجي
      default: return '#D4AF37';
    }
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
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.headerText}>
                <Text style={[styles.welcomeText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  مرحباً، {user?.full_name || 'ياسمين'}
                </Text>
                <Text style={[styles.headerSubtext, { textAlign: isRTL ? 'right' : 'left' }]}>
                  مركز التحكم الشخصي - تتبع تقدمك وادرس بذكاء
                </Text>
              </View>
            </View>
            
            <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={styles.notificationButton}>
                <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.profileImageContainer}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileEmoji}>👩‍🏫</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Stats Grid */}
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

            {/* Accuracy Rate */}
            <View style={[styles.statCard, { borderColor: '#06B6D440' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                <Image 
                  source={require('@/assets/images/home_page/accuricy.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.statValue, { color: '#06B6D4' }]}>
                {accuracyRate}%
              </Text>
              <Text style={styles.statLabel}>معدل الدقة العام</Text>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#EF444430', borderColor: '#EF4444', borderWidth: 1 }]}>
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>يحتاج تحسين</Text>
              </TouchableOpacity>
            </View>

            {/* Total Questions */}
            <View style={[styles.statCard, { borderColor: '#8B5CF640' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#3A3A3C' }]}>
                <Image 
                  source={require('@/assets/images/home_page/brain.png')} 
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
                {todayQuestions}
              </Text>
              <Text style={styles.statLabel}>إجمالي الأسئلة</Text>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B98130', borderColor: '#10B981', borderWidth: 1 }]}>
                <Text style={[styles.actionButtonText, { color: '#10B981' }]}>+{todayPoints} اليوم</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Title */}
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            الاختبارات المتاحة في النظام
          </Text>

          {/* Tracks Cards */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : (
            <View style={styles.tracksContainer}>
              {tracks.map((track) => {
                const trackColor = getTrackColor(track.id);
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.trackCard, { borderColor: `${trackColor}40` }]}
                    onPress={() => handleTrackPress(track)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.trackHeader}>
                      <Text style={styles.trackEmoji}>🤖</Text>
                      <View style={[styles.trackBadge, { backgroundColor: `${trackColor}20`, borderColor: trackColor }]}>
                        <Text style={[styles.trackBadgeText, { color: trackColor }]}>3 شهور</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.trackTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {track.name}
                    </Text>
                    
                    <Text style={[styles.trackSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
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
                      style={[styles.trackButton, { backgroundColor: trackColor }]}
                      onPress={() => handleTrackPress(track)}
                    >
                      <Text style={styles.trackButtonText}>متابعة التدريب</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
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
    right: 4,
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
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmoji: {
    fontSize: 28,
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
  trackCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
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
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
