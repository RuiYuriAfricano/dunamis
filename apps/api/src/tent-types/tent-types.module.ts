import { Module } from '@nestjs/common';
import { TentTypesController } from './tent-types.controller';
import { TentTypesService } from './tent-types.service';

@Module({
  controllers: [TentTypesController],
  providers: [TentTypesService],
})
export class TentTypesModule {}
