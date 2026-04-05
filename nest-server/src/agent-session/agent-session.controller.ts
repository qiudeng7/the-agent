import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AgentSessionService } from './agent-session.service';
import { CreateSessionDto, UpdateSessionDto } from './agent-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class AgentSessionController {
  constructor(private readonly sessionService: AgentSessionService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.sessionService.findAll(user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.sessionService.findOne(id, user.userId);
    if (!result) {
      throw new NotFoundException('Session not found');
    }
    return result;
  }

  @Post()
  async create(
    @Body() data: CreateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionService.create(user.userId, data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.sessionService.update(id, user.userId, data);
    if (!result) {
      throw new NotFoundException('Session not found');
    }
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.sessionService.remove(id, user.userId);
    if (!result) {
      throw new NotFoundException('Session not found');
    }
    return result;
  }
}