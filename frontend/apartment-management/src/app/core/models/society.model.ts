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
  maintenanceOverdueThresholdDays: number;
  status: string;
  adminUserIds: string[];
  societyUsers: SocietyUserAssignment[];
  committees: SocietyCommittee[];
  createdAt: string;
}

export interface SocietyUserAssignment {
  userId: string;
  fullName: string;
  email: string;
  roleTitle: string;
}

export interface SocietyCommittee {
  name: string;
  members: SocietyUserAssignment[];
}

export interface SocietyUserAssignmentInput {
  email: string;
  roleTitle: string;
}

export interface SocietyCommitteeInput {
  name: string;
  members: SocietyUserAssignmentInput[];
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
  maintenanceOverdueThresholdDays?: number;
  societyUsers?: SocietyUserAssignmentInput[];
  committees?: SocietyCommitteeInput[];
}
