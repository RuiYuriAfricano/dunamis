import { IsNotEmpty, IsString } from 'class-validator';

export class LookupParticipantDto {
  @IsString()
  @IsNotEmpty()
  registrationNumber!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;
}
