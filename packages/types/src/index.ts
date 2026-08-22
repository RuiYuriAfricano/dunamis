export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export enum Role {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
}

export enum MaritalStatus {
  SINGLE = "SINGLE",
  MARRIED = "MARRIED",
}

export enum OwnTransportType {
  INDIVIDUAL = "INDIVIDUAL",
  TAXI = "TAXI",
}

export interface TransportStopSummary {
  id: string;
  name: string;
}

export interface TentTypeSummary {
  id: string;
  name: string;
  price: number;
}

export interface ParticipantSummary {
  id: string;
  registrationNumber: string;
  fullName: string;
  gender: Gender;
  birthDate: string;
  church: string;
  phone: string;
  whatsapp: string;
  email: string;
  isMemberTibl: boolean;
  baptized: boolean;
  allergicTo: string;
  firstTime: boolean;
  maritalStatus: MaritalStatus | null;
  bringingChildren: boolean;
  numberOfChildren: number;
  transportRequired: boolean;
  transportStop: TransportStopSummary | null;
  ownTransportType: OwnTransportType | null;
  carSeats: number | null;
  carRouteStops: string | null;
  tentRequired: boolean;
  mattressRequired: boolean;
  tentsCanProvide: number;
  mattressesCanProvide: number;
  wantsToBuyTent: boolean;
  tentPurchaseType: TentTypeSummary | null;
  tentPurchaseQuantity: number;
  isSponsored: boolean;
  paymentAmount: number;
  paymentProofPath: string | null;
  paymentStatus: PaymentStatus;
  paymentReviewedAt: string | null;
  paymentReviewedBy: { name: string } | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  belongings: string | null;
  registeredByAdmin: { name: string } | null;
  createdAt: string;
}

export interface ParticipantConfirmation {
  id: string;
  registrationNumber: string;
  fullName: string;
  church: string;
  transportStop: TransportStopSummary | null;
  tentRequired: boolean;
  mattressRequired: boolean;
  isSponsored: boolean;
  paymentAmount: number;
  paymentProofPath: string | null;
  paymentStatus: PaymentStatus;
  qrCodeDataUrl: string;
}

export interface TransportStopStat {
  stopName: string;
  total: number;
}

export interface AgeGroupStat {
  ageGroup: string;
  total: number;
}

export interface RegistrationDayStat {
  date: string;
  total: number;
}

export interface DashboardStats {
  totalParticipants: number;
  totalMale: number;
  totalFemale: number;
  totalFirstTime: number;
  totalReturning: number;
  totalTransportRequired: number;
  totalTentRequired: number;
  totalMattressRequired: number;
  totalCheckedIn: number;
  totalRevenueKz: number;
  myValidations: number;
  myRejections: number;
  byTransportStop: TransportStopStat[];
  byAgeGroup: AgeGroupStat[];
  byRegistrationDay: RegistrationDayStat[];
}

export interface CheckInLookupResult {
  participantId: string;
  registrationNumber: string;
  fullName: string;
  church: string;
  gender: Gender;
  transportStop: TransportStopSummary | null;
  tentRequired: boolean;
  mattressRequired: boolean;
  checkedIn: boolean;
  checkedInAt: string | null;
  checkedInByName: string | null;
  belongings: string | null;
}
