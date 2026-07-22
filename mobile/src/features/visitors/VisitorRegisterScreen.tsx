import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import { useRegisterVisitor } from './hooks/useVisitors';
import { useApartmentList } from '../apartments/hooks/useApartments';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { AutocompleteTextInput } from '../../shared/components/AutocompleteTextInput';
import { ImageZoomModal } from '../../shared/components/ImageZoomModal';
import { useCamera } from '../../camera/useCamera';
import { useImagePicker } from '../../camera/useImagePicker';
import { resolveFileUrl } from '../../camera/imageUpload';
import { useVisitorLookups } from './hooks/useVisitors';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatApartmentLabel } from '../../shared/utils/apartment';

const VALIDITY_OPTIONS = [
  { label: 'No expiry', value: '' },
  { label: '1 hour', value: '1' },
  { label: '2 hours', value: '2' },
  { label: '4 hours', value: '4' },
  { label: '8 hours', value: '8' },
  { label: '12 hours', value: '12' },
  { label: '24 hours', value: '24' },
  { label: '48 hours', value: '48' },
  { label: '72 hours', value: '72' },
];

type VisitorsNav = NativeStackNavigationProp<{
  VisitorList: undefined;
  VisitorRegister: undefined;
  VisitorDetail: { id: string };
}>;

