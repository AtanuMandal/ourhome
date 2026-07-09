import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useCreatePoll, useSocietyBlockNames } from './hooks/usePolls';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { PollAnonymity, PollEligibilityUnit, PollTargetAudience, PollType, PollVisibility } from '../../api/types';

function OptionRow<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.optionRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.optionChip, value === o.value && styles.optionChipSelected]}
          onPress={() => onChange(o.value)}
        >
          <Text style={value === o.value ? styles.optionTextSelected : styles.optionText}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface PollFormScreenProps {
  route?: { params?: { agmSessionId?: string } };
}

export function PollFormScreen({ route }: PollFormScreenProps = {}) {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const { mutateAsync: createPoll, isPending } = useCreatePoll(societyId);
  const { data: blockOptions = [] } = useSocietyBlockNames(societyId);
  const agmSessionId = route?.params?.agmSessionId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PollType>('SingleChoice');
  const [optionsText, setOptionsText] = useState('Yes\nNo');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [targetAudience, setTargetAudience] = useState<PollTargetAudience>('FullSociety');
  const [targetBlockNames, setTargetBlockNames] = useState<string[]>([]);
  const [eligibilityUnit, setEligibilityUnit] = useState<PollEligibilityUnit>('PerResident');
  const [anonymity, setAnonymity] = useState<PollAnonymity>('Anonymous');
  const [visibility, setVisibility] = useState<PollVisibility>('Immediately');
  const [quorumThresholdPercent, setQuorumThresholdPercent] = useState('');
  const [isAgmResolution, setIsAgmResolution] = useState(!!agmSessionId);
  const [allowVoteChange, setAllowVoteChange] = useState(true);

  function toggleBlock(block: string): void {
    setTargetBlockNames((prev) => (prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block]));
  }

  function targetBlockError(): string | null {
    if (targetAudience === 'PerBlock' && targetBlockNames.length !== 1) return 'Select exactly one block.';
    if (targetAudience === 'MultipleBlock' && targetBlockNames.length < 1) return 'Select at least one block.';
    return null;
  }

  async function handleCreate(): Promise<void> {
    const options = optionsText.split('\n').map((o) => o.trim()).filter((o) => o.length > 0);
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    if (options.length < 2) {
      Alert.alert('Validation', 'At least 2 options are required.');
      return;
    }
    if (!opensAt.trim() || !closesAt.trim()) {
      Alert.alert('Validation', 'Opens At and Closes At are required.');
      return;
    }
    const blockError = targetBlockError();
    if (blockError) {
      Alert.alert('Validation', blockError);
      return;
    }

    try {
      await createPoll({
        title: title.trim(),
        description: description.trim(),
        type,
        options,
        opensAt: new Date(opensAt).toISOString(),
        closesAt: new Date(closesAt).toISOString(),
        targetAudience,
        targetBlockNames: targetAudience === 'FullSociety' ? undefined : targetBlockNames,
        eligibilityUnit,
        anonymity,
        visibility,
        quorumThresholdPercent: quorumThresholdPercent ? Number(quorumThresholdPercent) : undefined,
        isAgmResolution,
        allowVoteChange,
        agmSessionId,
      });
      Alert.alert('Poll Created', undefined, [{
        text: 'OK',
        onPress: () => (agmSessionId ? navigation.replace('AgmSessionDetail', { id: agmSessionId }) : navigation.goBack()),
      }]);
    } catch (e) {
      Alert.alert('Could not create poll', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Create Poll" showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Repaint the gate?" placeholderTextColor={colors.text.disabled} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholderTextColor={colors.text.disabled} />

        <Text style={styles.label}>Poll Type</Text>
        <OptionRow
          value={type}
          onChange={setType}
          options={[{ value: 'SingleChoice', label: 'Single Choice' }, { value: 'MultipleChoice', label: 'Multiple Choice' }]}
        />

        <Text style={styles.label}>Options (one per line, at least 2) *</Text>
        <TextInput style={[styles.input, styles.multiline]} value={optionsText} onChangeText={setOptionsText} multiline placeholderTextColor={colors.text.disabled} />

        <Text style={styles.label}>Opens At *</Text>
        <TextInput style={styles.input} value={opensAt} onChangeText={setOpensAt} placeholder="2026-07-10T09:00" placeholderTextColor={colors.text.disabled} autoCapitalize="none" />

        <Text style={styles.label}>Closes At *</Text>
        <TextInput style={styles.input} value={closesAt} onChangeText={setClosesAt} placeholder="2026-07-17T09:00" placeholderTextColor={colors.text.disabled} autoCapitalize="none" />

        <Text style={styles.label}>Target Audience</Text>
        <OptionRow
          value={targetAudience}
          onChange={setTargetAudience}
          options={[
            { value: 'FullSociety', label: 'Full Society' },
            { value: 'PerBlock', label: 'Per Block' },
            { value: 'MultipleBlock', label: 'Multiple Blocks' },
          ]}
        />

        {targetAudience !== 'FullSociety' && (
          <>
            <Text style={styles.label}>{targetAudience === 'PerBlock' ? 'Block' : 'Blocks'}</Text>
            <View style={styles.optionRow}>
              {blockOptions.map((b: string) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.optionChip, targetBlockNames.includes(b) && styles.optionChipSelected]}
                  onPress={() => toggleBlock(b)}
                >
                  <Text style={targetBlockNames.includes(b) ? styles.optionTextSelected : styles.optionText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {targetBlockError() && <Text style={styles.errorText}>{targetBlockError()}</Text>}
          </>
        )}

        <Text style={styles.label}>Eligibility</Text>
        <OptionRow
          value={eligibilityUnit}
          onChange={setEligibilityUnit}
          options={[{ value: 'PerApartment', label: 'Per Apartment' }, { value: 'PerResident', label: 'Per Resident' }]}
        />

        <Text style={styles.label}>Anonymity</Text>
        <OptionRow
          value={anonymity}
          onChange={setAnonymity}
          options={[{ value: 'Anonymous', label: 'Anonymous' }, { value: 'Identified', label: 'Identified' }]}
        />

        <Text style={styles.label}>Results Visibility</Text>
        <OptionRow
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'Immediately', label: 'Immediately' },
            { value: 'AfterClose', label: 'After Close' },
            { value: 'AdminOnly', label: 'Admin Only' },
          ]}
        />

        <Text style={styles.label}>Quorum Threshold % (optional)</Text>
        <TextInput style={styles.input} value={quorumThresholdPercent} onChangeText={setQuorumThresholdPercent} keyboardType="numeric" placeholder="e.g. 50" placeholderTextColor={colors.text.disabled} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>AGM Resolution</Text>
          <Switch value={isAgmResolution} onValueChange={setIsAgmResolution} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Allow residents to change their vote</Text>
          <Switch value={allowVoteChange} onValueChange={setAllowVoteChange} />
        </View>

        <TouchableOpacity style={styles.createButton} onPress={() => void handleCreate()} disabled={isPending}>
          <Text style={styles.createButtonText}>Create Poll</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary, marginBottom: 4, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: typography.fontSize.base, color: colors.text.primary, backgroundColor: colors.surface },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  optionChipSelected: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  optionText: { color: colors.text.primary, fontSize: typography.fontSize.sm },
  optionTextSelected: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  errorText: { color: colors.error, fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  createButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  createButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
