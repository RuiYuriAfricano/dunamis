import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toInt } from '../../participants/dto/create-participant.dto';

function requiredRating() {
  return function (target: object, propertyKey: string) {
    Transform(toInt)(target, propertyKey);
    IsInt()(target, propertyKey);
    Min(1)(target, propertyKey);
    Max(5)(target, propertyKey);
  };
}

export class CreateFeedbackDto {
  @requiredRating()
  registrationRating!: number;

  @requiredRating()
  transportRating!: number;

  @requiredRating()
  checkInRating!: number;

  @requiredRating()
  discipleshipRating!: number;

  @requiredRating()
  worshipRating!: number;

  @requiredRating()
  preachingRating!: number;

  @requiredRating()
  activitiesRating!: number;

  @requiredRating()
  musicRating!: number;

  @requiredRating()
  foodRating!: number;

  @requiredRating()
  accommodationRating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
