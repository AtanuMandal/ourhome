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
  themeId: string;
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

/** Returned when a society is registered — includes the society and the first admin account created with it. */
export interface CreateSocietyResponse {
  society: Society;
  admin: { id: string; fullName: string; email: string; role: string };
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
  // Omitted (all-undefined) means "leave the address unchanged".
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  // Omitted (undefined) means "leave the theme unchanged".
  themeId?: string;
}

/** Platform-level occupancy snapshot for HQAdmin/HQUser — no financial data. */
export interface SocietySummaryReport {
  societyId: string;
  societyName: string;
  status: string;
  totalApartments: number;
  occupiedApartments: number;
  vacantApartments: number;
  underMaintenanceApartments: number;
  ownerCount: number;
  tenantCount: number;
  totalResidents: number;
}
