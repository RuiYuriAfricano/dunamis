import { Controller, Get } from '@nestjs/common';
import { TransportStopsService } from './transport-stops.service';

@Controller('transport-stops')
export class TransportStopsController {
  constructor(private readonly transportStopsService: TransportStopsService) {}

  @Get()
  findActive() {
    return this.transportStopsService.findActive();
  }
}
