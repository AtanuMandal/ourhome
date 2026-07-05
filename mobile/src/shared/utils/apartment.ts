// Mirrors backend Apartment.ToDisplayLabel(): "{Block} {Floor}-{ApartmentNo}"
export function formatApartmentLabel(
  blockName: string | null | undefined,
  floorNumber: number | null | undefined,
  apartmentNumber: string
): string {
  const block = (blockName ?? '').trim();
  const floor = floorNumber ?? 0;
  return block ? `${block} ${floor}-${apartmentNumber}` : `${floor}-${apartmentNumber}`;
}
