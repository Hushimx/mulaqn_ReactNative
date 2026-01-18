import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SpiritualContent,
  getDailySpiritualContent,
  getNextSpiritualContent,
} from '@/utils/spiritualContent';
import { useLanguage } from '@/contexts/LanguageContext';

interface SpiritualCardProps {
  onContentChange?: (content: SpiritualContent) => void;
}

const STORAGE_KEY = 'spiritual_card_state';
const COUNTER_KEY_PREFIX = 'spiritual_counter_';

export default function SpiritualCard({ onContentChange }: SpiritualCardProps) {
  const { textAlign, flexDirection } = useLanguage();
  const [currentContent, setCurrentContent] = useState<SpiritualContent>(getDailySpiritualContent());
  const [counter, setCounter] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  // تحميل الحالة المحفوظة
  useEffect(() => {
    loadSavedState();
  }, []);

  // حفظ الحالة عند التغيير
  useEffect(() => {
    saveState();
    if (onContentChange) {
      onContentChange(currentContent);
    }
  }, [currentContent, counter, isCompleted]);

  // التحقق من إكمال العدد (للعناصر التفاعلية)
  useEffect(() => {
    if (currentContent.isInteractive && currentContent.targetCount) {
      if (counter >= currentContent.targetCount) {
        setIsCompleted(true);
        // تغيير تلقائي بعد 2 ثانية
        const timeout = setTimeout(async () => {
          const nextContent = getNextSpiritualContent(currentContent.id);
          setCurrentContent(nextContent);
          setCounter(0);
          setIsCompleted(false);
          scaleAnim.setValue(1);
          glowAnim.setValue(0);
          
          // حفظ الكارد الجديد
          const today = new Date().toDateString();
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ content: nextContent, counter: 0, isCompleted: false }));
          await AsyncStorage.setItem(`${STORAGE_KEY}_date`, today);
        }, 2000);
        
        return () => clearTimeout(timeout);
      } else {
        setIsCompleted(false);
      }
    }
  }, [counter, currentContent.id]);

  const loadSavedState = async () => {
    try {
      const today = new Date().toDateString();
      const savedState = await AsyncStorage.getItem(STORAGE_KEY);
      const savedDate = await AsyncStorage.getItem(`${STORAGE_KEY}_date`);

      // إذا كان اليوم مختلف، استخدم الكارد اليومي الجديد
      if (savedDate !== today) {
        const dailyContent = getDailySpiritualContent();
        setCurrentContent(dailyContent);
        setCounter(0);
        setIsCompleted(false);
        // حفظ الكارد الجديد
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ content: dailyContent, counter: 0, isCompleted: false }));
        await AsyncStorage.setItem(`${STORAGE_KEY}_date`, today);
        return;
      }

      if (savedState) {
        const state = JSON.parse(savedState);
        const loadedContent = state.content;
        setCurrentContent(loadedContent);
        setCounter(state.counter || 0);
        setIsCompleted(state.isCompleted || false);

        // تحميل العداد اليومي
        if (loadedContent.isInteractive) {
          const counterKey = `${COUNTER_KEY_PREFIX}${loadedContent.id}_${today}`;
          const savedCounter = await AsyncStorage.getItem(counterKey);
          if (savedCounter) {
            setCounter(parseInt(savedCounter, 10));
          }
        }
      } else {
        // إذا لم تكن هناك حالة محفوظة، استخدم الكارد اليومي
        const dailyContent = getDailySpiritualContent();
        setCurrentContent(dailyContent);
        setCounter(0);
        setIsCompleted(false);
      }
    } catch (error) {
      console.error('Error loading spiritual card state:', error);
      // في حالة الخطأ، استخدم الكارد اليومي
      const dailyContent = getDailySpiritualContent();
      setCurrentContent(dailyContent);
      setCounter(0);
      setIsCompleted(false);
    }
  };

  const saveState = async () => {
    try {
      const today = new Date().toDateString();
      const state = {
        content: currentContent,
        counter,
        isCompleted,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      await AsyncStorage.setItem(`${STORAGE_KEY}_date`, today);

      // حفظ العداد اليومي
      if (currentContent.isInteractive) {
        const counterKey = `${COUNTER_KEY_PREFIX}${currentContent.id}_${today}`;
        await AsyncStorage.setItem(counterKey, counter.toString());
      }
    } catch (error) {
      console.error('Error saving spiritual card state:', error);
    }
  };

  const handleIncrement = () => {
    if (!currentContent.isInteractive || !currentContent.targetCount) return;
    if (counter >= currentContent.targetCount) return;

    const newCounter = counter + 1;
    setCounter(newCounter);

    // تأثير بصرية للكارد والنص
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // تأثير glow عند الاقتراب من الهدف
    if (newCounter >= currentContent.targetCount - 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  };

  const handleNext = async () => {
    const nextContent = getNextSpiritualContent(currentContent.id);
    setCurrentContent(nextContent);
    setCounter(0);
    setIsCompleted(false);
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    
    // حفظ الكارد الجديد
    const today = new Date().toDateString();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ content: nextContent, counter: 0, isCompleted: false }));
    await AsyncStorage.setItem(`${STORAGE_KEY}_date`, today);
  };

  const getCardColor = () => {
    switch (currentContent.type) {
      case 'tasbeeh':
        return { primary: '#10B981', secondary: 'rgba(16, 185, 129, 0.2)' };
      case 'istighfar':
        return { primary: '#3B82F6', secondary: 'rgba(59, 130, 246, 0.2)' };
      case 'exam_dua':
        return { primary: '#D4AF37', secondary: 'rgba(212, 175, 55, 0.2)' };
      case 'witr_prayer':
        return { primary: '#8B5CF6', secondary: 'rgba(139, 92, 246, 0.2)' };
      case 'dhikr':
        return { primary: '#EF4444', secondary: 'rgba(239, 68, 68, 0.2)' };
      default:
        return { primary: '#D4AF37', secondary: 'rgba(212, 175, 55, 0.2)' };
    }
  };

  const colors = getCardColor();
  const progress = currentContent.targetCount ? counter / currentContent.targetCount : 0;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              borderColor: colors.primary + '40',
              backgroundColor: 'rgba(18, 38, 57, 0.6)',
            },
          ]}
        >
        {/* Glow Effect */}
        {isCompleted && (
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: colors.primary + '30',
                opacity: glowAnim,
              },
            ]}
          />
        )}

        {/* Header */}
        <View style={[styles.header, { flexDirection }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
            {currentContent.type === 'tasbeeh' && <Text style={styles.iconEmoji}>✨</Text>}
            {currentContent.type === 'istighfar' && <Text style={styles.iconEmoji}>❤️</Text>}
            {currentContent.type === 'exam_dua' && <Text style={styles.iconEmoji}>📚</Text>}
            {currentContent.type === 'witr_prayer' && <Text style={styles.iconEmoji}>🕌</Text>}
            {currentContent.type === 'dhikr' && <Text style={styles.iconEmoji}>⭐</Text>}
          </View>
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <MaterialIcons name="navigate-next" size={20} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.primary, textAlign }]}>{currentContent.title}</Text>

        {/* Content */}
        {currentContent.isInteractive ? (
          <View style={styles.interactiveContent}>
            <Text style={[styles.contentText, { textAlign }]}>{currentContent.content}</Text>
            
            {/* Counter */}
            <View style={styles.counterContainer}>
              <Text style={[styles.counterText, { textAlign }]}>
                {counter} / {currentContent.targetCount}
              </Text>
              {progress > 0 && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* Action Button */}
            {!isCompleted ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleIncrement}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, { textAlign }]}>
                  {currentContent.type === 'tasbeeh' ? 'سبحان الله وبحمده' : 'أستغفر الله وأتوب إليه'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.completedBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary, flexDirection }]}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={[styles.completedText, { color: colors.primary }]}>تم بنجاح! 🎉</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.staticContent}>
            {currentContent.duaText ? (
              <Text style={[styles.duaText, { textAlign }]}>{currentContent.duaText}</Text>
            ) : (
              <Text style={[styles.contentText, { textAlign }]}>{currentContent.content}</Text>
            )}
          </View>
        )}

        {/* Benefit */}
        {currentContent.benefit && (
          <View style={[styles.benefitContainer, { flexDirection }]}>
            <MaterialIcons name="info-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={[styles.benefitText, { textAlign }]}>{currentContent.benefit}</Text>
          </View>
        )}

        {/* Additional Info for Witr Prayer */}
        {currentContent.type === 'witr_prayer' && (
          <View style={styles.additionalInfo}>
            <Text style={[styles.additionalInfoText, { textAlign }]}>
              <Text style={styles.boldText}>الوقت:</Text> بعد صلاة العشاء حتى طلوع الفجر{'\n'}
              <Text style={styles.boldText}>الأقل:</Text> ركعة واحدة{'\n'}
              <Text style={styles.boldText}>الأفضل:</Text> إحدى عشرة ركعة
            </Text>
          </View>
        )}

        {/* Source */}
        <View style={styles.sourceContainer}>
          <Text style={[styles.sourceText, { textAlign }]}>
            مصدر: {currentContent.source}
            {currentContent.sourceNumber && ` ${currentContent.sourceNumber}`}
          </Text>
        </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  nextButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  interactiveContent: {
    alignItems: 'center',
    gap: 16,
  },
  staticContent: {
    marginBottom: 16,
  },
  contentText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
  },
  duaText: {
    fontSize: 17,
    color: '#D4AF37',
    lineHeight: 28,
    fontWeight: '600',
    marginBottom: 12,
  },
  counterContainer: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  counterText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 200,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  completedBadge: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  benefitContainer: {
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  sourceContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  sourceText: {
    fontSize: 11,
    color: '#64748B',
  },
  additionalInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  additionalInfoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: '#D4AF37',
  },
});

