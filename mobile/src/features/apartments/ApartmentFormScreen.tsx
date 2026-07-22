import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { apartmentsApi } from '../../api/endpoints/apartments';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

/** SUAdmin create/edit apartment. Block/floor/number identify it; the rest are attributes. */
export function ApartmentFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: string; params?: { id?: string } }>();
  const queryClient = useQueryClient();
  const societyId = useSocietyId();
  const apartmentId = route.params?.id;
  const isEditMode = !!apartmentId;

  const { data: existing, isLoading } = useQuery({
    queryKey: ['apartment', societyId, apartmentId],
    queryFn: () => apartmentsApi.getApartment(societyId, apartmentId!),
    enabled: !!societyId && isEditMode,
  });

  const [apartmentNumber, setApartmentNumber] = useState('');
  const [blockName, setBlockName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState('2');
  const [parkingSlots, setParkingSlots] = useState('');
  const [carpetArea, setCarpetArea] = useState('0');
  const [buildUpArea, setBuildUpArea] = useState('0');
  const [superBuildArea, setSuperBuildArea] = useState('0');

  useEffect(() => {
    if (existing) {
      setApartmentNumber(existing.num);
      setBlockName(existing.blk);
      setFloorNumber(String(existing.flr));
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const shared = {
        blockName: blockName.trim(),
        floorNumber: Number(floorNumber) || 0,
        numberOfRooms: Number(numberOfRooms) || 1,
        parkingSlots: parkingSlots.split(',').map((s) => s.trim()).filter(Boolean),
        carpetArea: Number(carpetArea) || 0,
        buildUpArea: Number(buildUpArea) || 0,
        superBuildArea: Number(superBuildArea) || 0,
      };
      return isEditMode
        ? apartmentsApi.updateApartment(societyId, apartmentId!, shared)
        : apartmentsApi.createApartment(societyId, { apartmentNumber: apartmentNumber.trim(), ...shared });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['apartments'] });
      void queryClient.invalidateQueries({ queryKey: ['apartment', societyId] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(isEditMode ? 'Could not update apartment' : 'Could not create apartment', normalizeError(e)),
  });

  const isValid = apartmentNumber.trim().length > 0 && blockName.trim().length > 0 && floorNumber.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title={isEditMode ? 'Edit Apartment' : 'Add Apartment'} showBack />
      <LoadingOverlay visible={isLoading || save.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Apartment number</Text>
        <TextInput style={styles.input} value={apartmentNumber} onChangeText={setApartmentNumber} editable={!isEditMode} placeholder="101" />

        <Text style={styles.label}>Block</Text>
        <TextInput style={styles.input} value={blockName} onChangeText={setBlockName} placeholder="A" autoCapitalize="characters" />

        <Text style={styles.label}>Floor</Text>
        <TextInput style={styles.input} value={floorNumber} onChangeText={setFloorNumber} keyboardType="number-pad" placeholder="1" />

        <Text style={styles.label}>Rooms</Text>
        <TextInput style={styles.input} value={numberOfRooms} onChangeText={setNumberOfRooms} keyboardType="number-pad" />

        <Text style={styles.label}>Parking slots (comma-separated)</Text>
        <TextInput style={styles.input} value={parkingSlots} onChangeText={setParkingSlots} placeholder="P1, P2" autoCapitalize="characters" />

        <Text style={styles.label}>Carpet area (sq ft)</Text>
        <TextInput style={styles.input} value={carpetArea} onChangeText={setCarpetArea} keyboardType="number-pad" />

        <Text style={styles.label}>Built-up area (sq ft)</Text>
        <TextInput style={styles.input} value={buildUpArea} onChangeText={setBuildUpArea} keyboardType="number-pad" />

        <Text style={styles.label}>Super built-up area (sq ft)</Text>
        <TextInput style={styles.input} value={superBuildArea} onChangeText={setSuperBuildArea} keyboardType="number-pad" />

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          disabled={!isValid || save.isPending}
          onPress={() => save.mutate()}
        >
          <Text style={styles.submitBtnText}>{isEditMode ? 'Save Changes' : 'Create Apartment'}</Text>
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
