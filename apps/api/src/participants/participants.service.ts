import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as QRCode from 'qrcode';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { LookupParticipantDto } from './dto/lookup-participant.dto';
import { QueryParticipantsDto } from './dto/query-participants.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { storePaymentProof } from './payment-proof-storage';
import { generateRegistrationPdf } from './registration-pdf';

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
  baptized: true,
  allergicTo: true,
  firstTime: true,
  transportRequired: true,
  transportStop: { select: { id: true, name: true } },
  tentRequired: true,
  mattressRequired: true,
  isSponsored: true,
  paymentAmount: true,
  paymentProofPath: true,
  paymentStatus: true,
  paymentReviewedAt: true,
  paymentReviewedBy: { select: { name: true } },
  checkedIn: true,
  checkedInAt: true,
  belongings: true,
  createdAt: true,
} satisfies Prisma.ParticipantSelect;

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(
    dto: CreateParticipantDto,
    paymentProof: Express.Multer.File | undefined,
  ) {
    if (dto.transportRequired && dto.transportStopId) {
      const stop = await this.prisma.transportStop.findUnique({
        where: { id: dto.transportStopId },
      });
      if (!stop || !stop.active) {
        throw new BadRequestException('Paragem de transporte inválida.');
      }
    }

    if (!dto.isSponsored && !paymentProof) {
      throw new BadRequestException('Comprovativo de pagamento é obrigatório.');
    }

    const birthDate = new Date(dto.birthDate);
    const now = new Date();
    if (Number.isNaN(birthDate.getTime()) || birthDate > now) {
      throw new BadRequestException('Data de nascimento inválida.');
    }
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    if (age < 15 || age > 120) {
      throw new BadRequestException('A idade mínima para participar é 15 anos.');
    }

    // Checked before the (slower, network-bound) proof upload so a duplicate
    // registration fails fast without wasting a Supabase Storage write.
    await this.assertContactIsUnique(dto.email, dto.phone, dto.whatsapp);

    // Sponsored/bolseiro participants don't pay, so there's no proof to store —
    // they still go through the same PENDING → admin review flow before the
    // QR/email is released, just reviewing the sponsorship instead of a payment.
    // Uploaded outside the transaction: it's a network/disk call, not something
    // that should hold a database transaction open.
    const paymentProofPath =
      dto.isSponsored || !paymentProof
        ? null
        : await storePaymentProof(paymentProof);

    let participant: Prisma.ParticipantGetPayload<{
      include: { transportStop: { select: { id: true; name: true } } };
    }>;
    try {
      participant = await this.prisma.$transaction(async (tx) => {
        const [{ value }] = await tx.$queryRaw<
          { value: number }[]
        >`SELECT nextval('registration_number_seq')::int AS value`;

        const registrationNumber = `DUN-${new Date().getFullYear()}-${String(value).padStart(6, '0')}`;
        const qrToken = nanoid(24);
        const paymentAmount = dto.isSponsored
          ? 0
          : dto.isMemberTibl
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
            baptized: dto.baptized,
            allergicTo: dto.allergicTo ?? '',
            firstTime: dto.firstTime,
            transportRequired: dto.transportRequired,
            transportStopId: dto.transportRequired ? dto.transportStopId : null,
            tentRequired: dto.tentRequired,
            mattressRequired: dto.mattressRequired,
            isSponsored: dto.isSponsored,
            paymentAmount,
            paymentProofPath,
            qrToken,
          },
          include: { transportStop: { select: { id: true, name: true } } },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este email, telefone ou WhatsApp já está associado a outra inscrição.',
        );
      }
      throw error;
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
      isSponsored: participant.isSponsored,
      paymentAmount: participant.paymentAmount,
      paymentProofPath: participant.paymentProofPath,
      paymentStatus: participant.paymentStatus,
      qrCodeDataUrl,
    };
  }

  private async assertContactIsUnique(
    email: string,
    phone: string,
    whatsapp: string,
  ) {
    const existing = await this.prisma.participant.findFirst({
      where: { OR: [{ email }, { phone }, { whatsapp }] },
      select: { email: true, phone: true, whatsapp: true },
    });

    if (!existing) return;

    if (existing.email === email) {
      throw new ConflictException('Este email já está associado a outra inscrição.');
    }
    if (existing.phone === phone) {
      throw new ConflictException('Este telefone já está associado a outra inscrição.');
    }
    throw new ConflictException('Este WhatsApp já está associado a outra inscrição.');
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
      isSponsored: participant.isSponsored,
      paymentAmount: participant.paymentAmount,
      paymentProofPath: participant.paymentProofPath,
      paymentStatus: participant.paymentStatus,
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
      include: { transportStop: { select: { id: true, name: true } } },
    });

    if (!participant) {
      throw new NotFoundException('Participante não encontrado.');
    }

    const updated = await this.prisma.participant.update({
      where: { id },
      data: {
        paymentStatus: dto.status,
        paymentReviewedById: reviewerId,
        paymentReviewedAt: new Date(),
      },
      select: PARTICIPANT_SUMMARY_SELECT,
    });

    // Email delivery never blocks or fails the review action itself — the
    // payment status is already saved regardless of whether Gmail is reachable.
    if (dto.status === 'CONFIRMED') {
      this.sendConfirmationEmail(participant).catch((error) =>
        this.logger.error(`Falha ao enviar email de confirmação: ${error.message}`),
      );
    } else if (dto.status === 'REJECTED') {
      this.mail
        .sendPaymentRejectedEmail({
          to: participant.email,
          fullName: participant.fullName,
          registrationNumber: participant.registrationNumber,
        })
        .catch((error) =>
          this.logger.error(`Falha ao enviar email de rejeição: ${error.message}`),
        );
    }

    return updated;
  }

  private async sendConfirmationEmail(
    participant: Prisma.ParticipantGetPayload<{
      include: { transportStop: { select: { id: true; name: true } } };
    }>,
  ) {
    const pdfBuffer = await generateRegistrationPdf({
      registrationNumber: participant.registrationNumber,
      fullName: participant.fullName,
      church: participant.church,
      transportStopName: participant.transportStop?.name ?? null,
      tentRequired: participant.tentRequired,
      mattressRequired: participant.mattressRequired,
      paymentAmount: participant.paymentAmount,
      isSponsored: participant.isSponsored,
      qrToken: participant.qrToken,
    });

    await this.mail.sendPaymentConfirmedEmail({
      to: participant.email,
      fullName: participant.fullName,
      registrationNumber: participant.registrationNumber,
      isSponsored: participant.isSponsored,
      pdfBuffer,
    });
  }

  async updateBelongings(id: string, belongings: string) {
    const participant = await this.prisma.participant.findUnique({ where: { id } });
    if (!participant) {
      throw new NotFoundException('Participante não encontrado.');
    }

    return this.prisma.participant.update({
      where: { id },
      data: { belongings: belongings.trim() || null },
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
      { header: 'Membro TIBL', key: 'isMemberTibl', width: 14 },
      { header: 'Baptizado', key: 'baptized', width: 12 },
      { header: 'Alérgico a', key: 'allergicTo', width: 24 },
      { header: 'Primeira Participação', key: 'firstTime', width: 20 },
      { header: 'Transporte', key: 'transportRequired', width: 14 },
      { header: 'Paragem', key: 'transportStop', width: 22 },
      { header: 'Tenda', key: 'tentRequired', width: 10 },
      { header: 'Colchão', key: 'mattressRequired', width: 10 },
      { header: 'Patrocinado', key: 'isSponsored', width: 14 },
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
        isMemberTibl: p.isMemberTibl ? 'Sim' : 'Não',
        baptized: p.baptized ? 'Sim' : 'Não',
        allergicTo: p.allergicTo || '-',
        firstTime: p.firstTime ? 'Sim' : 'Não',
        transportRequired: p.transportRequired ? 'Sim' : 'Não',
        transportStop: p.transportStop?.name ?? '-',
        tentRequired: p.tentRequired ? 'Sim' : 'Não',
        mattressRequired: p.mattressRequired ? 'Sim' : 'Não',
        isSponsored: p.isSponsored ? 'Sim' : 'Não',
        paymentAmount: p.paymentAmount,
        paymentProofPath: p.paymentProofPath ?? '-',
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
        { whatsapp: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { church: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.gender) where.gender = query.gender;
    if (query.church)
      where.church = { contains: query.church, mode: 'insensitive' };
    if (query.firstTime !== undefined) where.firstTime = query.firstTime;
    if (query.isMemberTibl !== undefined)
      where.isMemberTibl = query.isMemberTibl;
    if (query.baptized !== undefined) where.baptized = query.baptized;
    if (query.isSponsored !== undefined)
      where.isSponsored = query.isSponsored;
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
