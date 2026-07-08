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
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useCreateNotice } from './hooks/useNotices';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { CreateNoticeRequest } from '../../api/endpoints/notices';

const CATEGORIES: { label: string; value: CreateNoticeRequest['category'] }[] = [
  { label: 'General', value: 'General' },
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Event', value: 'Event' },
  { label: 'Emergency', value: 'Emergency' },
  { label: 'Financial', value: 'Financial' },
  { label: 'Bylaw', value: 'Bylaw' },
];

export function NoticeCreateScreen() {
  const navigation = useNavigation();
  const societyId = useSocietyId();
  const { mutateAsync: createNotice, isPending } = useCreateNotice(societyId);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CreateNoticeRequest['category']>('General');
  const [content, setContent] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function handleSubmit(): Promise<void> {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation', 'Title and content are required.');
      return;
    }
    try {
      await createNotice({
        title: title.trim(),
        category,
        content: content.trim(),
        publishAt: publishAt.trim() || undefined,
        expiresAt: expiresAt.trim() || undefined,
      });
      Alert.alert('Success', 'Notice posted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Post Notice" showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Notice title"
          placeholderTextColor={colors.text.disabled}
          returnKeyType="next"
        />

        <Text style={styles.label}>Category *</Text>
        <SearchableSelect
          options={CATEGORIES}
          value={category}
          onChange={(v) => setCategory(v as CreateNoticeRequest['category'])}
          placeholder="Select category"
        />

        <Text style={styles.label}>Content *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={content}
          onChangeText={setContent}
          placeholder="Notice details..."
          placeholderTextColor={colors.text.disabled}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Publish Date (optional)</Text>
        <TextInput
          style={styles.input}
          value={publishAt}
          onChangeText={setPublishAt}
          placeholder="YYYY-MM-DDTHH:MM (leave blank = now)"
          placeholderTextColor={colors.text.disabled}
        />

        <Text style={styles.label}>Expiry Date (optional)</Text>
        <TextInput
          style={styles.input}
          value={expiresAt}
          onChangeText={setExpiresAt}
          placeholder="YYYY-MM-DDTHH:MM"
          placeholderTextColor={colors.text.disabled}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => void handleSubmit()}
          disabled={isPending}
        >
          <Text style={styles.submitButtonText}>Post Notice</Text>
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
  multiline: { minHeight: 140, textAlignVertical: 'top' },
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
