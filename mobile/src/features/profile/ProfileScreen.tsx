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
import { useProfile, useUpdateProfile, useChangePassword, useUploadProfilePicture } from './hooks/useProfile';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { useImagePicker } from '../../camera/useImagePicker';
import { useAuth } from '../../auth/useAuth';
import { normalizeError } from '../../shared/utils/errors';
import { validatePassword } from '../../shared/utils/password';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function ProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const societyId = storeUser?.sid ?? '';
  const userId = storeUser?.id ?? '';

  const { data: profile } = useProfile(societyId, userId);
  const { mutateAsync: updateProfile, isPending: isUpdating } =
    useUpdateProfile(societyId, userId);
  const { mutateAsync: changePassword, isPending: isChanging } =
    useChangePassword(societyId, userId);
  const { mutateAsync: uploadPicture, isPending: isUploadingPicture } =
    useUploadProfilePicture(societyId, userId);
  const { pickFromGallery, pickFromCamera } = useImagePicker();

  const displayUser = profile ?? storeUser;

  const [fullName, setFullName] = useState(displayUser?.fn ?? '');
  const [phone, setPhone] = useState(storeUser?.ph ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleUpdateProfile(): Promise<void> {
    if (!fullName.trim()) {
      Alert.alert('Validation', 'Full name is required.');
      return;
    }
    const phoneVal = phone.trim();
    if (phoneVal && !/^\d{10}$/.test(phoneVal)) {
      Alert.alert('Validation', 'Phone must be a 10-digit number.');
      return;
    }
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phoneVal || undefined });
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
    const passwordError = validatePassword(newPassword, confirmPassword);
    if (passwordError) {
      Alert.alert('Validation', passwordError);
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Password changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  // The picker's built-in editor (allowsEditing + square aspect) gives the WhatsApp-style
  // pick-the-area crop before upload.
  function handleChangePicture(): void {
    Alert.alert('Profile picture', 'Choose a source', [
      { text: 'Camera', onPress: () => void pickAndUpload(pickFromCamera) },
      { text: 'Gallery', onPress: () => void pickAndUpload(pickFromGallery) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickAndUpload(pick: () => Promise<string | null>): Promise<void> {
    const uri = await pick();
    if (!uri) return;
    try {
      await uploadPicture(uri);
      Alert.alert('Success', 'Profile picture updated.');
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="My Profile" showMenu />
      <LoadingOverlay visible={isUpdating || isChanging || isUploadingPicture} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <UserAvatar
            name={displayUser?.fn ?? '?'}
            pictureUrl={(displayUser as { pic?: string } | null)?.pic}
            size={80}
          />
          <TouchableOpacity
            style={styles.avatarEditBadge}
            onPress={handleChangePicture}
            accessibilityLabel="Change profile picture"
          >
            <Text style={styles.avatarEditBadgeText}>📷</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{displayUser?.fn}</Text>
        <Text style={styles.email}>{displayUser?.em}</Text>
        <Text style={styles.role}>{displayUser?.rl}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={colors.text.disabled}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit phone number"
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

        {displayUser?.vf !== false && (
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
              placeholder="New password (min 8 chars)"
              placeholderTextColor={colors.text.disabled}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
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
        )}

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
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadgeText: { fontSize: 14 },
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
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
    marginBottom: 4,
    marginTop: spacing.xs,
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
    marginTop: 2,
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
