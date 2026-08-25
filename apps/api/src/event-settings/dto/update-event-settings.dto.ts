import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateEventSettingsDto {
  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRegistrations?: number;
}
