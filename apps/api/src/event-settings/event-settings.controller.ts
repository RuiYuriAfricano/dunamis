import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { EventSettingsService } from './event-settings.service';
import { UpdateEventSettingsDto } from './dto/update-event-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('settings')
export class EventSettingsController {
  constructor(private readonly eventSettingsService: EventSettingsService) {}

  @Get()
  get() {
    return this.eventSettingsService.get();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch()
  update(@Body() dto: UpdateEventSettingsDto) {
    return this.eventSettingsService.updateRegistrationDeadline(
      new Date(dto.registrationDeadline),
    );
  }
}
