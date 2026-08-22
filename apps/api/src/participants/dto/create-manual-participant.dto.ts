import { PaymentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { CreateParticipantDto, toBoolean, toInt } from './create-participant.dto';

export class CreateManualParticipantDto extends CreateParticipantDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  // Only relevant when not sponsored — the admin is manually confirming a
  // real payment, so they record exactly what came in rather than the app
  // guessing a standard fee that may not match (discounts, partial amounts).
  @ValidateIf((dto: CreateManualParticipantDto) => !dto.isSponsored)
  @Transform(toBoolean)
  @IsBoolean()
  paidInHand?: boolean;

  @ValidateIf((dto: CreateManualParticipantDto) => !dto.isSponsored)
  @Transform(toInt)
  @IsInt()
  @Min(0)
  paymentAmountPaid?: number;
}
