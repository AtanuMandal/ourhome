export type ApartmentStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface Apartment {
  id: string;
  societyId: string;
  unitNumber: string;
  floor: number;
  block?: string;
  type: string;
  area?: number;
  status: ApartmentStatus;
  residents?: ApartmentResident[];
  monthlyFee?: number;
  createdAt: string;
}

export interface ApartmentResident {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  isOwner: boolean;
}

export interface CreateApartmentDto {
  unitNumber: string;
  floor: number;
  block?: string;
  type: string;
  area?: number;
  status?: ApartmentStatus;
  monthlyFee?: number;
}

export interface UpdateApartmentDto extends Partial<CreateApartmentDto> {}
