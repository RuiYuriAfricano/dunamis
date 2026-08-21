import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { LookupParticipantDto } from './dto/lookup-participant.dto';
import { QueryParticipantsDto } from './dto/query-participants.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UpdateBelongingsDto } from './dto/update-belongings.dto';
import { paymentProofMulterOptions } from './payment-proof-storage';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @UseInterceptors(FileInterceptor('paymentProof', paymentProofMulterOptions))
  create(
    @Body() dto: CreateParticipantDto,
    @UploadedFile() paymentProof?: Express.Multer.File,
  ) {
    return this.participantsService.create(dto, paymentProof);
  }

  @Post('lookup')
  lookup(@Body() dto: LookupParticipantDto) {
    return this.participantsService.lookup(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('export.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="dunamis-participantes.xlsx"',
  )
  async exportXlsx() {
    const buffer = await this.participantsService.exportXlsx();
    return new StreamableFile(buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: QueryParticipantsDto) {
    return this.participantsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.participantsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/payment-status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.updatePaymentStatus(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/belongings')
  updateBelongings(@Param('id') id: string, @Body() dto: UpdateBelongingsDto) {
    return this.participantsService.updateBelongings(id, dto.belongings);
  }
}
