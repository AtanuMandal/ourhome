import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHqSociety, useUpdateSociety } from './hooks/useHq';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { themes, THEME_LABELS, DEFAULT_THEME_ID, resolveThemeId, type ThemeId } from '../../theme/themes';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const THEME_IDS = Object.keys(themes) as ThemeId[];

interface HqSocietyEditScreenProps {
  route: { params: { id: string; name?: string } };
}

export function HqSocietyEditScreen({ route }: HqSocietyEditScreenProps) {
  const { id } = route.params;
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: society, isLoading } = useHqSociety(id);
  const { mutateAsync: updateSociety, isPending } = useUpdateSociety();

  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [totalApartments, setTotalApartments] = useState('1');
  const [maxUsersPerApartment, setMaxUsersPerApartment] = useState('10');

  useEffect(() => {
    if (!society) return;
    setName(society.nm);
    setStreet(society.addr.str);
    setCity(society.addr.cty);
    setState(society.addr.ste);
    setPostalCode(society.addr.pc);
    setCountry(society.addr.co);
    setContactEmail(society.ce);
    setContactPhone(society.cp);
    setThemeId(resolveThemeId(society.th));
    setTotalApartments(String(society.ta));
    setMaxUsersPerApartment(String(society.mua ?? 10));
  }, [society]);

  async function handleSave(): Promise<void> {
    if (!society) return;
    if (!name.trim() || !street.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim()) {
      Alert.alert('Validation', 'Society name and full address are required.');
      return;
    }
    if (!contactEmail.trim() || !contactPhone.trim()) {
      Alert.alert('Validation', 'Contact email and phone are required.');
      return;
    }
    const apartmentsCount = Number(totalApartments);
    const userCap = Number(maxUsersPerApartment);
    if (!Number.isInteger(apartmentsCount) || apartmentsCount < 1) {
      Alert.alert('Validation', 'Total apartments must be a positive number.');
      return;
    }
    if (!Number.isInteger(userCap) || userCap < 1 || userCap > 100) {
      Alert.alert('Validation', 'User cap per apartment must be between 1 and 100.');
      return;
    }

    try {
      await updateSociety({
        societyId: society.id,
        data: {
          name: name.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          // Fields this screen doesn't edit — pass through unchanged.
          totalBlocks: society.tb,
          maintenanceOverdueThresholdDays: society.mot,
          // HQAdmin-only capacity settings.
          totalApartments: apartmentsCount,
          maxUsersPerApartment: userCap,
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          themeId,
          // societyUsers/committees intentionally omitted — HQ admin never manages the
          // society's governance or admin-user assignment from this screen.
        },
      });
      Alert.alert('Society Updated', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Could not update society', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Edit Society" showBack />
      <LoadingOverlay visible={isLoading || isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionCopy}>
          As HQ Admin you can update this society&apos;s name, address, and contact details. The
          society&apos;s admin account is managed separately and is not changed here.
        </Text>

        <Text style={styles.label}>Society Name *</Text>
        <TextInput testID="input-name" style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.text.disabled} />

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

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.label}>Contact Email *</Text>
        <TextInput testID="input-contactEmail" style={styles.input} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>Contact Phone *</Text>
        <TextInput testID="input-contactPhone" style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor={colors.text.disabled} />

        <Text style={styles.sectionTitle}>Capacity</Text>
        <Text style={styles.sectionCopy}>Only HQ Admin can change the apartment count and the per-apartment user cap.</Text>
        <Text style={styles.label}>Total Apartments *</Text>
        <TextInput testID="input-totalApartments" style={styles.input} value={totalApartments} onChangeText={setTotalApartments} keyboardType="number-pad" placeholderTextColor={colors.text.disabled} />
        <Text style={styles.label}>User cap per apartment *</Text>
        <TextInput testID="input-maxUsersPerApartment" style={styles.input} value={maxUsersPerApartment} onChangeText={setMaxUsersPerApartment} keyboardType="number-pad" placeholderTextColor={colors.text.disabled} />

        <Text style={styles.sectionTitle}>Theme</Text>
        <Text style={styles.sectionCopy}>Pick the color theme this society's members see across the web and mobile app.</Text>
        <View style={styles.themeRow}>
          {THEME_IDS.map((id) => {
            const selected = themeId === id;
            return (
              <TouchableOpacity
                key={id}
                testID={`theme-swatch-${id}`}
                style={styles.themeSwatch}
                accessibilityLabel={THEME_LABELS[id]}
                accessibilityState={{ selected }}
                onPress={() => setThemeId(id)}
              >
                <View style={[styles.themeDot, { backgroundColor: themes[id].primary }, selected && styles.themeDotSelected]}>
                  {selected && <MaterialIcons name="check" size={18} color="#fff" />}
                </View>
                <Text style={styles.themeLabel}>{THEME_LABELS[id]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={() => void handleSave()} disabled={isPending}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
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
  sectionCopy: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.sm },
  saveButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  saveButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  themeSwatch: { alignItems: 'center', gap: 4, width: 76 },
  themeDot: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  themeDotSelected: { borderWidth: 2, borderColor: colors.primary },
  themeLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, textAlign: 'center' },
});
