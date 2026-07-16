import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { profileApi } from '../../api/endpoints/profile';
import type { ResidentApartmentInfo } from '../../api/types';

/**
 * Multi-apartment support: the signed-in user's apartment memberships (from the full user
 * record — the login payload doesn't carry them), the currently selected apartment, and the
 * resident type held on it. Feature gating (e.g. tenants not seeing society-wide financials)
 * must use `activeResidentType`, which follows the apartment selected in the drawer.
 */
export function useActiveApartment(): {
  apartments: ResidentApartmentInfo[];
  activeApartmentId: string | null;
  activeResidentType: string | undefined;
  setSelectedApartment: (apartmentId: string) => void;
} {
  const user = useAuthStore((s) => s.user);
  const selectedApartmentId = useAuthStore((s) => s.selectedApartmentId);
  const setSelectedApartment = useAuthStore((s) => s.setSelectedApartment);

  // Same query key as features/profile/hooks/useProfile — shares the cache entry.
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.societyId ?? '', user?.id ?? ''],
    queryFn: () => profileApi.getProfile(user?.societyId ?? '', user?.id ?? ''),
    enabled: !!user?.societyId && !!user?.id,
  });

  const apartments = profile?.apartments ?? user?.apartments ?? [];

  const activeApartmentId =
    (selectedApartmentId && apartments.some((a) => a.apartmentId === selectedApartmentId)
      ? selectedApartmentId
      : null) ??
    user?.apartmentId ??
    apartments[0]?.apartmentId ??
    null;

  const activeResidentType =
    apartments.find((a) => a.apartmentId === activeApartmentId)?.residentType ??
    user?.residentType;

  return { apartments, activeApartmentId, activeResidentType, setSelectedApartment };
}
