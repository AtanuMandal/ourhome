import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useProfile, useUpdateProfile, useChangePassword } from './hooks/useProfile';
import { PageHeader } from '../../shared/components/PageHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { useAuth } from '../../auth/useAuth';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function ProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const societyId = storeUser?.societyId ?? '';
  const userId = storeUser?.id ?? '';

  const { data: profile } = useProfile(societyId, userId);
  const { mutateAsync: updateProfile, isPending: isUpdating } =
    useUpdateProfile(societyId, userId);
  const { mutateAsync: changePassword, isPending: isChanging } =
    useChangePassword(societyId, userId);

  const [phone, setPhone] = useState(storeUser?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const displayUser = profile ?? storeUser;

  async function handleUpdateProfile(): Promise<void> {
    try {
      await updateProfile({ phone });
      Alert.alert('Success', 'Profile updated.');
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  async function handleChangePassword(): Promise<void> {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation', 'Both password fields are required.');
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Password changed.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title="Profile" />
      <LoadingOverlay visible={isUpdating || isChanging} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayUser?.fullName?.charAt(0) ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{displayUser?.fullName}</Text>
        <Text style={styles.email}>{displayUser?.email}</Text>
        <Text style={styles.role}>{displayUser?.role}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={colors.text.disabled}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => void handleUpdateProfile()}
          >
            <Text style={styles.buttonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={colors.text.disabled}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={colors.text.disabled}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => void handleChangePassword()}
          >
            <Text style={styles.buttonText}>Update Password</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => void logout()}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: '#FFF', fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold },
  name: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  email: { fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginTop: 2 },
  role: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontWeight: typography.fontWeight.medium },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.error, fontWeight: typography.fontWeight.semibold },
});
