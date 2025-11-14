import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const sections = [
    {
      key: 'routing',
      title: t('explore.sections.routing.title'),
      description: t('explore.sections.routing.description'),
      icon: 'hub',
    },
    {
      key: 'progress',
      title: t('explore.sections.progress.title'),
      description: t('explore.sections.progress.description'),
      icon: 'trending-up',
    },
    {
      key: 'support',
      title: t('explore.sections.support.title'),
      description: t('explore.sections.support.description'),
      icon: 'support-agent',
    },
  ];

  const quickActions = [
    {
      key: 'subscription',
      title: 'الاشتراكات',
      description: 'اشترك في المسارات التعليمية',
      icon: 'card-membership',
      color: '#D4AF37',
      action: () => router.push('/subscription'),
    },
    {
      key: 'tracks',
      title: 'المسارات التعليمية',
      description: 'استكشف جميع المسارات',
      icon: 'school',
      color: '#10B981',
      action: () => router.push('/(tabs)'),
    },
  ];

  return (
    <View style={styles.wrapper}>
      <LanguageSwitcher />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
        <Text style={styles.title}>
          {t('explore.title')}
        </Text>
        <Text style={styles.description}>
          {t('explore.description')}
        </Text>
      </View>

      <View style={styles.quickLinks}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.quickLink}
          onPress={() => router.push('/login')}
        >
          <MaterialIcons name="login" size={24} color="#D4AF37" />
          <Text style={styles.quickLinkText}>{t('explore.login')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.quickLink}
          onPress={() => router.push('/register')}
        >
          <MaterialIcons name="person-add-alt" size={24} color="#D4AF37" />
          <Text style={styles.quickLinkText}>{t('explore.register')}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.key}
            style={[styles.quickActionCard, { borderColor: `${action.color}40` }]}
            onPress={action.action}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
              <MaterialIcons name={action.icon as any} size={32} color={action.color} />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionDescription}>{action.description}</Text>
            </View>
            <MaterialIcons name="chevron-left" size={24} color={action.color} />
          </TouchableOpacity>
        ))}
      </View>

      {sections.map(section => (
        <View key={section.key} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name={section.icon as any} size={26} color="#D4AF37" />
            <Text style={styles.cardTitle}>
              {section.title}
            </Text>
          </View>
          <Text style={styles.cardBody}>
            {section.description}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.learnMore}
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/profile')}
      >
        <MaterialIcons name="info" size={20} color="#0B1E33" />
        <Text style={styles.learnMoreText}>{t('explore.learnMore')}</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#102A43',
  },
  container: {
    flex: 1,
    backgroundColor: '#102A43',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 22,
  },
  quickLinks: {
    gap: 12,
  },
  quickLink: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cardBody: {
    color: '#FFFFFF',
    opacity: 0.85,
    fontSize: 14,
    lineHeight: 22,
  },
  learnMore: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  learnMoreText: {
    color: '#0B1E33',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  quickActionCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.4)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'right',
  },
  quickActionDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textAlign: 'right',
  },
});
