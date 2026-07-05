import * as ImagePicker from 'expo-image-picker';

interface UseImagePickerReturn {
  pickFromGallery: () => Promise<string | null>;
  pickFromCamera: () => Promise<string | null>;
}

export function useImagePicker(): UseImagePickerReturn {
  async function pickFromGallery(): Promise<string | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }

  async function pickFromCamera(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }

  return { pickFromGallery, pickFromCamera };
}
