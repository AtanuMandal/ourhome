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
import { useCreateComplaint } from './hooks/useComplaints';
import { PageHeader } from '../../shared/components/PageHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const CATEGORIES = [
  { label: 'Plumbing', value: 'Plumbing' },
  { label: 'Electrical', value: 'Electrical' },
  { label: 'Noise', value: 'Noise' },
  { label: 'Cleanliness', value: 'Cleanliness' },
  { label: 'Security', value: 'Security' },
  { label: 'Other', value: 'Other' },
];

export function ComplaintCreateScreen() {
  const societyId = useSocietyId();
  const { mutateAsync: createComplaint, isPending } = useCreateComplaint(societyId);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(): Promise<void> {
    if (!category || !description) {
      Alert.alert('Validation', 'Category and description are required.');
      return;
    }
    try {
      await createComplaint({ category, description });
      Alert.alert('Success', 'Complaint submitted successfully.');
      setCategory('');
      setDescription('');
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title="New Complaint" showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category *</Text>
        <SearchableSelect
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
          placeholder="Select a category"
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue in detail..."
          placeholderTextColor={colors.text.disabled}
          multiline
          numberOfLines={5}
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
