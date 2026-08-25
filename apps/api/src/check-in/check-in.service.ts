import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PARTICIPANT_INCLUDE = {
  transportStop: { select: { id: true, name: true } },
  checkedInBy: { select: { name: true } },
  movementLogs: {
    orderBy: { recordedAt: 'desc' as const },
    take: 1,
    include: { recordedBy: { select: { name: true } } },
  },
} satisfies Prisma.ParticipantInclude;

type ParticipantWithCheckIn = Prisma.ParticipantGetPayload<{
  include: typeof PARTICIPANT_INCLUDE;
}>;

@Injectable()
export class CheckInService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(qrToken: string) {
    const participant = await this.findByToken(qrToken);
    return this.toLookupResult(participant);
  }

  async confirm(qrToken: string, operatorId: string) {
    const participant = await this.findByToken(qrToken);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.checkIn.create({
          data: { participantId: participant.id, operatorId },
        });

        await tx.participant.update({
          where: { id: participant.id },
          data: {
            checkedIn: true,
            checkedInAt: new Date(),
            checkedInById: operatorId,
            insideVenue: true,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const alreadyCheckedIn = await this.findByToken(qrToken);
        throw new ConflictException(this.toLookupResult(alreadyCheckedIn));
      }
      throw error;
    }

    const updated = await this.findByToken(qrToken);
    return this.toLookupResult(updated);
  }

  /**
   * Logs a participant leaving or returning to the venue after their initial
   * check-in — e.g. stepping out and coming back later in the camp. Only
   * meaningful once checked in, and only in the direction that actually
   * matches their current state (can't "exit" twice in a row).
   */
  async recordMovement(qrToken: string, type: MovementType, operatorId: string) {
    const participant = await this.findByToken(qrToken);

    if (!participant.checkedIn) {
      throw new BadRequestException(
        'Só é possível registar saídas/entradas após o check-in inicial.',
      );
    }

    const expectedCurrentState = type === MovementType.EXIT;
    if (participant.insideVenue !== expectedCurrentState) {
      throw new ConflictException(this.toLookupResult(participant));
    }

    await this.prisma.$transaction([
      this.prisma.movementLog.create({
        data: { participantId: participant.id, type, recordedById: operatorId },
      }),
      this.prisma.participant.update({
        where: { id: participant.id },
        data: { insideVenue: type === MovementType.ENTRY },
      }),
    ]);

    const updated = await this.findByToken(qrToken);
    return this.toLookupResult(updated);
  }

  async updateBelongings(qrToken: string, belongings: string) {
    const participant = await this.findByToken(qrToken);

    const updated = await this.prisma.participant.update({
      where: { id: participant.id },
      data: { belongings: belongings.trim() || null },
      include: PARTICIPANT_INCLUDE,
    });

    return this.toLookupResult(updated);
  }

  private async findByToken(qrToken: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { qrToken },
      include: PARTICIPANT_INCLUDE,
    });

    if (!participant) {
      throw new NotFoundException('QR Code inválido ou inscrição inexistente.');
    }

    return participant;
  }

  private toLookupResult(participant: ParticipantWithCheckIn) {
    const lastMovement = participant.movementLogs[0] ?? null;

    return {
      participantId: participant.id,
      registrationNumber: participant.registrationNumber,
      fullName: participant.fullName,
      church: participant.church,
      gender: participant.gender,
      transportStop: participant.transportStop,
      tentRequired: participant.tentRequired,
      mattressRequired: participant.mattressRequired,
      checkedIn: participant.checkedIn,
      checkedInAt: participant.checkedInAt,
      checkedInByName: participant.checkedInBy?.name ?? null,
      belongings: participant.belongings,
      insideVenue: participant.insideVenue,
      lastMovementType: lastMovement?.type ?? null,
      lastMovementAt: lastMovement?.recordedAt ?? null,
      lastMovementByName: lastMovement?.recordedBy.name ?? null,
    };
  }
}
