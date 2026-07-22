import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useHqSocieties, useActivateSociety, useDeactivateSociety } from './hooks/useHq';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusChip } from '../../shared/components/StatusChip';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Society } from '../../api/endpoints/society';

export function HqSocietyListScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isHqAdmin = role === 'HQAdmin';

  const { data, isLoading, refetch, isRefetching } = useHqSocieties();
  const activateSociety = useActivateSociety();
  const deactivateSociety = useDeactivateSociety();

  function handleActivate(society: Society): void {
    activateSociety.mutate(society.id, {
      onError: (e) => Alert.alert('Could not enable society', normalizeError(e)),
    });
  }

  function handleDeactivate(society: Society): void {
    deactivateSociety.mutate(society.id, {
      onError: (e) => Alert.alert('Could not disable society', normalizeError(e)),
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Societies" />
      <LoadingOverlay visible={isLoading} />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListEmptyComponent={!isLoading ? <EmptyState icon="🏢" title="No societies found" /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.nm}</Text>
              <StatusChip status={item.st} />
            </View>
            <Text style={styles.meta}>
              {item.addr?.cty ? `${item.addr.cty}, ${item.addr.ste} · ` : ''}{item.ta} apartments
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => navigation.navigate('HqSocietyReport', { id: item.id, name: item.nm })}
              >
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
              {isHqAdmin && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('HqSocietyEdit', { id: item.id, name: item.nm })}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
              {isHqAdmin && (
                item.st === 'Active' ? (
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
          </View>
        )}
      />
      {isHqAdmin && (
        <TouchableOpacity
          style={styles.fab}
          accessibilityLabel="Add society"
          onPress={() => navigation.navigate('HqSocietyForm')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  reportBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  reportBtnText: { color: colors.text.primary, fontSize: typography.fontSize.sm },
  editBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  editBtnText: { color: colors.text.primary, fontSize: typography.fontSize.sm },
  enableBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  enableBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
  disableBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  disableBtnText: { color: colors.error, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
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
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
});
