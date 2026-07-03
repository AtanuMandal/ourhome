import * as ExpoImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ExpoImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
