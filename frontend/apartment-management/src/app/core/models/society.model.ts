export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Society {
  id: string;
  name: string;
  address: Address;
  contactEmail?: string;
  contactPhone?: string;
  totalBlocks: number;
  totalApartments: number;
  status: string;
  overdueThresholdDays?: number;
  adminUserIds: string[];
  createdAt: string;
}

export interface UpdateSocietyDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  totalBlocks?: number;
  totalApartments?: number;
  overdueThresholdDays?: number | null;
}


export interface CreateSocietyDto {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  totalBlocks: number;
  totalApartments: number;
  contactEmail?: string;
  contactPhone?: string;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
}

export interface UpdateSocietyDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  totalBlocks?: number;
  totalApartments?: number;
}
