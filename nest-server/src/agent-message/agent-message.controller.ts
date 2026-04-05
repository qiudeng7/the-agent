import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AgentMessageService } from './agent-message.service';
import { CreateMessageDto } from './agent-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class AgentMessageController {
  constructor(private readonly messageService: AgentMessageService) {}

  @Get(':sessionId')
  async findBySession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.messageService.findBySession(
      sessionId,
      user.userId,
    );
    if (!result) {
      throw new NotFoundException('Session not found');
    }
    return result;
  }

  @Post(':sessionId')
  async create(
    @Param('sessionId') sessionId: string,
    @Body() data: CreateMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.messageService.create(
      sessionId,
      user.userId,
      data,
    );
    if (!result) {
      throw new NotFoundException('Session not found');
    }
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.messageService.remove(id, user.userId);
    if (!result) {
      throw new NotFoundException('Message not found');
    }
    return result;
  }
}