export function VisitorRegisterScreen() {
  const navigation = useNavigation<VisitorsNav>();
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  // Multi-apartment aware: the account-level apartmentId may be absent — follow the
  // apartment selected in the drawer (falls back to the primary apartment).
  const { activeApartmentId } = useActiveApartment();
  const myApartmentId = activeApartmentId ?? '';
  const canSelectApartment = role === 'SUAdmin' || role === 'SUSecurity';

  const { mutateAsync: registerVisitor, isPending } = useRegisterVisitor(societyId);
  const { upload, isUploading } = useCamera();
  const { pickFromGallery, pickFromCamera } = useImagePicker();
  // Only fetch apartment list for admin/security who need to select a unit
  const { data: apartments } = useApartmentList(canSelectApartment ? societyId : '');
  const { data: lookups } = useVisitorLookups(societyId);

  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [validityHours, setValidityHours] = useState('');
  const [selectedApartmentId, setSelectedApartmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoZoomVisible, setPhotoZoomVisible] = useState(false);

  const apartmentOptions = (apartments ?? []).map((a) => ({
    label: formatApartmentLabel(a.blk, a.flr, a.num),
    value: a.id,
  }));

  const effectiveApartmentId = canSelectApartment ? selectedApartmentId : myApartmentId;

  async function handlePickPhoto(): Promise<void> {
    const pick = async (fromCamera: boolean) => {
      const uri = fromCamera ? await pickFromCamera() : await pickFromGallery();
      if (!uri) return;
      try {
        const url = await upload(uri, societyId);
        if (url) setPhotoUrl(url);
      } catch (e) {
        Alert.alert('Upload failed', normalizeError(e));
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) void pick(true);
          if (idx === 2) void pick(false);
        }
      );
    } else {
      Alert.alert('Add Photo', 'Choose source', [
        { text: 'Camera', onPress: () => void pick(true) },
        { text: 'Gallery', onPress: () => void pick(false) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!visitorName.trim() || !visitorPhone.trim() || !purpose.trim()) {
      Alert.alert('Validation', 'Name, phone and purpose are required.');
      return;
    }
    if (canSelectApartment && !selectedApartmentId) {
      Alert.alert('Validation', 'Please select the host apartment.');
      return;
    }
    if (!effectiveApartmentId) {
      Alert.alert('Error', 'Apartment not found. Please contact admin.');
      return;
    }
    // Same flow as the web app: a resident registering a visitor for their own
    // apartment pre-approves the pass (no separate approval step); admin/security
    // registrations stay Pending until the host resident approves. Validity hours
    // only apply to pre-approved passes.
    const isPreApproved = !canSelectApartment;
    try {
      const created = await registerVisitor({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        visitorEmail: visitorEmail.trim() || undefined,
        companyName: companyName.trim() || undefined,
        purpose: purpose.trim(),
        vehicleNumber: vehicleNumber.trim() || undefined,
        isPreApproved,
        validityHours: isPreApproved && validityHours ? Number(validityHours) : undefined,
        apartmentId: effectiveApartmentId,
        visitorImageUrl: photoUrl,
      });
      setVisitorName(''); setVisitorPhone(''); setVisitorEmail('');
      setCompanyName(''); setPurpose(''); setVehicleNumber('');
      setValidityHours(''); setSelectedApartmentId(''); setPhotoUrl(undefined);
      // Land on the pass screen (QR + share), exactly like the web post-register view.
      navigation.replace('VisitorDetail', { id: created.id });
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Register Visitor" showBack />
      <LoadingOverlay visible={isPending || isUploading} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {photoUrl != null && (
          <TouchableOpacity onPress={() => setPhotoZoomVisible(true)} accessibilityLabel="View visitor photo">
            <Image source={{ uri: resolveFileUrl(photoUrl) }} style={styles.photo} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.photoButton} onPress={() => void handlePickPhoto()}>
          <Text style={styles.photoButtonText}>
            {photoUrl != null ? 'Change Photo' : 'Add Visitor Photo'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={visitorName} onChangeText={setVisitorName}
          placeholder="Visitor's full name" placeholderTextColor={colors.text.disabled} returnKeyType="next" />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput style={styles.input} value={visitorPhone} onChangeText={setVisitorPhone}
          placeholder="10-digit mobile number" placeholderTextColor={colors.text.disabled} keyboardType="phone-pad" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={visitorEmail} onChangeText={setVisitorEmail}
          placeholder="visitor@email.com (optional)" placeholderTextColor={colors.text.disabled}
          keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Company / Organization</Text>
        <AutocompleteTextInput style={styles.input} value={companyName} onChangeText={setCompanyName}
          suggestions={lookups?.companies ?? []}
          placeholder="Company name (optional)" />

        <Text style={styles.label}>Purpose of Visit *</Text>
        <AutocompleteTextInput style={[styles.input, styles.multiline]} value={purpose} onChangeText={setPurpose}
          suggestions={lookups?.purposes ?? []}
          placeholder="e.g. Delivery, Guest, Plumber..." multiline numberOfLines={3} />

        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber}
          placeholder="Vehicle registration (optional)" placeholderTextColor={colors.text.disabled}
          autoCapitalize="characters" />

        <Text style={styles.label}>Pass Validity</Text>
        <SearchableSelect options={VALIDITY_OPTIONS} value={validityHours}
          onChange={setValidityHours} placeholder="No expiry" />

        {canSelectApartment && (
          <>
            <Text style={styles.label}>Host Apartment *</Text>
            <SearchableSelect options={apartmentOptions} value={selectedApartmentId}
              onChange={setSelectedApartmentId} placeholder="Select apartment" />
          </>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={() => void handleSubmit()} disabled={isPending}>
          <Text style={styles.submitButtonText}>Register Visitor</Text>
        </TouchableOpacity>
      </ScrollView>

      {photoUrl != null && (
        <ImageZoomModal
          visible={photoZoomVisible}
          uri={resolveFileUrl(photoUrl)}
          onClose={() => setPhotoZoomVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  photo: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: spacing.sm },
  photoButton: { alignSelf: 'center', marginBottom: spacing.md, padding: spacing.sm },
  photoButtonText: { color: colors.primary, fontWeight: typography.fontWeight.medium },
  label: {
    fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary, marginBottom: 4, marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: spacing.sm, fontSize: typography.fontSize.base,
    color: colors.text.primary, backgroundColor: colors.surface,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: colors.primary, borderRadius: 8,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.lg,
  },
  submitButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
