import { Module } from '@nestjs/common';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { MailModule } from '../mail/mail.module';
import { EventSettingsModule } from '../event-settings/event-settings.module';

@Module({
  imports: [MailModule, EventSettingsModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}
