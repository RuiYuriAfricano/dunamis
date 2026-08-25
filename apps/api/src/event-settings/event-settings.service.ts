import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SETTINGS_ID = 1;

// End of day (Africa/Luanda, UTC+1) on the default registration deadline —
// only used to seed the row the very first time it's read; after that the
// admin-set value in the database is always the source of truth.
const DEFAULT_REGISTRATION_DEADLINE = new Date('2026-09-13T23:59:59+01:00');

@Injectable()
export class EventSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.eventSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (settings) return settings;

    return this.prisma.eventSettings.create({
      data: { id: SETTINGS_ID, registrationDeadline: DEFAULT_REGISTRATION_DEADLINE },
    });
  }

  async updateRegistrationDeadline(registrationDeadline: Date) {
    return this.prisma.eventSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { registrationDeadline },
      create: { id: SETTINGS_ID, registrationDeadline },
    });
  }

  async assertRegistrationOpen() {
    const settings = await this.get();
    if (new Date() > settings.registrationDeadline) {
      throw new ForbiddenException('As inscrições estão encerradas.');
    }
  }
}
