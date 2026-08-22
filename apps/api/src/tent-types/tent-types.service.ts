import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.tentType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }
}
