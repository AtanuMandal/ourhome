export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  totalApartments: number;
  amenities?: string[];
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSocietyDto {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  totalApartments: number;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateSocietyDto extends Partial<CreateSocietyDto> {}
