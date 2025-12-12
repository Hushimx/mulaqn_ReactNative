/**
 * Run this script to force the app to Arabic/RTL mode
 * 
 * In your terminal, run:
 * node force-rtl.js
 * 
 * Then completely close and reopen the app
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

async function forceArabicRTL() {
  try {
    console.log('🔧 Forcing Arabic/RTL mode...');
    
    // Clear the language storage
    await AsyncStorage.removeItem('@app/language');
    console.log('✅ Cleared language storage');
    
    // Set to Arabic
    await AsyncStorage.setItem('@app/language', 'ar');
    console.log('✅ Set language to Arabic');
    
    console.log('\n✨ Done! Now:');
    console.log('1. Close the app COMPLETELY (swipe away from recent apps)');
    console.log('2. Reopen the app');
    console.log('3. You should see a "Restart Required" screen');
    console.log('4. Close and reopen again');
    console.log('5. App should now be in RTL mode! 🎉');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

forceArabicRTL();


