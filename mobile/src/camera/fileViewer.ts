import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getToken } from '../auth/tokenStore';
import { resolveFileUrl } from './imageUpload';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
}

/**
 * Downloads a non-image proof/document (PDF/Word/Excel) through the authenticated file endpoint
 * and hands it to the OS share sheet, letting the resident open it with whatever viewer app is
 * installed — mobile's equivalent of "open in a new browser tab", since maintenance-proofs is
 * an authenticated-only container and a plain Linking.openURL() can't attach the JWT.
 */
export async function viewRemoteFile(relativeUrl: string, fileName: string): Promise<void> {
  const token = await getToken();
  const localUri = `${FileSystem.cacheDirectory}${sanitizeFileName(fileName)}`;

  const result = await FileSystem.downloadAsync(resolveFileUrl(relativeUrl), localUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Could not download file (status ${result.status})`);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }
}
