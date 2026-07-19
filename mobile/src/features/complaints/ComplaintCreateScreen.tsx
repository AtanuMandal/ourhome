import React, { useState } from 'react';
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
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import { useAuthStore } from '../../store/authStore';
import { useCreateComplaint } from './hooks/useComplaints';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// Must match backend ComplaintCategory enum — unknown values fail deserialization (400).
const CATEGORIES = [
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Security', value: 'Security' },
  { label: 'Noise', value: 'Noise' },
  { label: 'Cleanliness', value: 'Cleanliness' },
  { label: 'Infrastructure', value: 'Infrastructure' },
  { label: 'General', value: 'General' },
];

const PRIORITIES = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical', value: 'Critical' },
];

export function ComplaintCreateScreen() {
  const societyId = useSocietyId();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  // Multi-apartment aware: the account-level apartmentId may be absent — follow the
  // apartment selected in the drawer (falls back to the primary apartment).
  const { activeApartmentId } = useActiveApartment();
  const { mutateAsync: createComplaint, isPending } = useCreateComplaint(societyId);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Low');
  const [description, setDescription] = useState('');

  async function handleSubmit(): Promise<void> {
    if (!title.trim() || !category || !description.trim()) {
      Alert.alert('Validation', 'Title, category and description are required.');
      return;
    }
    if (!activeApartmentId) {
      Alert.alert('Error', 'No apartment is linked to your profile. Please contact your society admin.');
      return;
    }
    try {
      await createComplaint({
        title: title.trim(),
        category,
        priority,
        description: description.trim(),
        apartmentId: activeApartmentId,
        userId,
      });
      Alert.alert('Success', 'Complaint submitted successfully.');
      setTitle('');
      setCategory('');
      setPriority('Low');
      setDescription('');
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="New Complaint" showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief title of the issue"
          placeholderTextColor={colors.text.disabled}
          returnKeyType="next"
        />

        <Text style={styles.label}>Category *</Text>
        <SearchableSelect
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
          placeholder="Select a category"
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.chips}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.chip, priority === p.value && styles.chipSelected]}
              onPress={() => setPriority(p.value as typeof priority)}
            >
              <Text style={[styles.chipText, priority === p.value && styles.chipTextSelected]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue in detail..."
          placeholderTextColor={colors.text.disabled}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => void handleSubmit()}
          disabled={isPending}
        >
          <Text style={styles.submitButtonText}>Submit Complaint</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: 4,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  chipTextSelected: { color: '#FFF', fontWeight: typography.fontWeight.medium },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
