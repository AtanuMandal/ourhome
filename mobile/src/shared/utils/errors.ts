import { AxiosError } from 'axios';
import type { ApiError } from '../../api/types';

export function normalizeError(e: unknown): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data as ApiError | undefined;
    if (data?.error) return data.error;
    if (e.message) return e.message;
  }
  if (e instanceof Error) return e.message;
  return 'An unknown error occurred';
}
