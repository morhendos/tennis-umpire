import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '@/lib/themeStore';

export default function RootLayout() {
  const { theme } = useThemeStore();
  
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
    </>
  );
}
