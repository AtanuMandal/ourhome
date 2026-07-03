import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { linking } from './linking';
import { OfflineBanner } from '../shared/components/OfflineBanner';
import { View, StyleSheet } from 'react-native';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <NavigationContainer linking={linking}>
        {isAuthenticated ? <AppTabs /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
