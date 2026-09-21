import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toInt } from '../../participants/dto/create-participant.dto';

function optionalRating() {
  return function (target: object, propertyKey: string) {
    IsOptional()(target, propertyKey);
    Transform(toInt)(target, propertyKey);
    IsInt()(target, propertyKey);
    Min(1)(target, propertyKey);
    Max(5)(target, propertyKey);
  };
}

export class CreateFeedbackDto {
  @optionalRating()
  registrationRating?: number;

  @optionalRating()
  transportRating?: number;

  @optionalRating()
  checkInRating?: number;

  @optionalRating()
  discipleshipRating?: number;

  @optionalRating()
  worshipRating?: number;

  @optionalRating()
  preachingRating?: number;

  @optionalRating()
  activitiesRating?: number;

  @optionalRating()
  musicRating?: number;

  @optionalRating()
  foodRating?: number;

  @optionalRating()
  accommodationRating?: number;

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
