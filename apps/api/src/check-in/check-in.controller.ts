import { Body, Controller, Get, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { UpdateBelongingsDto } from './dto/update-belongings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OPERATOR')
@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Get('lookup/:qrToken')
  lookup(@Param('qrToken') qrToken: string) {
    return this.checkInService.lookup(qrToken);
  }

  @Post(':qrToken')
  confirm(
    @Param('qrToken') qrToken: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checkInService.confirm(qrToken, user.id);
  }

  @Patch(':qrToken/belongings')
  updateBelongings(
    @Param('qrToken') qrToken: string,
    @Body() dto: UpdateBelongingsDto,
  ) {
    return this.checkInService.updateBelongings(qrToken, dto.belongings);
  }
}
