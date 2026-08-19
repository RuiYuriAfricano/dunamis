import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as QRCode from 'qrcode';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { LookupParticipantDto } from './dto/lookup-participant.dto';
import { QueryParticipantsDto } from './dto/query-participants.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { storePaymentProof } from './payment-proof-storage';

const PAYMENT_AMOUNT_MEMBER = 5000;
const PAYMENT_AMOUNT_VISITOR = 2500;

const PAYMENT_STATUS_LABELS: Record<
  'PENDING' | 'CONFIRMED' | 'REJECTED',
  string
> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  REJECTED: 'Rejeitado',
};

const PARTICIPANT_SUMMARY_SELECT = {
  id: true,
  registrationNumber: true,
  fullName: true,
  gender: true,
  church: true,
  phone: true,
  whatsapp: true,
  email: true,
  birthDate: true,
  isMemberTibl: true,
  firstTime: true,
  transportRequired: true,
  transportStop: { select: { id: true, name: true } },
  tentRequired: true,
  mattressRequired: true,
  paymentAmount: true,
  paymentProofPath: true,
  paymentStatus: true,
  paymentReviewedAt: true,
  paymentReviewedBy: { select: { name: true } },
  checkedIn: true,
  checkedInAt: true,
  createdAt: true,
} satisfies Prisma.ParticipantSelect;

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateParticipantDto, paymentProof: Express.Multer.File) {
    if (dto.transportRequired && dto.transportStopId) {
      const stop = await this.prisma.transportStop.findUnique({
        where: { id: dto.transportStopId },
      });
      if (!stop || !stop.active) {
        throw new BadRequestException('Paragem de transporte inválida.');
      }
    }

    // Uploaded outside the transaction: it's a network/disk call, not something
    // that should hold a database transaction open.
    const paymentProofPath = await storePaymentProof(paymentProof);

    const participant = await this.prisma.$transaction(async (tx) => {
      const [{ value }] = await tx.$queryRaw<
        { value: number }[]
      >`SELECT nextval('registration_number_seq')::int AS value`;

      const registrationNumber = `DUN-${new Date().getFullYear()}-${String(value).padStart(6, '0')}`;
      const qrToken = nanoid(24);
      const paymentAmount = dto.isMemberTibl
        ? PAYMENT_AMOUNT_MEMBER
        : PAYMENT_AMOUNT_VISITOR;

      return tx.participant.create({
        data: {
          registrationNumber,
          fullName: dto.fullName,
          gender: dto.gender,
          birthDate: new Date(dto.birthDate),
          phone: dto.phone,
          whatsapp: dto.whatsapp,
          email: dto.email,
          church: dto.church,
          isMemberTibl: dto.isMemberTibl,
          firstTime: dto.firstTime,
          transportRequired: dto.transportRequired,
          transportStopId: dto.transportRequired ? dto.transportStopId : null,
          tentRequired: dto.tentRequired,
          mattressRequired: dto.mattressRequired,
          paymentAmount,
          paymentProofPath,
          qrToken,
        },
        include: { transportStop: { select: { id: true, name: true } } },
      });
    });

    const qrCodeDataUrl = await QRCode.toDataURL(participant.qrToken, {
      margin: 1,
      width: 320,
    });

    return {
      id: participant.id,
      registrationNumber: participant.registrationNumber,
      fullName: participant.fullName,
      church: participant.church,
      transportStop: participant.transportStop,
      tentRequired: participant.tentRequired,
      mattressRequired: participant.mattressRequired,
      paymentAmount: participant.paymentAmount,
      paymentProofPath: participant.paymentProofPath,
      qrCodeDataUrl,
    };
  }

  async lookup(dto: LookupParticipantDto) {
    const participant = await this.prisma.participant.findFirst({
      where: {
        registrationNumber: dto.registrationNumber.trim().toUpperCase(),
        phone: dto.phone.trim(),
      },
      include: { transportStop: { select: { id: true, name: true } } },
    });

    if (!participant) {
      throw new NotFoundException(
        'Nenhuma inscrição encontrada com estes dados.',
      );
    }

    const qrCodeDataUrl = await QRCode.toDataURL(participant.qrToken, {
      margin: 1,
      width: 320,
    });

    return {
      id: participant.id,
      registrationNumber: participant.registrationNumber,
      fullName: participant.fullName,
      church: participant.church,
      transportStop: participant.transportStop,
      tentRequired: participant.tentRequired,
      mattressRequired: participant.mattressRequired,
      paymentAmount: participant.paymentAmount,
      paymentProofPath: participant.paymentProofPath,
      qrCodeDataUrl,
    };
  }

  async findAll(query: QueryParticipantsDto) {
    const where = this.buildWhere(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [total, participants] = await this.prisma.$transaction([
      this.prisma.participant.count({ where }),
      this.prisma.participant.findMany({
        where,
        select: PARTICIPANT_SUMMARY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data: participants, total, page, pageSize };
  }

  async updatePaymentStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
    reviewerId: string,
  ) {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
    });

    if (!participant) {
      throw new NotFoundException('Participante não encontrado.');
    }

    return this.prisma.participant.update({
      where: { id },
      data: {
        paymentStatus: dto.status,
        paymentReviewedById: reviewerId,
        paymentReviewedAt: new Date(),
      },
      select: PARTICIPANT_SUMMARY_SELECT,
    });
  }

  async findOne(id: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
      select: PARTICIPANT_SUMMARY_SELECT,
    });

    if (!participant) {
      throw new NotFoundException('Participante não encontrado.');
    }

    return participant;
  }

  async exportXlsx(): Promise<Buffer> {
    const participants = await this.prisma.participant.findMany({
      select: PARTICIPANT_SUMMARY_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Participantes');

    sheet.columns = [
      { header: 'Número de Inscrição', key: 'registrationNumber', width: 20 },
      { header: 'Nome', key: 'fullName', width: 30 },
      { header: 'Sexo', key: 'gender', width: 10 },
      { header: 'Idade', key: 'age', width: 8 },
      { header: 'Telefone', key: 'phone', width: 16 },
      { header: 'WhatsApp', key: 'whatsapp', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Igreja', key: 'church', width: 26 },
      { header: 'Primeira Participação', key: 'firstTime', width: 20 },
      { header: 'Transporte', key: 'transportRequired', width: 14 },
      { header: 'Paragem', key: 'transportStop', width: 22 },
      { header: 'Tenda', key: 'tentRequired', width: 10 },
      { header: 'Colchão', key: 'mattressRequired', width: 10 },
      { header: 'Valor (Kz)', key: 'paymentAmount', width: 12 },
      { header: 'Comprovativo', key: 'paymentProofPath', width: 30 },
      { header: 'Estado do Pagamento', key: 'paymentStatus', width: 18 },
      { header: 'Check-in', key: 'checkedIn', width: 12 },
      { header: 'Data da Inscrição', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    const now = new Date();
    for (const p of participants) {
      const age = Math.floor(
        (now.getTime() - p.birthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      );

      sheet.addRow({
        registrationNumber: p.registrationNumber,
        fullName: p.fullName,
        gender: p.gender === 'MALE' ? 'Masculino' : 'Feminino',
        age,
        phone: p.phone,
        whatsapp: p.whatsapp,
        email: p.email,
        church: p.church,
        firstTime: p.firstTime ? 'Sim' : 'Não',
        transportRequired: p.transportRequired ? 'Sim' : 'Não',
        transportStop: p.transportStop?.name ?? '-',
        tentRequired: p.tentRequired ? 'Sim' : 'Não',
        mattressRequired: p.mattressRequired ? 'Sim' : 'Não',
        paymentAmount: p.paymentAmount,
        paymentProofPath: p.paymentProofPath,
        paymentStatus: PAYMENT_STATUS_LABELS[p.paymentStatus],
        checkedIn: p.checkedIn ? 'Sim' : 'Não',
        createdAt: p.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildWhere(
    query: QueryParticipantsDto,
  ): Prisma.ParticipantWhereInput {
    const where: Prisma.ParticipantWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { registrationNumber: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { church: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.gender) where.gender = query.gender;
    if (query.church)
      where.church = { contains: query.church, mode: 'insensitive' };
    if (query.firstTime !== undefined) where.firstTime = query.firstTime;
    if (query.transportStopId) where.transportStopId = query.transportStopId;
    if (query.transportRequired !== undefined)
      where.transportRequired = query.transportRequired;
    if (query.tentRequired !== undefined)
      where.tentRequired = query.tentRequired;
    if (query.mattressRequired !== undefined)
      where.mattressRequired = query.mattressRequired;
    if (query.checkedIn !== undefined) where.checkedIn = query.checkedIn;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    return where;
  }
}
