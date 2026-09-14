import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AGE_GROUPS: { label: string; min: number; max: number }[] = [
  { label: '≤12', min: 0, max: 12 },
  { label: '13-17', min: 13, max: 17 },
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-50', min: 36, max: 50 },
  { label: '51+', min: 51, max: Infinity },
];

// Every aggregate/chart below is scoped to non-deleted participants — a
// soft-deleted registration shouldn't still show up in the dashboard totals.
const NOT_DELETED = { deletedAt: null } satisfies Prisma.ParticipantWhereInput;

function calculateAge(birthDate: Date, now: Date): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(userId: string) {
    const [
      totalParticipants,
      totalMale,
      totalFemale,
      totalFirstTime,
      totalTransportRequired,
      totalTentRequired,
      totalMattressRequired,
      totalCheckedIn,
      totalWorkers,
      totalBaptized,
      totalTaxi,
      totalOwnCar,
      children,
      stops,
      birthDates,
      registrationDates,
      revenue,
      peopleBuyingTent,
      peopleBuyingMattress,
      myValidations,
      myRejections,
      myManualRegistrations,
      myDeletions,
      myCheckIns,
    ] = await Promise.all([
      this.prisma.participant.count({ where: NOT_DELETED }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, gender: 'MALE' } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, gender: 'FEMALE' } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, firstTime: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, transportRequired: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, tentRequired: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, mattressRequired: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, checkedIn: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, occupationStatus: 'WORKER' } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, baptized: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, ownTransportType: 'TAXI' } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, ownTransportType: 'INDIVIDUAL' } }),
      this.prisma.participant.aggregate({
        where: { ...NOT_DELETED, bringingChildren: true },
        _sum: { numberOfChildren: true },
      }),
      this.prisma.transportStop.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: {
          name: true,
          _count: { select: { participants: { where: NOT_DELETED } } },
        },
      }),
      this.prisma.participant.findMany({ where: NOT_DELETED, select: { birthDate: true } }),
      this.prisma.participant.findMany({ where: NOT_DELETED, select: { createdAt: true } }),
      this.prisma.participant.aggregate({
        where: { ...NOT_DELETED, paymentStatus: 'CONFIRMED' },
        _sum: { paymentAmount: true },
      }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, wantsToBuyTent: true } }),
      this.prisma.participant.count({ where: { ...NOT_DELETED, wantsToBuyMattress: true } }),
      this.prisma.participant.count({
        where: { paymentReviewedById: userId, paymentStatus: 'CONFIRMED' },
      }),
      this.prisma.participant.count({
        where: { paymentReviewedById: userId, paymentStatus: 'REJECTED' },
      }),
      this.prisma.participant.count({
        where: { registeredByAdminId: userId },
      }),
      this.prisma.participant.count({
        where: { deletedByAdminId: userId },
      }),
      this.prisma.participant.count({
        where: { checkedInById: userId },
      }),
    ]);

    const now = new Date();
    const ageCounts = new Map(AGE_GROUPS.map((group) => [group.label, 0]));
    for (const { birthDate } of birthDates) {
      const age = calculateAge(birthDate, now);
      const group = AGE_GROUPS.find((g) => age >= g.min && age <= g.max);
      if (group)
        ageCounts.set(group.label, (ageCounts.get(group.label) ?? 0) + 1);
    }

    // Bucketed by day in Africa/Luanda (UTC+1, no DST) so the peaks/dips line
    // up with when people actually registered, not the UTC storage offset.
    const dayCounts = new Map<string, number>();
    for (const { createdAt } of registrationDates) {
      const localDate = new Date(createdAt.getTime() + 60 * 60 * 1000);
      const key = localDate.toISOString().slice(0, 10);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
    const byRegistrationDay = Array.from(dayCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));

    return {
      totalParticipants,
      totalMale,
      totalFemale,
      totalFirstTime,
      totalReturning: totalParticipants - totalFirstTime,
      totalTransportRequired,
      totalTentRequired,
      totalMattressRequired,
      totalCheckedIn,
      totalWorkers,
      totalBaptized,
      totalTaxi,
      totalOwnCar,
      totalChildren: children._sum.numberOfChildren ?? 0,
      totalRevenueKz: revenue._sum.paymentAmount ?? 0,
      totalPeopleBuyingTent: peopleBuyingTent,
      totalPeopleBuyingMattress: peopleBuyingMattress,
      myValidations,
      myRejections,
      myManualRegistrations,
      myDeletions,
      myCheckIns,
      byTransportStop: stops.map((stop) => ({
        stopName: stop.name,
        total: stop._count.participants,
      })),
      byAgeGroup: AGE_GROUPS.map((group) => ({
        ageGroup: group.label,
        total: ageCounts.get(group.label) ?? 0,
      })),
      byRegistrationDay,
    };
  }
}
