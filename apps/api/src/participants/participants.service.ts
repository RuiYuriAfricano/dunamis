import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, PaymentStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as QRCode from 'qrcode';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { CreateManualParticipantDto } from './dto/create-manual-participant.dto';
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
  maritalStatus: true,
  bringingChildren: true,
  numberOfChildren: true,
  transportRequired: true,
  transportStop: { select: { id: true, name: true } },
  ownTransportType: true,
  carSeats: true,
  carRouteStops: true,
  tentRequired: true,
  mattressRequired: true,
  tentsCanProvide: true,
  mattressesCanProvide: true,
  wantsToBuyTent: true,
  tentPurchaseType: { select: { id: true, name: true } },
  tentPurchaseQuantity: true,
  wantsToBuyMattress: true,
  mattressPurchaseQuantity: true,
  isSponsored: true,
  paidInHand: true,
  paymentAmount: true,
  paymentProofPath: true,
  paymentStatus: true,
  paymentReviewedAt: true,
  paymentReviewedBy: { select: { name: true } },
  paymentRejectionReason: true,
  checkedIn: true,
  checkedInAt: true,
  belongings: true,
  registeredByAdmin: { select: { name: true } },
  createdAt: true,
} satisfies Prisma.ParticipantSelect;

type ParticipantWithTransportStop = Prisma.ParticipantGetPayload<{
  include: { transportStop: { select: { id: true; name: true } } };
}>;

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
    await this.assertTransportStopValid(dto);

    if (!dto.isSponsored && !paymentProof) {
      throw new BadRequestException('Comprovativo de pagamento é obrigatório.');
    }

    this.assertBirthDateValid(dto.birthDate);
    await this.assertTentPurchaseTypeValid(dto);

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

    const participant = await this.insertParticipant(dto, {
      paymentProofPath,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(participant.qrToken, {
      margin: 1,
      width: 320,
    });

    return { ...this.toConfirmation(participant), qrCodeDataUrl };
  }

  /**
   * Admin-only: registers someone who has no way to use the public form
   * themselves. Skips the payment proof upload — the admin sets the payment
   * status directly, having already verified it some other way — and, unlike
   * the public flow, can create the record already CONFIRMED so the QR/email
   * goes out immediately instead of waiting on a separate review step.
   */
  async createManual(
    dto: CreateManualParticipantDto,
    adminId: string,
    paymentProof: Express.Multer.File | undefined,
  ) {
    await this.assertTransportStopValid(dto);
    this.assertBirthDateValid(dto.birthDate);
    await this.assertTentPurchaseTypeValid(dto);

    // Not sponsored: the admin is vouching for a real payment they've already
    // seen, so they record exactly what came in instead of the app assuming
    // the standard fee. If it wasn't handed over in person, a proof is still
    // required — same as the public flow.
    if (!dto.isSponsored && dto.paidInHand === false && !paymentProof) {
      throw new BadRequestException(
        'Comprovativo de pagamento é obrigatório quando o pagamento não foi feito em mão.',
      );
    }

    await this.assertContactIsUnique(dto.email, dto.phone, dto.whatsapp);

    const paymentProofPath =
      dto.isSponsored || dto.paidInHand !== false || !paymentProof
        ? null
        : await storePaymentProof(paymentProof);

    const status = dto.paymentStatus ?? PaymentStatus.CONFIRMED;

    const participant = await this.insertParticipant(dto, {
      paymentProofPath,
      paymentAmountOverride: dto.isSponsored ? undefined : dto.paymentAmountPaid,
      paidInHand: dto.isSponsored ? null : (dto.paidInHand ?? null),
      registeredByAdminId: adminId,
      paymentStatus: status,
      paymentReviewedById: status === PaymentStatus.PENDING ? null : adminId,
      paymentReviewedAt: status === PaymentStatus.PENDING ? null : new Date(),
    });

    this.dispatchPaymentStatusEmail(participant, status);

    return this.findOne(participant.id);
  }

  private async insertParticipant(
    dto: CreateParticipantDto,
    extra: {
      paymentProofPath: string | null;
      paymentAmountOverride?: number;
      paidInHand?: boolean | null;
      registeredByAdminId?: string;
      paymentStatus?: PaymentStatus;
      paymentReviewedById?: string | null;
      paymentReviewedAt?: Date | null;
    },
  ): Promise<ParticipantWithTransportStop> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [{ value }] = await tx.$queryRaw<
          { value: number }[]
        >`SELECT nextval('registration_number_seq')::int AS value`;

        const registrationNumber = `DUN-${new Date().getFullYear()}-${String(value).padStart(6, '0')}`;
        const qrToken = nanoid(24);
        const baseAmount = dto.isMemberTibl
          ? PAYMENT_AMOUNT_MEMBER
          : PAYMENT_AMOUNT_VISITOR;
        const paymentAmount = dto.isSponsored
          ? 0
          : (extra.paymentAmountOverride ?? baseAmount);

        const wantsToBuyTent = dto.tentRequired && !!dto.wantsToBuyTent;
        const wantsToBuyMattress = dto.mattressRequired && !!dto.wantsToBuyMattress;
        const hasOwnTransport = !dto.transportRequired;
        const hasIndividualTransport =
          hasOwnTransport && dto.ownTransportType === 'INDIVIDUAL';

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
            maritalStatus: dto.maritalStatus,
            bringingChildren: dto.bringingChildren,
            numberOfChildren: dto.bringingChildren
              ? (dto.numberOfChildren ?? 0)
              : 0,
            transportRequired: dto.transportRequired,
            transportStopId: dto.transportRequired ? dto.transportStopId : null,
            ownTransportType: hasOwnTransport
              ? (dto.ownTransportType ?? null)
              : null,
            carSeats: hasIndividualTransport ? (dto.carSeats ?? null) : null,
            carRouteStops: hasIndividualTransport
              ? (dto.carRouteStops ?? null)
              : null,
            tentRequired: dto.tentRequired,
            mattressRequired: dto.mattressRequired,
            tentsCanProvide: !dto.tentRequired
              ? (dto.tentsCanProvide ?? 0)
              : 0,
            mattressesCanProvide: !dto.mattressRequired
              ? (dto.mattressesCanProvide ?? 0)
              : 0,
            wantsToBuyTent,
            tentPurchaseTypeId: wantsToBuyTent
              ? dto.tentPurchaseTypeId
              : null,
            tentPurchaseQuantity: wantsToBuyTent
              ? (dto.tentPurchaseQuantity ?? 0)
              : 0,
            wantsToBuyMattress,
            mattressPurchaseQuantity: wantsToBuyMattress
              ? (dto.mattressPurchaseQuantity ?? 0)
              : 0,
            isSponsored: dto.isSponsored,
            paidInHand: extra.paidInHand ?? null,
            paymentAmount,
            paymentProofPath: extra.paymentProofPath,
            paymentStatus: extra.paymentStatus,
            paymentReviewedById: extra.paymentReviewedById,
            paymentReviewedAt: extra.paymentReviewedAt,
            registeredByAdminId: extra.registeredByAdminId,
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
  }

  private toConfirmation(participant: ParticipantWithTransportStop) {
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
    };
  }

  private async assertTransportStopValid(dto: CreateParticipantDto) {
    if (dto.transportRequired && dto.transportStopId) {
      const stop = await this.prisma.transportStop.findUnique({
        where: { id: dto.transportStopId },
      });
      if (!stop || !stop.active) {
        throw new BadRequestException('Paragem de transporte inválida.');
      }
    }
  }

  private assertBirthDateValid(birthDateInput: string) {
    const birthDate = new Date(birthDateInput);
    const now = new Date();
    if (Number.isNaN(birthDate.getTime()) || birthDate > now) {
      throw new BadRequestException('Data de nascimento inválida.');
    }
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    if (age < 13 || age > 120) {
      throw new BadRequestException('A idade mínima para participar é 13 anos.');
    }
  }

  private async assertTentPurchaseTypeValid(
    dto: CreateParticipantDto,
  ): Promise<void> {
    if (!dto.tentRequired || !dto.wantsToBuyTent || !dto.tentPurchaseTypeId) {
      return;
    }

    const tentType = await this.prisma.tentType.findUnique({
      where: { id: dto.tentPurchaseTypeId },
    });
    if (!tentType || !tentType.active) {
      throw new BadRequestException('Tipo de tenda inválido.');
    }
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
        deletedAt: null,
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

    return { ...this.toConfirmation(participant), qrCodeDataUrl };
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
        paymentRejectionReason:
          dto.status === PaymentStatus.REJECTED ? dto.reason : null,
      },
      select: PARTICIPANT_SUMMARY_SELECT,
    });

    this.dispatchPaymentStatusEmail(participant, dto.status, dto.reason);

    return updated;
  }

  // Email delivery never blocks or fails the review/creation action itself —
  // the payment status is already saved regardless of whether Gmail/Brevo is
  // reachable.
  private dispatchPaymentStatusEmail(
    participant: ParticipantWithTransportStop,
    status: PaymentStatus,
    reason?: string,
  ) {
    if (status === PaymentStatus.CONFIRMED) {
      this.sendConfirmationEmail(participant).catch((error) =>
        this.logger.error(`Falha ao enviar email de confirmação: ${error.message}`),
      );
    } else if (status === PaymentStatus.REJECTED) {
      this.mail
        .sendPaymentRejectedEmail({
          to: participant.email,
          fullName: participant.fullName,
          registrationNumber: participant.registrationNumber,
          reason,
        })
        .catch((error) =>
          this.logger.error(`Falha ao enviar email de rejeição: ${error.message}`),
        );
    }
  }

  private async sendConfirmationEmail(participant: ParticipantWithTransportStop) {
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

  async softDelete(id: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
    });
    if (!participant || participant.deletedAt) {
      throw new NotFoundException('Participante não encontrado.');
    }

    await this.prisma.participant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findOne(id: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { id, deletedAt: null },
      select: PARTICIPANT_SUMMARY_SELECT,
    });

    if (!participant) {
      throw new NotFoundException('Participante não encontrado.');
    }

    return participant;
  }

  async exportXlsx(): Promise<Buffer> {
    const participants = await this.prisma.participant.findMany({
      where: { deletedAt: null },
      select: PARTICIPANT_SUMMARY_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Participantes');

    sheet.columns = [
      { header: 'Número de Inscrição', key: 'registrationNumber', width: 20 },
      { header: 'Data de Inscrição', key: 'createdAt', width: 20 },
      { header: 'Nome', key: 'fullName', width: 30 },
      { header: 'Sexo', key: 'gender', width: 10 },
      { header: 'Idade', key: 'age', width: 8 },
      { header: 'Estado Civil', key: 'maritalStatus', width: 14 },
      { header: 'Leva Filhos', key: 'bringingChildren', width: 12 },
      { header: 'Nº de Filhos', key: 'numberOfChildren', width: 12 },
      { header: 'Telefone', key: 'phone', width: 16 },
      { header: 'WhatsApp', key: 'whatsapp', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Igreja', key: 'church', width: 26 },
      { header: 'Membro TIBL', key: 'isMemberTibl', width: 14 },
      { header: 'Baptizado', key: 'baptized', width: 12 },
      { header: 'Alérgico a', key: 'allergicTo', width: 24 },
      { header: 'Primeira Participação', key: 'firstTime', width: 20 },
      { header: 'Transporte da Organização', key: 'transportRequired', width: 22 },
      { header: 'Paragem', key: 'transportStop', width: 22 },
      { header: 'Transporte Próprio', key: 'ownTransportType', width: 18 },
      { header: 'Lugares no Carro', key: 'carSeats', width: 16 },
      { header: 'Paragens no Trajeto', key: 'carRouteStops', width: 26 },
      { header: 'Precisa de Tenda', key: 'tentRequired', width: 16 },
      { header: 'Pode Disponibilizar Tendas', key: 'tentsCanProvide', width: 22 },
      { header: 'Quer Comprar Tenda', key: 'wantsToBuyTent', width: 18 },
      { header: 'Tipo de Tenda Comprada', key: 'tentPurchaseType', width: 22 },
      { header: 'Qtd. Tendas Compradas', key: 'tentPurchaseQuantity', width: 20 },
      { header: 'Precisa de Colchão', key: 'mattressRequired', width: 16 },
      { header: 'Pode Disponibilizar Colchões', key: 'mattressesCanProvide', width: 24 },
      { header: 'Quer Comprar Colchão', key: 'wantsToBuyMattress', width: 20 },
      { header: 'Qtd. Colchões Comprados', key: 'mattressPurchaseQuantity', width: 22 },
      { header: 'Patrocinado', key: 'isSponsored', width: 14 },
      { header: 'Pago em Mão', key: 'paidInHand', width: 14 },
      { header: 'Valor (Kz)', key: 'paymentAmount', width: 12 },
      { header: 'Comprovativo', key: 'paymentProofPath', width: 30 },
      { header: 'Estado do Pagamento', key: 'paymentStatus', width: 18 },
      { header: 'Motivo da Rejeição', key: 'paymentRejectionReason', width: 30 },
      { header: 'Check-in', key: 'checkedIn', width: 12 },
      { header: 'Registado por Admin', key: 'registeredByAdmin', width: 20 },
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
        createdAt: p.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        fullName: p.fullName,
        gender: p.gender === 'MALE' ? 'Masculino' : 'Feminino',
        age,
        maritalStatus: p.maritalStatus === 'MARRIED' ? 'Casado(a)' : p.maritalStatus === 'SINGLE' ? 'Solteiro(a)' : '-',
        bringingChildren: p.bringingChildren ? 'Sim' : 'Não',
        numberOfChildren: p.bringingChildren ? p.numberOfChildren : 0,
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
        ownTransportType: p.ownTransportType === 'INDIVIDUAL' ? 'Individual' : p.ownTransportType === 'TAXI' ? 'Táxi' : '-',
        carSeats: p.carSeats ?? '-',
        carRouteStops: p.carRouteStops || '-',
        tentRequired: p.tentRequired ? 'Sim' : 'Não',
        tentsCanProvide: p.tentsCanProvide,
        wantsToBuyTent: p.wantsToBuyTent ? 'Sim' : 'Não',
        tentPurchaseType: p.tentPurchaseType?.name ?? '-',
        tentPurchaseQuantity: p.tentPurchaseQuantity,
        mattressRequired: p.mattressRequired ? 'Sim' : 'Não',
        mattressesCanProvide: p.mattressesCanProvide,
        wantsToBuyMattress: p.wantsToBuyMattress ? 'Sim' : 'Não',
        mattressPurchaseQuantity: p.mattressPurchaseQuantity,
        isSponsored: p.isSponsored ? 'Sim' : 'Não',
        paidInHand: p.paidInHand === null ? '-' : p.paidInHand ? 'Sim' : 'Não',
        paymentAmount: p.paymentAmount,
        paymentProofPath: p.paymentProofPath ?? '-',
        paymentStatus: PAYMENT_STATUS_LABELS[p.paymentStatus],
        paymentRejectionReason: p.paymentRejectionReason || '-',
        checkedIn: p.checkedIn ? 'Sim' : 'Não',
        registeredByAdmin: p.registeredByAdmin?.name ?? '-',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildWhere(
    query: QueryParticipantsDto,
  ): Prisma.ParticipantWhereInput {
    const where: Prisma.ParticipantWhereInput = { deletedAt: null };

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
    if (query.wantsToBuyTent !== undefined)
      where.wantsToBuyTent = query.wantsToBuyTent;
    if (query.wantsToBuyMattress !== undefined)
      where.wantsToBuyMattress = query.wantsToBuyMattress;
    if (query.maritalStatus) where.maritalStatus = query.maritalStatus;
    if (query.bringingChildren !== undefined)
      where.bringingChildren = query.bringingChildren;
    if (query.checkedIn !== undefined) where.checkedIn = query.checkedIn;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    return where;
  }
}
