import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(user.userId, user.role, query);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.tasksService.getStats(user.userId, user.role);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.tasksService.findOne(id, user.userId, user.role);
    if (!result) {
      throw new NotFoundException('Task not found');
    }
    return result;
  }

  @Post()
  async create(@Body() data: CreateTaskDto, @CurrentUser() user: JwtPayload) {
    return this.tasksService.create(user.userId, data);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.tasksService.update(
      id,
      user.userId,
      user.role,
      data,
    );
    if (!result) {
      throw new NotFoundException('Task not found');
    }
    return result;
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.tasksService.remove(id, user.userId, user.role);
    if (!result) {
      throw new NotFoundException('Task not found');
    }
    return result;
  }
}
