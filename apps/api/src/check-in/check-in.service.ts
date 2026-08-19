import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

  private async findByToken(qrToken: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { qrToken },
      include: {
        transportStop: { select: { id: true, name: true } },
        checkedInBy: { select: { name: true } },
      },
    });

    if (!participant) {
      throw new NotFoundException('QR Code inválido ou inscrição inexistente.');
    }

    return participant;
  }

  private toLookupResult(
    participant: Prisma.ParticipantGetPayload<{
      include: {
        transportStop: { select: { id: true; name: true } };
        checkedInBy: { select: { name: true } };
      };
    }>,
  ) {
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
    };
  }
}
