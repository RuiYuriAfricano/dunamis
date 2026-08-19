import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsIn } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  @IsIn(['CONFIRMED', 'REJECTED'])
  status!: PaymentStatus;
}
