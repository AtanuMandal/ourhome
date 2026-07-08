import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://192.168.1.6:7071/api';

export async function compressAndUpload(uri: string, societyId: string): Promise<string> {
  // Resize to max 800px and compress to JPEG 75%
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );

  const uploadUrl = `${BASE_URL}/societies/${societyId}/visitors/images/upload`;

  const response = await FileSystem.uploadAsync(uploadUrl, manipulated.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  // Backend returns an app-relative path (e.g. "files/visitor-images/soc-1/abc.jpg") — served
  // through the secure file-proxy endpoint rather than a raw blob/SAS URL.
  const body = JSON.parse(response.body) as { imageUrl: string };
  return body.imageUrl;
}

/** Resolves an app-relative file path (as stored on visitor/maintenance/vendor records) to an absolute URL. */
export function resolveFileUrl(relativePath: string): string {
  return `${BASE_URL}/${relativePath}`;
}
