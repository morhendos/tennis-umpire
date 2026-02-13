const skipFlic2 = process.env.SKIP_FLIC2 === '1';

if (skipFlic2) {
  console.log('⚠️  SKIP_FLIC2=1 → Flic2 excluded from autolinking (simulator build)');
}

export default {
  expo: {
    name: "Tennis Umpire",
    slug: "tennis-umpire",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "tennis-umpire",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tomasz.tennisumpire",
      infoPlist: {
        NSBluetoothAlwaysUsageDescription: "Tennis Umpire uses Bluetooth to connect to Flic buttons for score tracking",
        NSBluetoothPeripheralUsageDescription: "Tennis Umpire uses Bluetooth to connect to Flic buttons for score tracking",
        NSLocationWhenInUseUsageDescription: "Tennis Umpire needs location access to scan for Bluetooth devices",
        UIBackgroundModes: ["audio", "bluetooth-central"],
      },
    },
    android: {
      package: "com.tomasz.tennisumpire",
      adaptiveIcon: {
        backgroundColor: "#050a08",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "./plugins/withBluetoothScanLocation",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#050a08",
          dark: {
            backgroundColor: "#050a08",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    ...(skipFlic2 ? {
      autolinking: {
        exclude: ['react-native-flic2'],
      },
    } : {}),
    extra: {
      eas: {
        projectId: "db7b715b-433f-44f5-a2a8-ac58fcb09780",
      },
      router: {},
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
      googleTtsApiKey: process.env.GOOGLE_TTS_API_KEY || "",
    },
  },
};
