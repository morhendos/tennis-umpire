// Conditional autolinking for device-only native modules.
// Usage:
//   SKIP_FLIC2=1 npx expo run:ios    → simulator (no Flic2)
//   npx expo run:ios --device         → real device (with Flic2)
//
// Flic2 uses Bluetooth and its iOS framework is compiled for
// real devices only — it cannot link against the iOS simulator.

const skipFlic2 = process.env.SKIP_FLIC2 === '1';

if (skipFlic2) {
  console.log('⚠️  SKIP_FLIC2=1 → Flic2 will not be linked (simulator build)');
}

module.exports = {
  dependencies: {
    ...(skipFlic2
      ? {
          'react-native-flic2': {
            platforms: {
              ios: null, // Skip iOS autolinking
            },
          },
        }
      : {}),
  },
};
