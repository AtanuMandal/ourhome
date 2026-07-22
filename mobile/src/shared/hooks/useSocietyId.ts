import { useAuthStore } from '../../store/authStore';

export function useSocietyId(): string {
  return useAuthStore((s) => s.user?.sid ?? '');
}
