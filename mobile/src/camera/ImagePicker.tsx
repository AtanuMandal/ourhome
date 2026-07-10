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

/** A picked file's local uri plus the name/mimeType a multipart upload needs to preserve. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

/** Same photo picker as pickImage, but also returns the filename/mime type a multipart upload
 *  needs (e.g. maintenance payment proof, which also accepts non-image documents). */
export async function pickImageFile(): Promise<PickedFile | null> {
  const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ExpoImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}
