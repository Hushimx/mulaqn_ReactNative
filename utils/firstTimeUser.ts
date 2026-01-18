import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_TIME_KEY = '@mulaqn_first_time_completed';

export async function markFirstTimeCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_TIME_KEY, 'true');
  } catch (error) {
    console.error('Error marking first time as completed:', error);
  }
}

export async function isFirstTime(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FIRST_TIME_KEY);
    return value !== 'true';
  } catch (error) {
    console.error('Error checking first time status:', error);
    return true; // Default to showing onboarding if there's an error
  }
}

/**
 * إعادة تعيين firstTime flag (لأدوات المطور)
 */
export async function resetFirstTime(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FIRST_TIME_KEY);
  } catch (error) {
    console.error('Error resetting first time:', error);
  }
}


