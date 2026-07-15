import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '../auth/tokenStore';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://192.168.1.5:7071/api';

async function compressAndUploadTo(uri: string, uploadPath: string): Promise<string> {
  // Resize to max 800px and compress to JPEG 75%
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );

  const token = await getToken();
  const response = await FileSystem.uploadAsync(`${BASE_URL}${uploadPath}`, manipulated.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response.body;
}

export async function compressAndUpload(uri: string, societyId: string): Promise<string> {
  const body = await compressAndUploadTo(uri, `/societies/${societyId}/visitors/images/upload`);
  // Backend returns an app-relative path (e.g. "files/visitor-images/soc-1/abc.jpg") — served
  // through the secure file-proxy endpoint rather than a raw blob/SAS URL.
  return (JSON.parse(body) as { imageUrl: string }).imageUrl;
}

/** Uploads a user profile picture; returns the app-relative file URL stored on the user. */
export async function uploadProfilePicture(uri: string, societyId: string, userId: string): Promise<string> {
  const body = await compressAndUploadTo(uri, `/societies/${societyId}/users/${userId}/profile-picture`);
  return (JSON.parse(body) as { profilePictureUrl: string }).profilePictureUrl;
}

/** Resolves an app-relative file path (as stored on visitor/maintenance/vendor records) to an absolute URL. */
export function resolveFileUrl(relativePath: string): string {
  return `${BASE_URL}/${relativePath}`;
}
