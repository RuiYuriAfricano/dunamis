export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE"
}
export declare enum Role {
    ADMIN = "ADMIN",
    OPERATOR = "OPERATOR"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    REJECTED = "REJECTED"
}
export declare enum MaritalStatus {
    SINGLE = "SINGLE",
    MARRIED = "MARRIED"
}
export declare enum OwnTransportType {
    INDIVIDUAL = "INDIVIDUAL",
    TAXI = "TAXI"
}
export declare enum OccupationStatus {
    STUDENT = "STUDENT",
    WORKER = "WORKER"
}
export interface TransportStopSummary {
    id: string;
    name: string;
}
export interface TentTypeSummary {
    id: string;
    name: string;
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
    occupationStatus: OccupationStatus;
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
    wantsToBuyMattress: boolean;
    mattressPurchaseQuantity: number;
    isSponsored: boolean;
    paidInHand: boolean | null;
    paymentAmount: number;
    paymentProofPath: string | null;
    paymentStatus: PaymentStatus;
    paymentReviewedAt: string | null;
    paymentReviewedBy: {
        name: string;
    } | null;
    paymentRejectionReason: string | null;
    checkedIn: boolean;
    checkedInAt: string | null;
    belongings: string | null;
    registeredByAdmin: {
        name: string;
    } | null;
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
    totalWorkers: number;
    totalBaptized: number;
    totalRevenueKz: number;
    totalPeopleBuyingTent: number;
    totalPeopleBuyingMattress: number;
    myValidations: number;
    myRejections: number;
    myManualRegistrations: number;
    myDeletions: number;
    myCheckIns: number;
    byTransportStop: TransportStopStat[];
    byAgeGroup: AgeGroupStat[];
    byRegistrationDay: RegistrationDayStat[];
}
export interface EventSettingsSummary {
    registrationDeadline: string;
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
