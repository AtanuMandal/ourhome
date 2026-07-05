import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../api/types';

export function useRequireRole(...allowed: UserRole[]): void {
  const role = useAuthStore((s) => s.user?.role);
  if (role && !allowed.includes(role)) {
    throw new Error(`Role ${role} is not authorised for this screen.`);
  }
}
