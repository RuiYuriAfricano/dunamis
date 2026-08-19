import { Module } from '@nestjs/common';
import { TransportStopsController } from './transport-stops.controller';
import { TransportStopsService } from './transport-stops.service';

@Module({
  controllers: [TransportStopsController],
  providers: [TransportStopsService],
})
export class TransportStopsModule {}
