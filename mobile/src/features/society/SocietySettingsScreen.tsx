import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { societyApi, type Society } from '../../api/endpoints/society';
import { residentsApi } from '../../api/endpoints/residents';
import { normalizeError } from '../../shared/utils/errors';
import { useImagePicker } from '../../camera/useImagePicker';
import { uploadSocietyLogo, uploadSocietyBackgroundImage, resolveFileUrl } from '../../camera/imageUpload';
import { useThemeStore } from '../../store/themeStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface SocietyUserDraft {
  email: string;
  roleTitle: string;
}

/**
 * SUAdmin society administration — profile, contact, thresholds, and society users.
 * TotalApartments and MaxUsersPerApartment are platform-controlled (HQAdmin-only), so they
 * render read-only here; sending them back unchanged passes the backend's guard.
 */
export function SocietySettingsScreen() {
  const societyId = useSocietyId();
  const { pickFromGallery, pickFromCamera } = useImagePicker();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [society, setSociety] = useState<Society | null>(null);
  const [users, setUsers] = useState<{ email: string; fullName: string }[]>([]);

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [overdueDays, setOverdueDays] = useState('7');
  const [overstayHours, setOverstayHours] = useState('5');
  const [societyUsers, setSocietyUsers] = useState<SocietyUserDraft[]>([]);

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    Promise.all([
      societyApi.getSociety(societyId),
      residentsApi.getResidents(societyId, { page: 1, pageSize: 500 }),
    ])
      .then(([soc, residents]) => {
        setSociety(soc);
        setName(soc.name);
        setContactEmail(soc.contactEmail);
        setContactPhone(soc.contactPhone);
        setStreet(soc.address.street);
        setCity(soc.address.city);
        setState(soc.address.state);
        setPostalCode(soc.address.postalCode);
        setOverdueDays(String(soc.maintenanceOverdueThresholdDays));
        setOverstayHours(String(soc.visitorOverstayThresholdHours));
        setSocietyUsers(soc.societyUsers.map((u) => ({ email: u.email, roleTitle: u.roleTitle })));
        setUsers(residents.items.map((u) => ({ email: u.email, fullName: u.fullName })));
      })
      .catch((e) => Alert.alert('Error', normalizeError(e)))
      .finally(() => setLoading(false));
  }, [societyId]);

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.email, label: `${u.fullName} (${u.email})` })),
    [users]
  );

  const isValid = name.trim().length > 0 && contactEmail.trim().length > 0;

  function updateSocietyUser(index: number, patch: Partial<SocietyUserDraft>): void {
    setSocietyUsers((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  function handleSave(): void {
    if (!societyId || !society || !isValid) return;
    setSaving(true);
    societyApi.updateSociety(societyId, {
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      totalBlocks: society.totalBlocks,
      totalApartments: society.totalApartments,
      maintenanceOverdueThresholdDays: Number(overdueDays) || society.maintenanceOverdueThresholdDays,
      visitorOverstayThresholdHours: Number(overstayHours) || society.visitorOverstayThresholdHours,
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: society.address.country,
      societyUsers: societyUsers.filter((u) => u.email && u.roleTitle.trim()),
      committees: society.committees.map((c) => ({
        name: c.name,
        members: c.members.map((m) => ({ email: m.email, roleTitle: m.roleTitle })),
      })),
    })
      .then((updated) => {
        setSociety(updated);
        Alert.alert('Saved', 'Society settings updated successfully.');
      })
      .catch((e) => Alert.alert('Could not save', normalizeError(e)))
      .finally(() => setSaving(false));
  }

  function pickAndUpload(
    kind: 'logo' | 'background',
    setUploading: (value: boolean) => void
  ): void {
    if (!societyId) return;
    Alert.alert(kind === 'logo' ? 'Update Logo' : 'Update Background Image', 'Choose source', [
      { text: 'Camera', onPress: () => void runUpload(pickFromCamera) },
      { text: 'Gallery', onPress: () => void runUpload(pickFromGallery) },
      { text: 'Cancel', style: 'cancel' },
    ]);

    async function runUpload(pick: () => Promise<string | null>): Promise<void> {
      const uri = await pick();
      if (!uri || !societyId) return;

      setUploading(true);
      try {
        if (kind === 'logo') {
          const logoUrl = await uploadSocietyLogo(uri, societyId);
          setSociety((prev) => (prev ? { ...prev, logoUrl } : prev));
          useThemeStore.setState({ logoUrl: resolveFileUrl(logoUrl) });
        } else {
          const sidenavBackgroundUrl = await uploadSocietyBackgroundImage(uri, societyId);
          setSociety((prev) => (prev ? { ...prev, sidenavBackgroundUrl } : prev));
          useThemeStore.setState({ sidenavBackgroundUrl: resolveFileUrl(sidenavBackgroundUrl) });
        }
      } catch (e) {
        Alert.alert('Upload failed', normalizeError(e));
      } finally {
        setUploading(false);
      }
    }
  }

  function removeImage(kind: 'logo' | 'background', setUploading: (value: boolean) => void): void {
    if (!societyId) return;
    Alert.alert(
      kind === 'logo' ? 'Remove Logo' : 'Remove Background Image',
      'This reverts to the default branding.',
      [
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void runRemove(),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );

    async function runRemove(): Promise<void> {
      if (!societyId) return;
      setUploading(true);
      try {
        if (kind === 'logo') {
          const updated = await societyApi.removeLogo(societyId);
          setSociety((prev) => (prev ? { ...prev, logoUrl: updated.logoUrl } : prev));
          useThemeStore.setState({ logoUrl: null });
        } else {
          const updated = await societyApi.removeBackgroundImage(societyId);
          setSociety((prev) => (prev ? { ...prev, sidenavBackgroundUrl: updated.sidenavBackgroundUrl } : prev));
          useThemeStore.setState({ sidenavBackgroundUrl: null });
        }
      } catch (e) {
        Alert.alert('Remove failed', normalizeError(e));
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Society Settings" showMenu />
      <LoadingOverlay visible={loading || saving} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Branding</Text>
        <Text style={styles.hint}>Shown at the top of every user's drawer, and as the drawer's background (70% opacity). Leave unset to use the default.</Text>
        <View style={styles.brandingRow}>
          <View style={styles.brandingItem}>
            {society?.logoUrl ? (
              <Image source={{ uri: resolveFileUrl(society.logoUrl) }} style={styles.brandingThumb} resizeMode="contain" />
            ) : (
              <View style={[styles.brandingThumb, styles.brandingThumbEmpty]}>
                <Text style={styles.brandingThumbEmptyText}>No logo</Text>
              </View>
            )}
            <Text style={styles.label}>Drawer logo</Text>
            <TouchableOpacity
              style={styles.brandingBtn}
              disabled={uploadingLogo}
              onPress={() => pickAndUpload('logo', setUploadingLogo)}
            >
              <Text style={styles.brandingBtnText}>{uploadingLogo ? 'Uploading…' : society?.logoUrl ? 'Change' : 'Upload'}</Text>
            </TouchableOpacity>
            {society?.logoUrl && (
              <TouchableOpacity
                style={styles.brandingRemoveBtn}
                disabled={uploadingLogo}
                onPress={() => removeImage('logo', setUploadingLogo)}
                accessibilityLabel="Remove logo"
              >
                <Text style={styles.brandingRemoveBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.brandingItem}>
            {society?.sidenavBackgroundUrl ? (
              <Image source={{ uri: resolveFileUrl(society.sidenavBackgroundUrl) }} style={styles.brandingThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.brandingThumb, styles.brandingThumbEmpty]}>
                <Text style={styles.brandingThumbEmptyText}>No background</Text>
              </View>
            )}
            <Text style={styles.label}>Drawer background</Text>
            <TouchableOpacity
              style={styles.brandingBtn}
              disabled={uploadingBackground}
              onPress={() => pickAndUpload('background', setUploadingBackground)}
            >
              <Text style={styles.brandingBtnText}>{uploadingBackground ? 'Uploading…' : society?.sidenavBackgroundUrl ? 'Change' : 'Upload'}</Text>
            </TouchableOpacity>
            {society?.sidenavBackgroundUrl && (
              <TouchableOpacity
                style={styles.brandingRemoveBtn}
                disabled={uploadingBackground}
                onPress={() => removeImage('background', setUploadingBackground)}
                accessibilityLabel="Remove background image"
              >
                <Text style={styles.brandingRemoveBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.section}>Profile</Text>
        <Text style={styles.label}>Society name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Society name" />
        <Text style={styles.label}>Contact email</Text>
        <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Contact phone</Text>
        <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />

        <Text style={styles.section}>Address</Text>
        <Text style={styles.label}>Street</Text>
        <TextInput style={styles.input} value={street} onChangeText={setStreet} />
        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} />
        <Text style={styles.label}>State</Text>
        <TextInput style={styles.input} value={state} onChangeText={setState} />
        <Text style={styles.label}>Postal code</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />

        <Text style={styles.section}>Thresholds</Text>
        <Text style={styles.label}>Maintenance overdue after (days)</Text>
        <TextInput style={styles.input} value={overdueDays} onChangeText={setOverdueDays} keyboardType="number-pad" />
        <Text style={styles.label}>Visitor overstay flag after (hours)</Text>
        <TextInput style={styles.input} value={overstayHours} onChangeText={setOverstayHours} keyboardType="number-pad" />

        {society && (
          <View style={styles.platformBox}>
            <Text style={styles.platformTitle}>Platform-controlled (HQ only)</Text>
            <Text style={styles.platformRow}>Total apartments: {society.totalApartments}</Text>
            <Text style={styles.platformRow}>Max users per apartment: {society.maxUsersPerApartment}</Text>
          </View>
        )}

        <Text style={styles.section}>Society users</Text>
        {societyUsers.map((u, index) => (
          <View key={`${u.email}-${index}`} style={styles.userRow}>
            <View style={styles.userSelect}>
              <SearchableSelect
                options={userOptions}
                value={u.email}
                onChange={(email) => updateSocietyUser(index, { email })}
                placeholder="Select user"
              />
            </View>
            <TextInput
              style={[styles.input, styles.roleInput]}
              value={u.roleTitle}
              onChangeText={(roleTitle) => updateSocietyUser(index, { roleTitle })}
              placeholder="Role title"
            />
            <TouchableOpacity
              onPress={() => setSocietyUsers((prev) => prev.filter((_, i) => i !== index))}
              accessibilityLabel={`Remove society user ${index + 1}`}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={() => setSocietyUsers((prev) => [...prev, { email: '', roleTitle: '' }])}>
          <Text style={styles.addBtnText}>+ Add society user</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isValid || saving}
        >
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  label: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xs },
  hint: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: spacing.xs },
  brandingRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  brandingItem: { flex: 1, alignItems: 'center' },
  brandingThumb: {
    width: 88,
    height: 88,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  brandingThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  brandingThumbEmptyText: { fontSize: typography.fontSize.xs, color: colors.text.disabled, textAlign: 'center', paddingHorizontal: spacing.xs },
  brandingBtn: { marginTop: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  brandingBtnText: { fontSize: typography.fontSize.sm, color: colors.primary, fontWeight: typography.fontWeight.semibold },
  brandingRemoveBtn: { marginTop: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.error },
  brandingRemoveBtnText: { fontSize: typography.fontSize.sm, color: colors.error, fontWeight: typography.fontWeight.semibold },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  platformBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  platformTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing.xs },
  platformRow: { fontSize: typography.fontSize.sm, color: colors.text.primary, marginTop: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  userSelect: { flex: 1 },
  roleInput: { width: 110 },
  removeText: { color: colors.error, fontSize: typography.fontSize.lg, paddingHorizontal: spacing.xs },
  addBtn: { marginTop: spacing.sm },
  addBtnText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
