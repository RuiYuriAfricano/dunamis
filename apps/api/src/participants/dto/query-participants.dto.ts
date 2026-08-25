import { Gender, MaritalStatus, OccupationStatus, PaymentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function toBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  return value === true || value === 'true';
}

export class QueryParticipantsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  church?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  firstTime?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isMemberTibl?: boolean;

  @IsOptional()
  @IsEnum(OccupationStatus)
  occupationStatus?: OccupationStatus;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  baptized?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isSponsored?: boolean;

  @IsOptional()
  @IsString()
  transportStopId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  transportRequired?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  tentRequired?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  mattressRequired?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  wantsToBuyTent?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  wantsToBuyMattress?: boolean;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  bringingChildren?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  checkedIn?: boolean;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value ? parseInt(value, 10) : undefined,
  )
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value ? parseInt(value, 10) : undefined,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;
}
