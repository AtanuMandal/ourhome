export interface Address {
  str: string; // street
  cty: string; // city
  ste: string; // state
  pc: string; // postalCode
  co: string; // country
}

// Matches backend SocietyResponse — field names shortened to match its compressed JSON keys.
export interface Society {
  id: string;
  nm: string; // name
  addr: Address;
  ce?: string; // contactEmail
  cp?: string; // contactPhone
  tb: number; // totalBlocks
  ta: number; // totalApartments
  mot: number; // maintenanceOverdueThresholdDays
  /** Per-apartment user cap — shown on the society page; only HQAdmin can modify. */
  mua: number; // maxUsersPerApartment
  /** Hours a checked-in visitor may stay before showing in red in the visitor list. */
  voh: number; // visitorOverstayThresholdHours
  st: string; // status
  su: SocietyUserAssignment[]; // societyUsers
  cm: SocietyCommittee[]; // committees
  th: string; // themeId
}

export interface SocietyUserAssignment {
  uid: string; // userId
  fn: string; // fullName
  em: string; // email
  rt: string; // roleTitle
}

export interface SocietyCommittee {
  nm: string; // name
  mem: SocietyUserAssignment[]; // members
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
  // Omitted (undefined) means "leave unchanged". HQAdmin-only.
  maxUsersPerApartment?: number;
  visitorOverstayThresholdHours?: number;
}

/** Platform-level occupancy snapshot for HQAdmin/HQUser — no financial data. */
export interface SocietySummaryReport {
  sn: string; // societyName
  st: string; // status
  ta: number; // totalApartments
  oa: number; // occupiedApartments
  va: number; // vacantApartments
  uma: number; // underMaintenanceApartments
  oc: number; // ownerCount
  tc: number; // tenantCount
  tr: number; // totalResidents
}
