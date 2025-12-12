import * as Haptics from 'expo-haptics';

/**
 * Haptic Feedback Utility
 * Provides consistent haptic feedback across the app
 */

export const hapticFeedback = {
  /**
   * Light impact - للضغطات الخفيفة على الأزرار
   */
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium impact - للتفاعلات العادية
   */
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Heavy impact - للإجراءات المهمة
   */
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /**
   * Success notification - عند إتمام عملية بنجاح
   */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * Warning notification - عند حدوث تحذير
   */
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /**
   * Error notification - عند حدوث خطأ
   */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /**
   * Selection change - عند تغيير اختيار
   */
  selection: () => {
    Haptics.selectionAsync();
  },
};

export default hapticFeedback;

