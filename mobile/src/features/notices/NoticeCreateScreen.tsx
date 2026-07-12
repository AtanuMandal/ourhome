import React, { useEffect, useState } from 'react';
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
import { useCreateNotice, useNotice, useUpdateNotice } from './hooks/useNotices';
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

interface NoticeCreateScreenProps {
  route?: { params?: { id?: string } };
}

export function NoticeCreateScreen({ route }: NoticeCreateScreenProps) {
  const navigation = useNavigation();
  const societyId = useSocietyId();
  const noticeId = route?.params?.id;
  const isEditMode = !!noticeId;

  const { mutateAsync: createNotice, isPending: isCreating } = useCreateNotice(societyId);
  const { data: existingNotice, isLoading: isLoadingNotice } = useNotice(societyId, noticeId ?? '');
  const { mutateAsync: updateNotice, isPending: isUpdating } = useUpdateNotice(societyId, noticeId ?? '');
  const isPending = isCreating || isUpdating || (isEditMode && isLoadingNotice);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CreateNoticeRequest['category']>('General');
  const [content, setContent] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (existingNotice) {
      setTitle(existingNotice.title);
      setCategory(existingNotice.category as CreateNoticeRequest['category']);
      setContent(existingNotice.content);
      setExpiresAt(existingNotice.expiresAt ?? '');
    }
  }, [existingNotice]);

  async function handleSubmit(): Promise<void> {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation', 'Title and content are required.');
      return;
    }
    try {
      if (isEditMode) {
        await updateNotice({
          title: title.trim(),
          content: content.trim(),
          expiresAt: expiresAt.trim() || undefined,
        });
        Alert.alert('Success', 'Notice updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
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
      <AppHeader title={isEditMode ? 'Edit Notice' : 'Post Notice'} showBack />
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

        {!isEditMode && (
          <>
            <Text style={styles.label}>Category *</Text>
            <SearchableSelect
              options={CATEGORIES}
              value={category}
              onChange={(v) => setCategory(v as CreateNoticeRequest['category'])}
              placeholder="Select category"
            />
          </>
        )}

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

        {!isEditMode && (
          <>
            <Text style={styles.label}>Publish Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={publishAt}
              onChangeText={setPublishAt}
              placeholder="YYYY-MM-DDTHH:MM (leave blank = now)"
              placeholderTextColor={colors.text.disabled}
            />
          </>
        )}

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
          <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Post Notice'}</Text>
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
