import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransportStopsService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.transportStop.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }
}
