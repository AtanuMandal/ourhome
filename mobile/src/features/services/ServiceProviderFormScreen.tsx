import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { servicesApi } from '../../api/endpoints/services';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const SERVICE_TYPES = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Cleaner', 'AC_Repair', 'Other'];

export function ServiceProviderFormScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const societyId = useSocietyId();

  const [providerName, setProviderName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  function toggleType(type: string): void {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  const register = useMutation({
    mutationFn: () =>
      servicesApi.registerProvider({
        providerName: providerName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        serviceTypes: selectedTypes,
        description: description.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-providers', societyId] });
      Alert.alert('Provider registered', `${providerName.trim()} has been added to the directory.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => Alert.alert('Could not register provider', normalizeError(e)),
  });

  const isValid = providerName.trim().length > 0 && contactName.trim().length > 0
    && phone.trim().length > 0 && selectedTypes.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Register Provider" showBack />
      <LoadingOverlay visible={register.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Provider / company name</Text>
        <TextInput style={styles.input} value={providerName} onChangeText={setProviderName} placeholder="CleanSphere Services" />

        <Text style={styles.label}>Contact person</Text>
        <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Contact name" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Service types</Text>
        <View style={styles.typeWrap}>
          {SERVICE_TYPES.map((type) => {
            const selected = selectedTypes.includes(type);
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => toggleType(type)}
              >
                <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>{type.replace('_', ' ')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Services offered…"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          disabled={!isValid || register.isPending}
          onPress={() => register.mutate()}
        >
          <Text style={styles.submitBtnText}>Register Provider</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  typeChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  typeChipTextSelected: { color: '#FFF' },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
