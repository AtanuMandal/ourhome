import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { societyApi, type Society, type SocietyCommittee } from '../../api/endpoints/society';
import { residentsApi } from '../../api/endpoints/residents';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface CommitteeMemberDraft { email: string; roleTitle: string; }
interface CommitteeDraft { name: string; members: CommitteeMemberDraft[]; }

export function CommitteeScreen() {
  const societyId = useSocietyId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [society, setSociety] = useState<Society | null>(null);
  const [users, setUsers] = useState<{ email: string; fullName: string }[]>([]);
  const [committees, setCommittees] = useState<CommitteeDraft[]>([]);

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    Promise.all([
      societyApi.getSociety(societyId),
      residentsApi.getResidents(societyId, { page: 1, pageSize: 500 }),
    ])
      .then(([soc, residents]) => {
        setSociety(soc);
        setCommittees(soc.committees.map((c: SocietyCommittee) => ({
          name: c.name,
          members: c.members.map((m) => ({ email: m.email, roleTitle: m.roleTitle })),
        })));
        setUsers(residents.items.map((u) => ({ email: u.email, fullName: u.fullName })));
      })
      .catch((e) => Alert.alert('Error', normalizeError(e)))
      .finally(() => setLoading(false));
  }, [societyId]);

  const assignedEmails = useMemo(() => {
    const emails = new Set<string>();
    for (const committee of committees) {
      for (const member of committee.members) {
        if (member.email) emails.add(member.email.toLowerCase());
      }
    }
    return emails;
  }, [committees]);

  function optionsForMember(currentEmail: string): { label: string; value: string }[] {
    const current = currentEmail.toLowerCase();
    return users
      .filter((u) => u.email.toLowerCase() === current || !assignedEmails.has(u.email.toLowerCase()))
      .map((u) => ({ value: u.email, label: `${u.fullName} (${u.email})` }));
  }

  function addCommittee(): void {
    setCommittees((prev) => [...prev, { name: '', members: [] }]);
  }

  function removeCommittee(index: number): void {
    setCommittees((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCommitteeName(index: number, name: string): void {
    setCommittees((prev) => prev.map((c, i) => (i === index ? { ...c, name } : c)));
  }

  function addMember(committeeIndex: number): void {
    setCommittees((prev) => prev.map((c, i) =>
      i === committeeIndex ? { ...c, members: [...c.members, { email: '', roleTitle: '' }] } : c
    ));
  }

  function removeMember(committeeIndex: number, memberIndex: number): void {
    setCommittees((prev) => prev.map((c, i) =>
      i === committeeIndex ? { ...c, members: c.members.filter((_, mi) => mi !== memberIndex) } : c
    ));
  }

  function updateMember(committeeIndex: number, memberIndex: number, patch: Partial<CommitteeMemberDraft>): void {
    setCommittees((prev) => prev.map((c, i) =>
      i === committeeIndex
        ? { ...c, members: c.members.map((m, mi) => (mi === memberIndex ? { ...m, ...patch } : m)) }
        : c
    ));
  }

  function handleSave(): void {
    if (!societyId || !society) return;
    setSaving(true);
    societyApi.updateSociety(societyId, {
      name: society.name,
      contactEmail: society.contactEmail,
      contactPhone: society.contactPhone,
      totalBlocks: society.totalBlocks,
      totalApartments: society.totalApartments,
      maintenanceOverdueThresholdDays: society.maintenanceOverdueThresholdDays,
      societyUsers: society.societyUsers.map((u) => ({ email: u.email, roleTitle: u.roleTitle })),
      committees: committees
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          members: c.members.filter((m) => m.email && m.roleTitle.trim()),
        })),
    })
      .then((updated) => {
        setSociety(updated);
        Alert.alert('Saved', 'Committees updated successfully.');
      })
      .catch((e) => Alert.alert('Could not save', normalizeError(e)))
      .finally(() => setSaving(false));
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Society Committee" showMenu />
      <LoadingOverlay visible={loading || saving} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Pick an existing resident for each committee role. A resident can only hold one committee role at a time.
        </Text>

        {committees.map((committee, committeeIndex) => (
          <View key={committeeIndex} style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Committee name"
              placeholderTextColor={colors.text.disabled}
              value={committee.name}
              onChangeText={(v) => updateCommitteeName(committeeIndex, v)}
            />

            {committee.members.map((member, memberIndex) => (
              <View key={memberIndex} style={styles.memberRow}>
                <SearchableSelect
                  options={optionsForMember(member.email)}
                  value={member.email}
                  onChange={(email) => updateMember(committeeIndex, memberIndex, { email })}
                  placeholder="Select resident"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Role title (Chairman, Treasurer...)"
                  placeholderTextColor={colors.text.disabled}
                  value={member.roleTitle}
                  onChangeText={(v) => updateMember(committeeIndex, memberIndex, { roleTitle: v })}
                />
                <TouchableOpacity onPress={() => removeMember(committeeIndex, memberIndex)}>
                  <Text style={styles.removeText}>Remove member</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addMemberBtn} onPress={() => addMember(committeeIndex)}>
              <Text style={styles.addMemberText}>+ Add Member</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => removeCommittee(committeeIndex)}>
              <Text style={styles.removeText}>Remove committee</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addCommittee}>
          <Text style={styles.addButtonText}>+ Add Committee</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>Save Committees</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  hint: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  memberRow: { gap: spacing.xs, marginTop: spacing.xs },
  addMemberBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  addMemberText: { color: colors.primary, fontWeight: typography.fontWeight.medium },
  removeText: { color: colors.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs },
  addButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addButtonText: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontWeight: typography.fontWeight.semibold },
});
