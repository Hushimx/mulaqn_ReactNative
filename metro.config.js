// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// إضافة دعم ملفات .riv كـ assets
if (!config.resolver.assetExts.includes('riv')) {
  config.resolver.assetExts.push('riv');
}

// إضافة دعم ملفات .riv في sourceExts أيضاً (للـ require)
if (!config.resolver.sourceExts.includes('riv')) {
  config.resolver.sourceExts.push('riv');
}

module.exports = config;

