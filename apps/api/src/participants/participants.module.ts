import { Module } from '@nestjs/common';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}
