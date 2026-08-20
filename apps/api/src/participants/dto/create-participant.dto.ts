import { Gender } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

function toBoolean({ value }: { value: unknown }): boolean {
  return value === true || value === 'true';
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

  @Transform(toBoolean)
  @IsBoolean()
  transportRequired!: boolean;

  @ValidateIf((dto: CreateParticipantDto) => dto.transportRequired)
  @IsString()
  @IsNotEmpty()
  transportStopId?: string;

  @Transform(toBoolean)
  @IsBoolean()
  tentRequired!: boolean;

  @Transform(toBoolean)
  @IsBoolean()
  mattressRequired!: boolean;

  @Transform(toBoolean)
  @IsBoolean()
  isSponsored!: boolean;
}
