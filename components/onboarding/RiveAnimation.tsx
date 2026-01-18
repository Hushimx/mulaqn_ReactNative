import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { RiveView, useRiveFile, useRive, type RiveViewRef } from '@rive-app/react-native';

interface RiveAnimationProps {
  src: any; // require('./path.riv')
  stateMachineName?: string; // اسم الـ state machine إذا موجود
  autoPlay?: boolean; // يبدأ تلقائياً
  shouldPlay?: boolean; // trigger خارجي للتحكم
  delay?: number; // تأخير قبل بدء الأنيميشن (بالميلي ثانية)
  style?: ViewStyle;
  onStateChanged?: (stateName: string) => void; // callback عند تغيير الحالة
}

export default function RiveAnimation({
  src,
  stateMachineName,
  autoPlay = true,
  shouldPlay,
  delay = 0,
  style,
  onStateChanged,
}: RiveAnimationProps) {
  const { riveRef, riveViewRef } = useRive();
  const { riveFile, isLoading, error } = useRiveFile(src);
  const [internalAutoPlay, setInternalAutoPlay] = React.useState(false);

  // تحديد إذا كان يجب أن يبدأ الأنيميشن
  const shouldStart = shouldPlay === true || (shouldPlay === undefined && autoPlay);

  // التحكم في autoPlay بناءً على shouldPlay و autoPlay
  useEffect(() => {
    if (!riveFile) {
      return;
    }

    if (shouldStart) {
      // تأخير قبل بدء الأنيميشن
      const timer = setTimeout(() => {
        setInternalAutoPlay(true);
        console.log('RiveAnimation: Setting internalAutoPlay to true', { shouldPlay, autoPlay, delay });
      }, delay);

      return () => {
        clearTimeout(timer);
        // لا نعمل setInternalAutoPlay(false) هنا للحفاظ على الرسم
      };
    }
    // لا نعمل setInternalAutoPlay(false) عند shouldStart=false (نستخدم pause فقط)
  }, [shouldStart, riveFile, delay, shouldPlay, autoPlay]);

  // التحكم اليدوي في التشغيل/الإيقاف
  useEffect(() => {
    if (!riveFile) {
      return;
    }

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 30; // 3 seconds max wait

    const controlAnimation = async () => {
      // محاولة استخدام riveViewRef أولاً، ثم riveRef.current
      let viewRef = riveViewRef;
      if (!viewRef && riveRef.current) {
        viewRef = riveRef.current as any;
      }

      if (!viewRef) {
        // Retry mechanism
        if (retryCount < maxRetries && !cancelled) {
          retryCount++;
          setTimeout(() => {
            if (!cancelled) {
              controlAnimation();
            }
          }, 100);
          return;
        }
        return;
      }

      try {
        if (shouldPlay === false) {
          // إيقاف الأنيميشن إذا كان shouldPlay = false
          if (viewRef && typeof viewRef.pause === 'function') {
            await viewRef.pause();
          }
        }
      } catch (error) {
        console.error('Rive pause error:', error);
      }
    };

    if (shouldPlay === false) {
      controlAnimation();
    }

    return () => {
      cancelled = true;
    };
  }, [shouldPlay, riveFile, riveViewRef, riveRef]);

  if (isLoading || !riveFile) {
    return <View style={[styles.container, style]} />;
  }

  if (error) {
    console.error('Rive file error:', error);
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <RiveView
        ref={riveRef}
        file={riveFile}
        stateMachineName={stateMachineName}
        autoPlay={internalAutoPlay}
        style={styles.animation}
        onError={(error) => {
          console.error('Rive error:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
