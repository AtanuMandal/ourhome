import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useAuthContext } from '../auth/AuthProvider';
import { AuthStack } from './AuthStack';
import { linking } from './linking';
import { OfflineBanner } from '../shared/components/OfflineBanner';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

// Deferred as a dynamic import (rather than the static import AuthStack keeps) so its module —
// and every screen it pulls in — isn't evaluated until isThemeReady is true. Those screens build
// their styles once, at module-eval time, from the `colors` static export; if AppDrawer loaded
// eagerly (as it did before this change), every one of its screens would permanently freeze on
// the default theme regardless of which theme the logged-in user's society is actually assigned.
const AppDrawer = React.lazy(() =>
  import('./AppDrawer').then((m) => ({ default: m.AppDrawer }))
);

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isThemeReady } = useAuthContext();

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <NavigationContainer linking={linking}>
        {isAuthenticated ? (
          isThemeReady ? (
            <Suspense fallback={<View style={styles.loading}><ActivityIndicator /></View>}>
              <AppDrawer />
            </Suspense>
          ) : (
            <View style={styles.loading}><ActivityIndicator /></View>
          )
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
