import { IsString } from 'class-validator';

export class UpdateBelongingsDto {
  @IsString()
  belongings!: string;
}
