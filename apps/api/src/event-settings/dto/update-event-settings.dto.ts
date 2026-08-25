import { IsDateString } from 'class-validator';

export class UpdateEventSettingsDto {
  @IsDateString()
  registrationDeadline!: string;
}
