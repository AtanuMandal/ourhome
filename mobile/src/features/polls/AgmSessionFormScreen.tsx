import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useCreateAgmSession } from './hooks/useAgmSessions';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function AgmSessionFormScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const { mutateAsync: createSession, isPending } = useCreateAgmSession(societyId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionDate, setSessionDate] = useState('');

  async function handleCreate(): Promise<void> {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    if (!sessionDate.trim()) {
      Alert.alert('Validation', 'Session date is required.');
      return;
    }

    try {
      const session = await createSession({
        title: title.trim(),
        description: description.trim(),
        sessionDate: new Date(sessionDate).toISOString(),
      });
      navigation.replace('AgmSessionDetail', { id: session.id });
    } catch (e) {
      Alert.alert('Could not create session', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="New AGM Session" showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="AGM 2026" placeholderTextColor={colors.text.disabled} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholderTextColor={colors.text.disabled} />

        <Text style={styles.label}>Session Date *</Text>
        <TextInput style={styles.input} value={sessionDate} onChangeText={setSessionDate} placeholder="2026-04-15T10:00" placeholderTextColor={colors.text.disabled} autoCapitalize="none" />

        <TouchableOpacity style={styles.createButton} onPress={() => void handleCreate()} disabled={isPending}>
          <Text style={styles.createButtonText}>Create Session</Text>
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
  createButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  createButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
