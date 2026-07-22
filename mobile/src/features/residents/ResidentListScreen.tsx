import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import {
  useResidentList,
  useDeleteResident,
  useSetResidentActive,
  usePendingJoinRequests,
  useRespondToJoinRequest,
  useShareInviteLink,
} from './hooks/useResidents';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { User } from '../../api/types';

const ROLE_ORDER = ['SUAdmin', 'HQAdmin', 'HQUser', 'SUSecurity', 'SUUser'];
const ROLE_LABELS: Record<string, string> = {
  SUAdmin: 'Society Admins',
  HQAdmin: 'HQ Admins',
  HQUser: 'HQ Viewers',
  SUSecurity: 'Security',
  SUUser: 'Residents',
};

type ResidentsNav = NativeStackNavigationProp<{
  ResidentList: undefined;
  ResidentForm: { id?: string };
}>;

export function ResidentListScreen() {
  const navigation = useNavigation<ResidentsNav>();
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useResidentList(societyId, debouncedSearch ? { search: debouncedSearch } : undefined);
  const deleteResident = useDeleteResident(societyId);
  const setActive = useSetResidentActive(societyId);
  const { data: joinRequests } = usePendingJoinRequests(societyId, isAdmin);
  const respondToJoin = useRespondToJoinRequest(societyId);
  const shareInvite = useShareInviteLink(societyId);

  function handleSendInvite(): void {
    const email = inviteEmail.trim();
    if (!/\S+@\S+\.\S+/.test(email)) return;
    shareInvite.mutate({ email }, {
      onSuccess: () => {
        setInviteEmail('');
        setShowInvite(false);
        Alert.alert('Invite sent', `An invitation was emailed to ${email}.`);
      },
      onError: (e) => Alert.alert('Could not send invite', normalizeError(e)),
    });
  }

  const sections = useMemo(() => {
    const byRole = new Map<string, User[]>();
    for (const user of data) {
      const list = byRole.get(user.rl) ?? [];
      list.push(user);
      byRole.set(user.rl, list);
    }
    const roles = [...byRole.keys()].sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a);
      const ib = ROLE_ORDER.indexOf(b);
      return (ia === -1 ? ROLE_ORDER.length : ia) - (ib === -1 ? ROLE_ORDER.length : ib);
    });
    return roles.map((r) => ({ title: ROLE_LABELS[r] ?? r, data: byRole.get(r) ?? [] }));
  }, [data]);

  const handleDelete = useCallback((user: User): void => {
    Alert.alert('Delete user', `Delete ${user.fn}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteResident.mutate(user.id, {
            onError: (e) => Alert.alert('Could not delete user', normalizeError(e)),
          });
        },
      },
    ]);
  }, [deleteResident]);

  const renderItem = useCallback(({ item }: { item: User }) => {
    return (
      <View style={styles.item}>
        <View style={styles.avatarWrap}>
          <UserAvatar name={item.fn} pictureUrl={item.pic} size={44} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.name}>{item.fn}</Text>
          <Text style={styles.meta}>{item.rt} · {item.ph}</Text>
          {(item.apts && item.apts.length > 0) && (
            <Text style={styles.apartment}>
              {item.apts.map((a) => a.nm).join(', ')}
            </Text>
          )}
        </View>
        <StatusChip status={item.ac ? 'Active' : 'Inactive'} />
        {isAdmin && (
          <>
            <TouchableOpacity
              style={styles.deleteButton}
              accessibilityLabel={item.ac ? `Deactivate ${item.fn}` : `Activate ${item.fn}`}
              onPress={() => setActive.mutate(
                { id: item.id, active: !item.ac },
                { onError: (e) => Alert.alert('Could not update user', normalizeError(e)) }
              )}
              disabled={setActive.isPending}
            >
              <Text style={styles.deleteButtonText}>{item.ac ? '⏸' : '▶️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              disabled={deleteResident.isPending}
            >
              <Text style={styles.deleteButtonText}>🗑</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }, [isAdmin, handleDelete, deleteResident.isPending, setActive]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Residents" showMenu />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search residents..."
          placeholderTextColor={colors.text.disabled}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isAdmin && (
        <View style={styles.adminBar}>
          <TouchableOpacity style={styles.inviteToggle} onPress={() => setShowInvite((v) => !v)}>
            <Text style={styles.inviteToggleText}>{showInvite ? 'Hide invite' : '✉ Send invite link'}</Text>
          </TouchableOpacity>
          {showInvite && (
            <View style={styles.inviteRow}>
              <TextInput
                style={styles.inviteInput}
                placeholder="person@example.com"
                placeholderTextColor={colors.text.disabled}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.inviteBtn, (!/\S+@\S+\.\S+/.test(inviteEmail.trim()) || shareInvite.isPending) && styles.inviteBtnDisabled]}
                disabled={!/\S+@\S+\.\S+/.test(inviteEmail.trim()) || shareInvite.isPending}
                onPress={handleSendInvite}
              >
                <Text style={styles.inviteBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {isAdmin && (joinRequests ?? []).length > 0 && (
        <View style={styles.joinBox}>
          <Text style={styles.joinTitle}>Apartment join requests</Text>
          {(joinRequests ?? []).map((u) => (
            <View key={u.id} style={styles.joinRow}>
              <View style={styles.joinInfo}>
                <Text style={styles.joinName}>{u.fn}</Text>
                <Text style={styles.joinMeta}>{u.prt ?? 'Resident'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.joinBtn, styles.joinApprove]}
                onPress={() => respondToJoin.mutate(
                  { userId: u.id, approve: true },
                  { onError: (e) => Alert.alert('Could not approve', normalizeError(e)) }
                )}
              >
                <Text style={styles.joinBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinBtn, styles.joinDeny]}
                onPress={() => respondToJoin.mutate(
                  { userId: u.id, approve: false },
                  { onError: (e) => Alert.alert('Could not deny', normalizeError(e)) }
                )}
              >
                <Text style={styles.joinBtnText}>Deny</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title} ({section.data.length})</Text>
          </View>
        )}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="👥" title="No residents found" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          accessibilityLabel="Add user"
          onPress={() => navigation.navigate('ResidentForm', {})}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { padding: spacing.sm, backgroundColor: colors.surface },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  avatarWrap: { marginRight: spacing.sm },
  itemInfo: { flex: 1 },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  apartment: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  deleteButtonText: { fontSize: typography.fontSize.lg },
  adminBar: { backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  inviteToggle: { paddingVertical: spacing.xs },
  inviteToggleText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  inviteRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', paddingBottom: spacing.xs },
  inviteInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  inviteBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  inviteBtnDisabled: { opacity: 0.5 },
  inviteBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  joinBox: {
    backgroundColor: 'rgba(25, 118, 210, 0.06)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.sm,
  },
  joinTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  joinInfo: { flex: 1 },
  joinName: { fontSize: typography.fontSize.sm, color: colors.text.primary, fontWeight: typography.fontWeight.semibold },
  joinMeta: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  joinBtn: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  joinApprove: { backgroundColor: '#059669' },
  joinDeny: { backgroundColor: colors.error },
  joinBtnText: { color: '#FFF', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
});
