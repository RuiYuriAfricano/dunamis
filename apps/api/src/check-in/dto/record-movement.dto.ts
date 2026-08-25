import { MovementType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class RecordMovementDto {
  @IsEnum(MovementType)
  type!: MovementType;
}
