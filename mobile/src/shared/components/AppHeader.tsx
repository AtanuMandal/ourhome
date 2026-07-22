import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ColorTokens } from '../../theme/themes';

interface AppHeaderProps {
  title: string;
  showMenu?: boolean;
  showBack?: boolean;
}

// Rendered at the top of every post-login screen, so it reacts to the theme immediately via
// useThemeColors() rather than freezing at cold-start's default (see colors.ts / RootNavigator.tsx).
export function AppHeader({ title, showMenu, showBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const initials =
    (user?.fn ?? 'U')
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.side}>
        {showMenu && (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.iconBtn}
            accessibilityLabel="Open menu"
          >
            <MaterialIcons name="menu" size={26} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.side}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile' as never)}
          style={styles.avatar}
          accessibilityLabel="Profile"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 14,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    side: { width: 48 },
    iconBtn: { padding: 6 },
    title: {
      flex: 1,
      color: colors.onPrimary,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
  });
}
