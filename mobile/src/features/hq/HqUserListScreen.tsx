import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useHqUsers, useCreateHqUser, useActivateHqUser, useDeactivateHqUser } from './hooks/useHq';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { EmptyState } from '../../shared/components/EmptyState';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { User } from '../../api/types';

export function HqUserListScreen() {
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isHqAdmin = role === 'HQAdmin';

  const { data, isLoading, refetch, isRefetching } = useHqUsers();
  const createHqUser = useCreateHqUser();
  const activateHqUser = useActivateHqUser();
  const deactivateHqUser = useDeactivateHqUser();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newRole, setNewRole] = useState<'HQAdmin' | 'HQUser'>('HQUser');

  function handleCreate(): void {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation', 'Full name, email, and phone are required.');
      return;
    }
    createHqUser.mutate({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), role: newRole }, {
      onSuccess: () => {
        setFullName('');
        setEmail('');
        setPhone('');
        setNewRole('HQUser');
      },
      onError: (e) => Alert.alert('Could not create HQ user', normalizeError(e)),
    });
  }

  function handleActivate(user: User): void {
    activateHqUser.mutate(user.id, { onError: (e) => Alert.alert('Could not enable user', normalizeError(e)) });
  }

  function handleDeactivate(user: User): void {
    deactivateHqUser.mutate(user.id, { onError: (e) => Alert.alert('Could not disable user', normalizeError(e)) });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="HQ Users" />
      <LoadingOverlay visible={isLoading} />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          isHqAdmin ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add HQ User</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={colors.text.disabled} />
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.text.disabled} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={colors.text.disabled} />
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleChip, newRole === 'HQUser' && styles.roleChipSelected]}
                  onPress={() => setNewRole('HQUser')}
                >
                  <Text style={newRole === 'HQUser' ? styles.roleTextSelected : styles.roleText}>HQ User</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleChip, newRole === 'HQAdmin' && styles.roleChipSelected]}
                  onPress={() => setNewRole('HQAdmin')}
                >
                  <Text style={newRole === 'HQAdmin' ? styles.roleTextSelected : styles.roleText}>HQ Admin</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={createHqUser.isPending}>
                <Text style={styles.createBtnText}>Create HQ User</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={!isLoading ? <EmptyState icon="🧑‍💼" title="No HQ users found" /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.meta}>{item.email} · {item.role}</Text>
              </View>
              <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={item.isActive ? styles.badgeTextActive : styles.badgeTextInactive}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            {isHqAdmin && (
              item.isActive ? (
                <TouchableOpacity style={styles.disableBtn} onPress={() => handleDeactivate(item)}>
                  <Text style={styles.disableBtnText}>Disable</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.enableBtn} onPress={() => handleActivate(item)}>
                  <Text style={styles.enableBtnText}>Enable</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  formCard: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border },
  formTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm,
    fontSize: typography.fontSize.base, color: colors.text.primary, backgroundColor: colors.surface },
  roleRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  roleChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  roleChipSelected: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  roleText: { color: colors.text.primary, fontSize: typography.fontSize.sm },
  roleTextSelected: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  createBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  createBtnText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeTextActive: { color: colors.success, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium },
  badgeTextInactive: { color: colors.text.secondary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium },
  enableBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, marginTop: spacing.sm, alignSelf: 'flex-start' },
  enableBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
  disableBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, marginTop: spacing.sm, alignSelf: 'flex-start' },
  disableBtnText: { color: colors.error, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
});
