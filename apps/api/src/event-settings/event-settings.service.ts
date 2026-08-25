import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SETTINGS_ID = 1;

// End of day (Africa/Luanda, UTC+1) on the default registration deadline —
// only used to seed the row the very first time it's read; after that the
// admin-set value in the database is always the source of truth.
const DEFAULT_REGISTRATION_DEADLINE = new Date('2026-09-13T23:59:59+01:00');
const DEFAULT_MAX_REGISTRATIONS = 2000;

@Injectable()
export class EventSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.eventSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (settings) return settings;

    return this.prisma.eventSettings.create({
      data: {
        id: SETTINGS_ID,
        registrationDeadline: DEFAULT_REGISTRATION_DEADLINE,
        maxRegistrations: DEFAULT_MAX_REGISTRATIONS,
      },
    });
  }

  async update(data: { registrationDeadline?: Date; maxRegistrations?: number }) {
    return this.prisma.eventSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: {
        id: SETTINGS_ID,
        registrationDeadline: data.registrationDeadline ?? DEFAULT_REGISTRATION_DEADLINE,
        maxRegistrations: data.maxRegistrations ?? DEFAULT_MAX_REGISTRATIONS,
      },
    });
  }

  /**
   * Public-facing view of whether registration is open — used by the
   * registration page to decide what to render, and by assertRegistrationOpen
   * to decide whether to allow a new registration through.
   */
  async getRegistrationStatus() {
    const settings = await this.get();
    const registeredCount = await this.prisma.participant.count({
      where: { deletedAt: null },
    });
    const deadlinePassed = new Date() > settings.registrationDeadline;
    const capacityReached = registeredCount >= settings.maxRegistrations;

    return {
      open: !deadlinePassed && !capacityReached,
      deadlinePassed,
      capacityReached,
      registeredCount,
      maxRegistrations: settings.maxRegistrations,
      registrationDeadline: settings.registrationDeadline,
    };
  }

  // Only guards the public registration flow — admin manual registration
  // (for latecomers, sponsored cases, etc.) intentionally bypasses this.
  async assertRegistrationOpen() {
    const status = await this.getRegistrationStatus();
    if (status.deadlinePassed) {
      throw new ForbiddenException('As inscrições estão encerradas.');
    }
    if (status.capacityReached) {
      throw new ForbiddenException('O limite de inscritos foi atingido.');
    }
  }
}
