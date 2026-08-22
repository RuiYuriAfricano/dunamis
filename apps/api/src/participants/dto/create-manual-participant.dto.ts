import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateParticipantDto } from './create-participant.dto';

export class CreateManualParticipantDto extends CreateParticipantDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
