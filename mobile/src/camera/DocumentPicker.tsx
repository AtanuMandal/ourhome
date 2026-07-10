import * as ExpoDocumentPicker from 'expo-document-picker';
import type { PickedFile } from './ImagePicker';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/** Lets the resident pick a PDF/Word/Excel file (e.g. a maintenance payment receipt) from device storage. */
export async function pickProofDocument(): Promise<PickedFile | null> {
  const result = await ExpoDocumentPicker.getDocumentAsync({
    type: ALLOWED_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}
