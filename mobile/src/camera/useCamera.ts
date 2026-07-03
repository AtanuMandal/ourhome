import { useState } from 'react';
import { compressAndUpload } from './imageUpload';
import { normalizeError } from '../shared/utils/errors';

interface UseCameraReturn {
  isUploading: boolean;
  error: string | null;
  upload: (uri: string, societyId: string) => Promise<string | null>;
}

export function useCamera(): UseCameraReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(uri: string, societyId: string): Promise<string | null> {
    setIsUploading(true);
    setError(null);
    try {
      const url = await compressAndUpload(uri, societyId);
      return url;
    } catch (e) {
      const msg = normalizeError(e);
      setError(msg);
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { isUploading, error, upload };
}
