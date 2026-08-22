import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  @IsIn(['CONFIRMED', 'REJECTED'])
  status!: PaymentStatus;

  @ValidateIf((dto: UpdatePaymentStatusDto) => dto.status === 'REJECTED')
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
