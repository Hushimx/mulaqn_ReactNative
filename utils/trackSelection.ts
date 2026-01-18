import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_TRACK_ID_KEY = '@mulaqn_selected_track_id';

/**
 * حفظ track ID المختار
 */
export async function saveSelectedTrackId(trackId: number): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_TRACK_ID_KEY, trackId.toString());
  } catch (error) {
    console.error('Error saving selected track ID:', error);
  }
}

/**
 * جلب track ID المحفوظ
 */
export async function getSelectedTrackId(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(SELECTED_TRACK_ID_KEY);
    return value ? parseInt(value, 10) : null;
  } catch (error) {
    console.error('Error getting selected track ID:', error);
    return null;
  }
}

/**
 * حذف track ID المحفوظ (بعد التوجيه)
 */
export async function clearSelectedTrackId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SELECTED_TRACK_ID_KEY);
  } catch (error) {
    console.error('Error clearing selected track ID:', error);
  }
}
