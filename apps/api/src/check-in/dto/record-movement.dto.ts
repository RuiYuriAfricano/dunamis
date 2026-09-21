import { MovementType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { toBoolean } from '../../participants/dto/create-participant.dto';

export class RecordMovementDto {
  @IsEnum(MovementType)
  type!: MovementType;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  belongingsOk?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  belongingsNotes?: string;
}
