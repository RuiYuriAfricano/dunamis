import { Controller, Get } from '@nestjs/common';
import { TentTypesService } from './tent-types.service';

@Controller('tent-types')
export class TentTypesController {
  constructor(private readonly tentTypesService: TentTypesService) {}

  @Get()
  findActive() {
    return this.tentTypesService.findActive();
  }
}
