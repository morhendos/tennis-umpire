const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Removes the `neverForLocation` flag from BLUETOOTH_SCAN permission.
 * The Flic SDK requires location-aware BLE scanning, so this flag must not be set.
 */
function withBluetoothScanLocation(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] || [];

    for (const perm of permissions) {
      const attrs = perm.$;
      if (
        attrs &&
        attrs['android:name'] === 'android.permission.BLUETOOTH_SCAN' &&
        attrs['android:usesPermissionFlags'] === 'neverForLocation'
      ) {
        delete attrs['android:usesPermissionFlags'];
        console.log('[Plugin] Removed neverForLocation from BLUETOOTH_SCAN');
      }
    }

    return config;
  });
}

module.exports = withBluetoothScanLocation;
