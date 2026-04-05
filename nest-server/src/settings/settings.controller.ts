import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import type { UpdateSettingsDto } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findOne(@CurrentUser() user: JwtPayload) {
    return this.settingsService.findOne(user.userId);
  }

  @Put()
  async update(
    @Body() data: UpdateSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.update(user.userId, data);
  }
}