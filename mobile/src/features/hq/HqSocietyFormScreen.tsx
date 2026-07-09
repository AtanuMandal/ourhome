import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCreateSociety } from './hooks/useHq';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function HqSocietyFormScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { mutateAsync: createSociety, isPending } = useCreateSociety();

  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [totalBlocks, setTotalBlocks] = useState('1');
  const [totalApartments, setTotalApartments] = useState('1');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  async function handleCreate(): Promise<void> {
    if (!name.trim() || !street.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim()) {
      Alert.alert('Validation', 'Society name and full address are required.');
      return;
    }
    if (!contactEmail.trim() || !contactPhone.trim()) {
      Alert.alert('Validation', 'Contact email and phone are required.');
      return;
    }
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPhone.trim()) {
      Alert.alert('Validation', 'The first society admin’s name, email, and phone are required.');
      return;
    }

    try {
      await createSociety({
        name: name.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        totalBlocks: Number(totalBlocks) || 1,
        totalApartments: Number(totalApartments) || 1,
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail.trim(),
        adminPhone: adminPhone.trim(),
      });
      Alert.alert('Society Created', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Could not create society', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Add Society" showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Society Name *</Text>
        <TextInput testID="input-name" style={styles.input} value={name} onChangeText={setName} placeholder="Green Valley Residency" placeholderTextColor={colors.text.disabled} />

        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.label}>Street *</Text>
        <TextInput testID="input-street" style={styles.input} value={street} onChangeText={setStreet} placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>City *</Text>
        <TextInput testID="input-city" style={styles.input} value={city} onChangeText={setCity} placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>State *</Text>
        <TextInput testID="input-state" style={styles.input} value={state} onChangeText={setState} placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Postal Code *</Text>
        <TextInput testID="input-postalCode" style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Country *</Text>
        <TextInput testID="input-country" style={styles.input} value={country} onChangeText={setCountry} placeholderTextColor={colors.text.disabled} />

        <Text style={styles.sectionTitle}>Contact &amp; Size</Text>
        <Text style={styles.label}>Contact Email *</Text>
        <TextInput testID="input-contactEmail" style={styles.input} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Contact Phone *</Text>
        <TextInput testID="input-contactPhone" style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Total Blocks</Text>
        <TextInput testID="input-totalBlocks" style={styles.input} value={totalBlocks} onChangeText={setTotalBlocks} keyboardType="numeric" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Total Apartments</Text>
        <TextInput testID="input-totalApartments" style={styles.input} value={totalApartments} onChangeText={setTotalApartments} keyboardType="numeric" placeholderTextColor={colors.text.disabled} />

        <Text style={styles.sectionTitle}>First Society Admin</Text>
        <Text style={styles.sectionCopy}>This account is created together with the society and can sign in after OTP verification.</Text>
        <Text style={styles.label}>Admin Full Name *</Text>
        <TextInput testID="input-adminFullName" style={styles.input} value={adminFullName} onChangeText={setAdminFullName} placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Admin Email *</Text>
        <TextInput testID="input-adminEmail" style={styles.input} value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Admin Phone *</Text>
        <TextInput testID="input-adminPhone" style={styles.input} value={adminPhone} onChangeText={setAdminPhone} keyboardType="phone-pad" placeholderTextColor={colors.text.disabled} />

        <TouchableOpacity style={styles.createButton} onPress={() => void handleCreate()} disabled={isPending}>
          <Text style={styles.createButtonText}>Create Society</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary, marginBottom: 4, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: typography.fontSize.base, color: colors.text.primary, backgroundColor: colors.surface },
  sectionTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginTop: spacing.lg },
  sectionCopy: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 4 },
  createButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  createButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
