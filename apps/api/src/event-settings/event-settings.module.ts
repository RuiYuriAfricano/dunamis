import { Module } from '@nestjs/common';
import { EventSettingsController } from './event-settings.controller';
import { EventSettingsService } from './event-settings.service';

@Module({
  controllers: [EventSettingsController],
  providers: [EventSettingsService],
  exports: [EventSettingsService],
})
export class EventSettingsModule {}
