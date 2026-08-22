import { Gender, MaritalStatus, OwnTransportType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export function toBoolean({ value }: { value: unknown }): boolean {
  return value === true || value === 'true';
}

export function toInt({ value }: { value: unknown }): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = typeof value === 'string' ? parseInt(value, 10) : (value as number);
  return Number.isNaN(n) ? undefined : n;
}

export class CreateParticipantDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  whatsapp!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  church!: string;

  @Transform(toBoolean)
  @IsBoolean()
  isMemberTibl!: boolean;

  @Transform(toBoolean)
  @IsBoolean()
  baptized!: boolean;

  @IsOptional()
  @IsString()
  allergicTo?: string;

  @Transform(toBoolean)
  @IsBoolean()
  firstTime!: boolean;

  @IsEnum(MaritalStatus)
  maritalStatus!: MaritalStatus;

  @Transform(toBoolean)
  @IsBoolean()
  bringingChildren!: boolean;

  @ValidateIf((dto: CreateParticipantDto) => dto.bringingChildren)
  @Transform(toInt)
  @IsInt()
  @Min(1)
  numberOfChildren?: number;

  @Transform(toBoolean)
  @IsBoolean()
  transportRequired!: boolean;

  @ValidateIf((dto: CreateParticipantDto) => dto.transportRequired)
  @IsString()
  @IsNotEmpty()
  transportStopId?: string;

  @ValidateIf((dto: CreateParticipantDto) => !dto.transportRequired)
  @IsEnum(OwnTransportType)
  ownTransportType?: OwnTransportType;

  @ValidateIf(
    (dto: CreateParticipantDto) =>
      !dto.transportRequired && dto.ownTransportType === 'INDIVIDUAL',
  )
  @Transform(toInt)
  @IsInt()
  @Min(1)
  carSeats?: number;

  @ValidateIf(
    (dto: CreateParticipantDto) =>
      !dto.transportRequired && dto.ownTransportType === 'INDIVIDUAL',
  )
  @IsString()
  @IsNotEmpty()
  carRouteStops?: string;

  @Transform(toBoolean)
  @IsBoolean()
  tentRequired!: boolean;

  @Transform(toBoolean)
  @IsBoolean()
  mattressRequired!: boolean;

  @ValidateIf((dto: CreateParticipantDto) => !dto.tentRequired)
  @Transform(toInt)
  @IsInt()
  @Min(0)
  tentsCanProvide?: number;

  @ValidateIf((dto: CreateParticipantDto) => !dto.mattressRequired)
  @Transform(toInt)
  @IsInt()
  @Min(0)
  mattressesCanProvide?: number;

  @ValidateIf((dto: CreateParticipantDto) => dto.tentRequired)
  @Transform(toBoolean)
  @IsBoolean()
  wantsToBuyTent?: boolean;

  @ValidateIf((dto: CreateParticipantDto) => !!dto.wantsToBuyTent)
  @IsString()
  @IsNotEmpty()
  tentPurchaseTypeId?: string;

  @ValidateIf((dto: CreateParticipantDto) => !!dto.wantsToBuyTent)
  @Transform(toInt)
  @IsInt()
  @Min(1)
  tentPurchaseQuantity?: number;

  @ValidateIf((dto: CreateParticipantDto) => dto.mattressRequired)
  @Transform(toBoolean)
  @IsBoolean()
  wantsToBuyMattress?: boolean;

  @ValidateIf((dto: CreateParticipantDto) => !!dto.wantsToBuyMattress)
  @Transform(toInt)
  @IsInt()
  @Min(1)
  mattressPurchaseQuantity?: number;

  @Transform(toBoolean)
  @IsBoolean()
  isSponsored!: boolean;
}
