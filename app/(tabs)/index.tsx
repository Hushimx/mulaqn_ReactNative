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
import { GradientButton } from '@/components/ui/GradientButton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(1);

  const welcomeName = user?.full_name || t('home.guest');

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: Track[] }>(API_ENDPOINTS.TRACKS);
      // API returns { ok: true, data: [...] }
      if (response && response.ok && response.data) {
        setTracks(response.data);
      } else if (Array.isArray(response)) {
        // Fallback: if API returns array directly
        setTracks(response);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      // Set empty array on error to prevent crashes
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    // Navigate to track dashboard with lessons
    router.push(`/tracks/${track.id}`);
  };

  const getTrackIcon = (code: string) => {
    // Return appropriate icon based on track code
    return 'calculate'; // Default calculator icon
  };

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={[styles.safeArea, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { direction: isRTL ? 'rtl' : 'ltr' }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with title and notification */}
          <View style={[styles.topHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.pageTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('home.pageTitle')}</Text>
            <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={styles.notificationButton}>
                <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <View style={[styles.notificationBadge, { right: isRTL ? 0 : undefined, left: isRTL ? undefined : 0 }]}>
                    <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome Section */}
          <View style={[styles.welcomeSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.welcomeTextContainer, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}>
              <Text style={[styles.welcomeText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('home.welcome', { name: welcomeName })}
              </Text>
              <Text style={[styles.welcomeSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('home.subtitle')}
              </Text>
            </View>
            <View style={styles.profileImageContainer}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialIcons name="person" size={30} color="#D4AF37" />
                </View>
              )}
            </View>
          </View>

          {/* Section Title */}
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('home.availableTests')}
          </Text>

          {/* Tracks Cards */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : (
            <View style={styles.tracksContainer}>
              {tracks.map((track) => (
                <View key={track.id} style={styles.trackCard}>
                  {/* Track Icon */}
                  <View style={styles.trackIconContainer}>
                    <MaterialIcons 
                      name={getTrackIcon(track.code) as any} 
                      size={60} 
                      color="#10b981" 
                    />
                  </View>

                  {/* Track Title */}
                  <Text style={styles.trackTitle}>{track.name}</Text>

                  {/* Track Stats */}
                  <View style={[styles.trackStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.statText, { textAlign: isRTL ? 'right' : 'left' }]}>3 أشهر</Text>
                    <Text style={[styles.statText, { textAlign: isRTL ? 'right' : 'left' }]}>24/7 متوفر</Text>
                    <Text style={[styles.statText, { textAlign: isRTL ? 'right' : 'left' }]}>1000+ سؤال</Text>
                  </View>

                  {/* Start Button */}
                  <GradientButton
                    text={t('home.startNow')}
                    onPress={() => handleTrackPress(track)}
                    style={styles.startButton}
                  />
                </View>
              ))}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  topHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeSection: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tracksContainer: {
    gap: 20,
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackIconContainer: {
    marginBottom: 16,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  trackStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  startButton: {
    width: '100%',
    borderRadius: 12,
  },
});
