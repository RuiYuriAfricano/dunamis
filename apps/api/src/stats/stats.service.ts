import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AGE_GROUPS: { label: string; min: number; max: number }[] = [
  { label: '≤12', min: 0, max: 12 },
  { label: '13-17', min: 13, max: 17 },
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-50', min: 36, max: 50 },
  { label: '51+', min: 51, max: Infinity },
];

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

  async dashboard() {
    const [
      totalParticipants,
      totalMale,
      totalFemale,
      totalFirstTime,
      totalTransportRequired,
      totalTentRequired,
      totalMattressRequired,
      totalCheckedIn,
      stops,
      birthDates,
    ] = await Promise.all([
      this.prisma.participant.count(),
      this.prisma.participant.count({ where: { gender: 'MALE' } }),
      this.prisma.participant.count({ where: { gender: 'FEMALE' } }),
      this.prisma.participant.count({ where: { firstTime: true } }),
      this.prisma.participant.count({ where: { transportRequired: true } }),
      this.prisma.participant.count({ where: { tentRequired: true } }),
      this.prisma.participant.count({ where: { mattressRequired: true } }),
      this.prisma.participant.count({ where: { checkedIn: true } }),
      this.prisma.transportStop.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: {
          name: true,
          _count: { select: { participants: true } },
        },
      }),
      this.prisma.participant.findMany({ select: { birthDate: true } }),
    ]);

    const now = new Date();
    const ageCounts = new Map(AGE_GROUPS.map((group) => [group.label, 0]));
    for (const { birthDate } of birthDates) {
      const age = calculateAge(birthDate, now);
      const group = AGE_GROUPS.find((g) => age >= g.min && age <= g.max);
      if (group)
        ageCounts.set(group.label, (ageCounts.get(group.label) ?? 0) + 1);
    }

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
      byTransportStop: stops.map((stop) => ({
        stopName: stop.name,
        total: stop._count.participants,
      })),
      byAgeGroup: AGE_GROUPS.map((group) => ({
        ageGroup: group.label,
        total: ageCounts.get(group.label) ?? 0,
      })),
    };
  }
}
